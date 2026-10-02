import "server-only";
import { createAdminClient } from "./supabase/admin";
import { verifyTransaction } from "./paystack";
import { sendOrderEmail } from "./mailgun";

/** Loads an order with items in the shape the email template needs. */
export async function loadOrderForEmail(orderId: string) {
  const admin = createAdminClient();
  const { data: o } = await admin
    .from("orders")
    .select("*, order_items(name, quantity, unit_price_kobo)")
    .eq("id", orderId)
    .single();
  if (!o) return null;
  return {
    reference: o.reference as string,
    name: o.customer_name as string,
    email: o.customer_email as string,
    address: o.shipping_address as string,
    city: o.city as string,
    state: o.state as string,
    totalKobo: Number(o.total_kobo),
    paymentMethod: o.payment_method as "pay_on_delivery" | "bank_transfer" | "paystack",
    paid: o.payment_status === "paid",
    items: (o.order_items as { name: string; quantity: number; unit_price_kobo: number }[]).map((i) => ({
      ...i,
      unit_price_kobo: Number(i.unit_price_kobo),
    })),
  };
}

export async function emailOrder(orderId: string) {
  const email = await loadOrderForEmail(orderId);
  if (email && (await sendOrderEmail(email))) {
    await createAdminClient().from("orders").update({ email_sent_at: new Date().toISOString() }).eq("id", orderId);
  }
}

/**
 * Verifies a Paystack transaction server-to-server and, if it succeeded for the exact order total,
 * marks the order paid. Safe to call repeatedly and from several places (order page, webhook):
 * only the call that flips unpaid -> paid sends the confirmation email.
 */
export async function settlePaystackPayment(paystackReference: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, total_kobo, payment_status, payment_method")
    .eq("paystack_reference", paystackReference)
    .maybeSingle();
  if (!order || order.payment_method !== "paystack") return false;
  if (order.payment_status === "paid") return true;

  const v = await verifyTransaction(paystackReference);
  if (!v || v.status !== "success") return false;
  const paidKobo = Number(v.requested_amount ?? v.amount);
  if (v.currency !== "NGN" || paidKobo !== Number(order.total_kobo)) {
    console.error("[paystack] amount/currency mismatch", paystackReference, paidKobo, v.currency, order.total_kobo);
    return false;
  }

  const { data: flipped } = await admin
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed", paid_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("payment_status", "unpaid")
    .select("id");
  if (flipped?.length) await emailOrder(order.id);
  return true;
}
