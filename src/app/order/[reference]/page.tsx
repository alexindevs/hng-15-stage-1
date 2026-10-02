import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConfigured } from "@/lib/supabase/env";
import { settlePaystackPayment } from "@/lib/payments";
import { formatNaira } from "@/lib/format";
import { PayNowButton } from "@/components/PayNowButton";

export const metadata = { title: "Your order" };
export const dynamic = "force-dynamic";

const load = (reference: string) =>
  createAdminClient()
    .from("orders")
    .select("*, order_items(name, quantity, unit_price_kobo)")
    .eq("reference", reference)
    .maybeSingle();

// The reference acts as the access token, so guests (no login) can view their order after checkout.
export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!adminConfigured()) return <p className="py-20 text-center text-mute">Order not found.</p>;
  let { data: order } = await load(reference);
  if (!order) return <p className="py-20 text-center text-mute">Order not found.</p>;

  // Returning from Paystack: confirm the payment server-side before showing a status.
  if (order.payment_method === "paystack" && order.payment_status === "unpaid" && order.paystack_reference) {
    if (await settlePaystackPayment(order.paystack_reference)) order = (await load(reference)).data ?? order;
  }

  const paid = order.payment_status === "paid";
  const awaitingCard = order.payment_method === "paystack" && !paid && order.status === "pending";
  return (
    <div className="mx-auto max-w-xl border border-gold p-8 text-center">
      <h1 className="font-display gold-text text-4xl">
        {awaitingCard ? "Payment pending" : `Thank you, ${order.customer_name.split(" ")[0]}!`}
      </h1>
      <p className="mt-3 text-mute">
        Order <strong className="text-gold">{order.reference}</strong>{" "}
        {awaitingCard ? "is waiting for payment." : order.status === "cancelled" ? "was cancelled." : paid ? "is paid and confirmed." : "has been received."}
        {order.email_sent_at ? ` A confirmation email has been sent to ${order.customer_email}.` : ""}
      </p>
      <ul className="mt-6 space-y-2 text-left text-sm">
        {order.order_items.map((i: { name: string; quantity: number; unit_price_kobo: number }, n: number) => (
          <li key={n} className="flex justify-between"><span>{i.name} × {i.quantity}</span><span>{formatNaira(i.unit_price_kobo * i.quantity)}</span></li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between border-t border-line pt-4"><span>Total</span><span className="text-gold">{formatNaira(order.total_kobo)}</span></p>
      {awaitingCard && <PayNowButton reference={order.reference} />}
      <div className="mt-6"><Link href="/shop" className="btn-ghost">Continue shopping</Link></div>
    </div>
  );
}
