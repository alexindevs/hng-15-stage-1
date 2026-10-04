import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConfigured } from "@/lib/supabase/env";
import { settleBookingPayment } from "@/lib/bookings";
import { formatSlot } from "@/lib/booking";
import { formatNaira } from "@/lib/format";
import { bankDetails, CONTACT, FEE_POLICY } from "@/lib/site";
import { paystackConfigured } from "@/lib/paystack";
import { PayBookingButton } from "@/components/PayBookingButton";

export const metadata = { title: "Your viewing" };
export const dynamic = "force-dynamic";

const load = (reference: string) => createAdminClient().from("bookings").select("*").eq("reference", reference).maybeSingle();

const STATUS: Record<string, { label: string; tone: string; note: string }> = {
  pending: { label: "Pending approval", tone: "border-gold/60 text-gold", note: "We are holding your slot while we confirm it. You will get an email as soon as it is approved." },
  confirmed: { label: "Confirmed", tone: "border-emerald-500/60 text-emerald-400", note: "Your viewing is confirmed. See you then." },
  declined: { label: "Declined", tone: "border-red-500/60 text-red-400", note: "We could not confirm this slot. Please book another time." },
  cancelled: { label: "Cancelled", tone: "border-line text-mute", note: "This booking was cancelled." },
  completed: { label: "Completed", tone: "border-line text-mute", note: "This viewing has taken place." },
};

// The reference acts as the access token, so guests (no login) can see their booking after submitting.
export default async function BookingPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!adminConfigured()) return <p className="py-20 text-center text-mute">Booking not found.</p>;
  let { data: b } = await load(reference);
  if (!b) return <p className="py-20 text-center text-mute">Booking not found.</p>;

  // Returning from Paystack: confirm the fee payment server-side before showing a status.
  if (b.fee_option === "pay_now" && b.fee_status === "unpaid" && b.paystack_reference) {
    if (await settleBookingPayment(b.paystack_reference)) b = (await load(reference)).data ?? b;
  }

  const s = STATUS[b.status] ?? STATUS.pending;
  const feeDue = b.fee_kobo > 0 && b.fee_status === "unpaid" && ["pending", "confirmed"].includes(b.status);
  const canPayOnline = feeDue && paystackConfigured(); // also lets bank-transfer / pay-later customers switch to paying online
  const awaitingTransfer = feeDue && b.fee_option === "bank_transfer";
  const bank = bankDetails();
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-line bg-panel p-8 sm:p-10">
      <p className="eyebrow">Viewing request</p>
      <h1 className="font-display mt-2 text-4xl">Thanks, {b.customer_name.split(" ")[0]}.</h1>
      <span className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs uppercase tracking-widest ${s.tone}`}>{s.label}</span>
      <p className="mt-4 text-mute">{s.note}{b.email_sent_at ? ` A confirmation was emailed to ${b.customer_email}.` : ""}</p>

      <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
        {([
          ["Reference", b.reference],
          ["Vehicle", b.product_name],
          ["When", `${formatSlot(b.slot_start)} (Lagos time)`],
          ["Where", CONTACT.address],
          ["Inspection fee", b.fee_kobo > 0 ? `${formatNaira(b.fee_kobo)} · ${b.fee_status === "paid" ? "paid" : b.fee_option === "pay_now" ? "awaiting payment" : b.fee_option === "bank_transfer" ? "awaiting bank transfer" : "payable at viewing"}` : "None"],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 py-3"><dt className="text-mute">{k}</dt><dd className="text-right">{v}</dd></div>
        ))}
      </dl>

      {awaitingTransfer && (
        <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/5 p-5 text-sm">
          <p className="eyebrow !text-gold">Pay by bank transfer</p>
          {bank ? (
            <dl className="mt-3 space-y-1.5">
              {([["Bank", bank.bank], ["Account name", bank.name], ["Account number", bank.number], ["Amount", formatNaira(b.fee_kobo)], ["Payment reference", b.reference]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-mute">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-mute">We will send you our account details shortly. Use {b.reference} as the payment reference.</p>
          )}
        </div>
      )}

      {b.fee_kobo > 0 && <p className="mt-4 text-xs text-mute">{FEE_POLICY}</p>}

      <div className="mt-8 flex flex-wrap gap-3">
        {canPayOnline && <PayBookingButton reference={b.reference} label={`Pay ${formatNaira(b.fee_kobo)} online`} />}
        <Link href="/shop" className="btn-ghost">Keep browsing</Link>
      </div>
    </div>
  );
}
