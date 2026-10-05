import { NextResponse } from "next/server";
import { settlePaystackPayment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConfigured } from "@/lib/supabase/env";
import { bankDetails } from "@/lib/site";

const load = (reference: string) =>
  createAdminClient()
    .from("orders")
    .select("reference,status,payment_status,payment_method,total_kobo,customer_name,customer_email,shipping_address,city,state,created_at,email_sent_at,paystack_reference,order_items(name,quantity,unit_price_kobo)")
    .eq("reference", reference)
    .maybeSingle();

// GET /api/orders/:reference. Like the website's order page, the reference acts as the access token (guests can look
// up their order). When returning from Paystack this verifies the payment server-side first.
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!adminConfigured()) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  let { data: o } = await load(reference);
  if (!o) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (o.payment_method === "paystack" && o.payment_status === "unpaid" && o.paystack_reference) {
    if (await settlePaystackPayment(o.paystack_reference)) o = (await load(reference)).data ?? o;
  }
  const { paystack_reference: _p, ...order } = o;
  return NextResponse.json({
    order,
    awaiting_card: o.payment_method === "paystack" && o.payment_status !== "paid" && o.status === "pending",
    bank: o.payment_method === "bank_transfer" ? bankDetails() : null,
  });
}
