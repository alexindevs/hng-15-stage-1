import { NextResponse } from "next/server";
import { settleBookingPayment } from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConfigured } from "@/lib/supabase/env";
import { bankDetails, CONTACT, FEE_POLICY } from "@/lib/site";
import { paystackConfigured } from "@/lib/paystack";

const load = (reference: string) =>
  createAdminClient()
    .from("bookings")
    .select("reference,product_name,customer_name,customer_email,slot_start,status,fee_kobo,fee_option,fee_status,email_sent_at,paystack_reference,created_at")
    .eq("reference", reference)
    .maybeSingle();

// GET /api/bookings/:reference. The reference is the access token, as on the website's booking page.
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!adminConfigured()) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  let { data: b } = await load(reference);
  if (!b) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (b.fee_option === "pay_now" && b.fee_status === "unpaid" && b.paystack_reference) {
    if (await settleBookingPayment(b.paystack_reference)) b = (await load(reference)).data ?? b;
  }
  const { paystack_reference: _p, ...booking } = b;
  const feeDue = b.fee_kobo > 0 && b.fee_status === "unpaid" && ["pending", "confirmed"].includes(b.status);
  return NextResponse.json({
    booking,
    address: CONTACT.address,
    fee_policy: FEE_POLICY,
    can_pay_online: feeDue && paystackConfigured(),
    bank: feeDue && b.fee_option === "bank_transfer" ? bankDetails() : null,
  });
}
