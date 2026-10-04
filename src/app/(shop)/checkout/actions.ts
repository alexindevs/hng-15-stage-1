"use server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, supabaseConfigured } from "@/lib/supabase/env";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { emailOrder } from "@/lib/payments";
import { siteUrl } from "@/lib/format";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a phone number"),
  address: z.string().trim().min(5, "Enter your address"),
  city: z.string().trim().min(2, "Enter your city"),
  state: z.string().trim().min(2, "Enter your state"),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["pay_on_delivery", "bank_transfer", "paystack"]),
  items: z.array(z.object({ slug: z.string(), quantity: z.number().int().min(1).max(99) })).min(1, "Your cart is empty"),
});

export type CheckoutResult =
  | { ok: true; reference: string; redirectUrl?: string }
  | { ok: false; error: string };

const ref = () =>
  `EO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

/** Starts a (new) Paystack attempt for an existing unpaid order. */
async function startPaystack(orderId: string, reference: string, email: string, totalKobo: number, attempt: number) {
  const paystackRef = attempt === 0 ? reference : `${reference}-R${attempt}-${Date.now().toString(36)}`;
  const init = await initializeTransaction({
    email,
    amountKobo: totalKobo,
    reference: paystackRef,
    callbackUrl: `${siteUrl()}/order/${reference}`,
    metadata: { order_reference: reference },
  });
  if ("error" in init) return init;
  await createAdminClient().from("orders").update({ paystack_reference: paystackRef }).eq("id", orderId);
  return init;
}

export async function placeOrder(input: z.input<typeof schema>): Promise<CheckoutResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!adminConfigured()) {
    return { ok: false, error: "The store database is not connected yet (Supabase credentials missing)." };
  }
  const d = parsed.data;
  if (d.paymentMethod === "paystack" && !paystackConfigured()) {
    return { ok: false, error: "Card payment is not available right now. Please choose another payment method." };
  }
  const admin = createAdminClient();

  // Prices always come from the database, never from the browser.
  const { data: products, error: pErr } = await admin
    .from("products").select("id, slug, name").in("slug", d.items.map((i) => i.slug));
  if (pErr) return { ok: false, error: "Could not load products. Please try again." };
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const missing = d.items.find((i) => !bySlug.has(i.slug));
  if (missing) return { ok: false, error: `"${missing.slug}" is no longer available. Please update your cart.` };

  let userId: string | null = null;
  if (supabaseConfigured()) userId = (await (await createClient()).auth.getUser()).data.user?.id ?? null;

  const reference = ref();
  const { data: orderId, error } = await admin.rpc("place_order", {
    p_user_id: userId, p_name: d.name, p_email: d.email, p_phone: d.phone, p_address: d.address,
    p_city: d.city, p_state: d.state, p_notes: d.notes ?? null, p_reference: reference,
    p_payment_method: d.paymentMethod,
    p_items: d.items.map((i) => ({ product_id: bySlug.get(i.slug)!.id, quantity: i.quantity })),
  });
  if (error) {
    const stock = error.message.match(/OUT_OF_STOCK:(.*)/);
    if (stock) return { ok: false, error: `Sorry, "${stock[1]}" does not have enough stock.` };
    console.error("[place_order]", error);
    return { ok: false, error: "We could not place your order. Please try again." };
  }

  if (d.paymentMethod === "paystack") {
    const { data: order } = await admin.from("orders").select("total_kobo").eq("id", orderId).single();
    const init = await startPaystack(orderId, reference, d.email, Number(order?.total_kobo ?? 0), 0);
    if ("error" in init) {
      await admin.rpc("cancel_order", { p_order_id: orderId }); // releases the reserved stock
      return { ok: false, error: "We could not start the card payment. Please try again or pick another method." };
    }
    // The confirmation email is sent once Paystack confirms payment (see lib/payments.ts).
    return { ok: true, reference, redirectUrl: init.authorizationUrl };
  }

  await emailOrder(orderId);
  return { ok: true, reference };
}

/** "Pay now" on an order whose card payment was abandoned. */
export async function retryPaystackPayment(reference: string): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  if (!adminConfigured() || !paystackConfigured()) return { ok: false, error: "Card payment is not available right now." };
  const admin = createAdminClient();
  const { data: o } = await admin
    .from("orders").select("id, customer_email, total_kobo, payment_status, status, payment_method")
    .eq("reference", reference).maybeSingle();
  if (!o || o.payment_method !== "paystack" || o.payment_status !== "unpaid" || o.status !== "pending")
    return { ok: false, error: "This order cannot be paid online." };
  const init = await startPaystack(o.id, reference, o.customer_email, Number(o.total_kobo), 1);
  if ("error" in init) return { ok: false, error: "We could not start the payment. Please try again." };
  return { ok: true, redirectUrl: init.authorizationUrl };
}
