"use server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, supabaseConfigured } from "@/lib/supabase/env";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { emailBooking } from "@/lib/bookings";
import { isValidSlot } from "@/lib/booking";
import { inspectionFeeKobo, slotCapacity } from "@/lib/site";
import { siteUrl } from "@/lib/format";

const schema = z.object({
  slug: z.string().min(1, "Choose a vehicle"),
  slot: z.string().min(1, "Choose a date and time"),
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a phone number"),
  notes: z.string().trim().max(500).optional(),
  feeOption: z.enum(["pay_now", "bank_transfer", "at_viewing"]),
});

export type BookingResult =
  | { ok: true; reference: string; redirectUrl?: string }
  | { ok: false; error: string };

const ref = () =>
  `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

async function startFeePayment(bookingId: string, reference: string, email: string, feeKobo: number, attempt: number) {
  const paystackRef = attempt === 0 ? reference : `${reference}-R${attempt}-${Date.now().toString(36)}`;
  const init = await initializeTransaction({
    email,
    amountKobo: feeKobo,
    reference: paystackRef,
    callbackUrl: `${siteUrl()}/booking/${reference}`,
    metadata: { booking_reference: reference, purpose: "inspection_fee" },
  });
  if ("error" in init) return init;
  await createAdminClient().from("bookings").update({ paystack_reference: paystackRef }).eq("id", bookingId);
  return init;
}

export async function createBooking(input: z.input<typeof schema>): Promise<BookingResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!adminConfigured()) {
    return { ok: false, error: "Bookings are not connected yet (Supabase credentials missing)." };
  }
  const d = parsed.data;
  if (!isValidSlot(d.slot)) return { ok: false, error: "That time is no longer available. Please pick another slot." };
  const fee = inspectionFeeKobo();
  if (d.feeOption === "pay_now" && fee > 0 && !paystackConfigured()) {
    return { ok: false, error: "Online payment is not available right now. Choose to pay at the viewing." };
  }

  const admin = createAdminClient();
  const { data: product } = await admin.from("products").select("id, stock").eq("slug", d.slug).eq("active", true).maybeSingle();
  if (!product) return { ok: false, error: "That vehicle is no longer available." };

  let userId: string | null = null;
  if (supabaseConfigured()) userId = (await (await createClient()).auth.getUser()).data.user?.id ?? null;

  const reference = ref();
  const payNow = d.feeOption === "pay_now" && fee > 0;
  const { data: bookingId, error } = await admin.rpc("place_booking", {
    p_user_id: userId, p_product_id: product.id, p_name: d.name, p_email: d.email, p_phone: d.phone,
    p_slot: new Date(d.slot).toISOString(), p_notes: d.notes ?? null, p_reference: reference,
    p_fee_kobo: fee, p_capacity: slotCapacity(),
    p_fee_option: fee <= 0 ? "at_viewing" : d.feeOption,
  });
  if (error) {
    if (error.message.includes("SLOT_FULL")) return { ok: false, error: "Sorry, that slot has just been taken. Please pick another time." };
    console.error("[place_booking]", error);
    return { ok: false, error: "We could not save your booking. Please try again." };
  }

  if (payNow) {
    const init = await startFeePayment(bookingId, reference, d.email, fee, 0);
    if ("error" in init) {
      // The slot stays held; the customer can pay from the booking page.
      return { ok: true, reference };
    }
    return { ok: true, reference, redirectUrl: init.authorizationUrl };
  }
  await emailBooking(bookingId);
  return { ok: true, reference };
}

/** "Pay now" on a booking whose inspection fee is still unpaid. */
export async function retryBookingPayment(reference: string): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  if (!adminConfigured() || !paystackConfigured()) return { ok: false, error: "Online payment is not available right now." };
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings").select("id, customer_email, fee_kobo, fee_status, status")
    .eq("reference", reference).maybeSingle();
  if (!b || b.fee_status !== "unpaid" || b.fee_kobo <= 0 || !["pending", "confirmed"].includes(b.status))
    return { ok: false, error: "This booking has nothing to pay online." };
  await admin.from("bookings").update({ fee_option: "pay_now" }).eq("id", b.id);
  const init = await startFeePayment(b.id, reference, b.customer_email, Number(b.fee_kobo), 1);
  if ("error" in init) return { ok: false, error: "We could not start the payment. Please try again." };
  return { ok: true, redirectUrl: init.authorizationUrl };
}
