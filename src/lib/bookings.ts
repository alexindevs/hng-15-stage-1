import "server-only";
import { createAdminClient } from "./supabase/admin";
import { adminConfigured } from "./supabase/env";
import { verifyTransaction } from "./paystack";
import { emailEsc as esc, emailShell, EMAIL_COLORS as C, EMAIL_SANS as SANS, sendMail } from "./mailgun";
import { formatNaira, SHOP_NAME, siteUrl } from "./format";
import { formatSlot, HORIZON_DAYS, slotKey } from "./booking";
import { CONTACT, FEE_POLICY } from "./site";

/** slotKey -> number of active (pending/confirmed) bookings, for the booking page. */
export async function loadBookedCounts(): Promise<Record<string, number>> {
  if (!adminConfigured()) return {};
  const from = new Date().toISOString();
  const to = new Date(Date.now() + (HORIZON_DAYS + 1) * 86_400_000).toISOString();
  const { data } = await createAdminClient()
    .from("bookings")
    .select("slot_start")
    .in("status", ["pending", "confirmed"])
    .gte("slot_start", from)
    .lte("slot_start", to);
  const counts: Record<string, number> = {};
  for (const r of data ?? []) counts[slotKey(r.slot_start)] = (counts[slotKey(r.slot_start)] ?? 0) + 1;
  return counts;
}

type BookingRow = {
  id: string; reference: string; product_name: string; customer_name: string; customer_email: string;
  customer_phone: string; slot_start: string; notes: string | null; status: string;
  fee_kobo: number; fee_option: string; fee_status: string;
};

function renderBookingEmail(b: BookingRow) {
  const slot = formatSlot(b.slot_start);
  const feeLine =
    b.fee_kobo <= 0 ? "No inspection fee."
    : b.fee_status === "paid" ? `Inspection fee of ${formatNaira(b.fee_kobo)} received. Thank you.`
    : `Inspection fee of ${formatNaira(b.fee_kobo)} is payable at the viewing.`;
  const policy = b.fee_kobo > 0 ? ` ${FEE_POLICY}` : "";
  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid ${C.line};font:13px ${SANS};color:${C.mute}">${k}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${C.line};font:15px ${SANS};color:${C.bone}">${esc(v)}</td></tr>`;
  const html = emailShell({
    preheader: `Viewing request ${b.reference} received for ${slot}.`,
    heading: `Viewing requested, ${esc(b.customer_name.split(" ")[0])}.`,
    bodyHtml: `<p style="margin:0 0 16px;font:15px/1.6 ${SANS};color:${C.bone}">We have received your request and are holding the slot while we confirm it. You will hear from us shortly. Until then, your booking is <strong style="color:${C.gold}">pending approval</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row("Reference", b.reference)}${row("Vehicle", b.product_name)}${row("Date and time", `${slot} (Lagos time)`)}${row("Status", "Pending approval")}
</table>
<p style="margin:16px 0 0;font:14px/1.6 ${SANS};color:${C.bone}">${esc(feeLine + policy)}</p>`,
    ctaLabel: "View booking",
    ctaUrl: `${siteUrl()}/booking/${encodeURIComponent(b.reference)}`,
  });
  const text =
    `${SHOP_NAME}\n\nViewing requested. Reference ${b.reference}\nVehicle: ${b.product_name}\nWhen: ${slot} (Lagos time)\n` +
    `Status: pending approval\n${feeLine}${policy}\n\n${siteUrl()}/booking/${b.reference}\n`;
  return { html, text, slot };
}

export async function emailBooking(bookingId: string) {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("*").eq("id", bookingId).single();
  if (!b) return;
  const { html, text, slot } = renderBookingEmail(b as BookingRow);
  const ok = await sendMail({
    to: b.customer_email,
    subject: `Viewing request ${b.reference}: ${b.product_name}, ${slot} | ${SHOP_NAME}`,
    html, text, bcc: process.env.SHOP_OWNER_EMAIL,
  });
  if (ok) await admin.from("bookings").update({ email_sent_at: new Date().toISOString() }).eq("id", bookingId);
}

/**
 * Verifies the inspection-fee payment with Paystack and, if it is a success for exactly the booking's
 * fee, marks it paid. Idempotent; only the call that flips unpaid -> paid sends the email.
 */
export async function settleBookingPayment(paystackReference: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, fee_kobo, fee_status, fee_option")
    .eq("paystack_reference", paystackReference)
    .maybeSingle();
  if (!b || b.fee_option !== "pay_now") return false;
  if (b.fee_status === "paid") return true;
  const v = await verifyTransaction(paystackReference);
  if (!v || v.status !== "success") return false;
  if (v.currency !== "NGN" || Number(v.requested_amount ?? v.amount) !== Number(b.fee_kobo)) {
    console.error("[paystack] booking amount/currency mismatch", paystackReference, v.amount, v.currency, b.fee_kobo);
    return false;
  }
  const { data: flipped } = await admin
    .from("bookings")
    .update({ fee_status: "paid", paid_at: new Date().toISOString() })
    .eq("id", b.id)
    .eq("fee_status", "unpaid")
    .select("id");
  if (flipped?.length) await emailBooking(b.id);
  return true;
}

const NOTIFY_STATUSES = ["confirmed", "declined", "cancelled"] as const;

function renderStatusEmail(b: BookingRow & { status: (typeof NOTIFY_STATUSES)[number] }) {
  const slot = formatSlot(b.slot_start);
  const first = esc(b.customer_name.split(" ")[0]);
  const p = (t: string) => `<p style="margin:0 0 14px;font:15px/1.6 ${SANS};color:${C.bone}">${t}</p>`;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid ${C.line};font:13px ${SANS};color:${C.mute}">${k}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${C.line};font:15px ${SANS};color:${C.bone}">${esc(v)}</td></tr>`;
  const details = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("Reference", b.reference)}${row("Vehicle", b.product_name)}${row("Date and time", `${slot} (Lagos time)`)}</table>`;
  const feeDue = b.fee_kobo > 0 && b.fee_status === "unpaid";

  if (b.status === "confirmed") {
    const feeNote = feeDue ? p(`Please bring the ${formatNaira(b.fee_kobo)} inspection fee to pay at the viewing. ${esc(FEE_POLICY)}`) : "";
    return {
      subject: `Viewing confirmed: ${b.product_name}, ${slot} | ${SHOP_NAME}`,
      html: emailShell({
        preheader: `Your viewing on ${slot} is confirmed.`,
        heading: `You are booked in, ${first}.`,
        bodyHtml: p("Your viewing is <strong style=\"color:" + C.gold + "\">confirmed</strong>. We will have the vehicle ready for you.") + details + `<div style="height:14px"></div>` + p(`<strong>Where:</strong> ${esc(CONTACT.address)}`) + feeNote + p("Need to change the time? Reply to this email or call " + esc(CONTACT.phone) + "."),
        ctaLabel: "View booking",
        ctaUrl: `${siteUrl()}/booking/${encodeURIComponent(b.reference)}`,
      }),
      text: `${SHOP_NAME}\n\nViewing confirmed. Reference ${b.reference}\nVehicle: ${b.product_name}\nWhen: ${slot} (Lagos time)\nWhere: ${CONTACT.address}\n` +
        (feeDue ? `Bring the ${formatNaira(b.fee_kobo)} inspection fee. ${FEE_POLICY}\n` : "") + `Need to change the time? Reply to this email or call ${CONTACT.phone}.\n${siteUrl()}/booking/${b.reference}\n`,
    };
  }
  if (b.status === "declined") {
    return {
      subject: `Viewing request ${b.reference}: we could not confirm that time | ${SHOP_NAME}`,
      html: emailShell({
        preheader: `We could not confirm your viewing on ${slot}.`,
        heading: `Sorry, ${first}.`,
        bodyHtml: p("We could not confirm the viewing you asked for. You are welcome to pick another time.") + details + `<div style="height:14px"></div>` + (b.fee_status === "paid" ? p("Questions about your payment? Just reply to this email.") : ""),
        ctaLabel: "Book another time",
        ctaUrl: `${siteUrl()}/book`,
      }),
      text: `${SHOP_NAME}\n\nSorry, we could not confirm your viewing (${b.reference}) for ${b.product_name} on ${slot}.\nBook another time: ${siteUrl()}/book\n` +
        (b.fee_status === "paid" ? "Questions about your payment? Just reply to this email.\n" : ""),
    };
  }
  return {
    subject: `Viewing ${b.reference} cancelled | ${SHOP_NAME}`,
    html: emailShell({
      preheader: `Your viewing on ${slot} has been cancelled.`,
      heading: `Viewing cancelled.`,
      bodyHtml: p("This viewing has been cancelled. You can book another time whenever you like.") + details,
      ctaLabel: "Book again",
      ctaUrl: `${siteUrl()}/book`,
    }),
    text: `${SHOP_NAME}\n\nViewing ${b.reference} (${b.product_name}, ${slot}) has been cancelled.\nBook again: ${siteUrl()}/book\n`,
  };
}

/**
 * Emails the customer about a status change (confirmed / declined / cancelled). Called by the Supabase
 * Database Webhook on bookings updates. Safe to call repeatedly: `status_notified` records the last
 * status that was emailed, so the same status is never sent twice (and a failed send is retried).
 */
export async function notifyBookingStatus(bookingId: string): Promise<"sent" | "skipped" | "failed"> {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return "skipped";
  const status = b.status as string;
  if (!(NOTIFY_STATUSES as readonly string[]).includes(status)) return "skipped";
  if (b.status_notified === status) return "skipped";
  const mail = renderStatusEmail({ ...(b as BookingRow), status: status as (typeof NOTIFY_STATUSES)[number] });
  const ok = await sendMail({ to: b.customer_email, bcc: process.env.SHOP_OWNER_EMAIL, ...mail });
  if (!ok) return "failed";
  await admin.from("bookings").update({ status_notified: status }).eq("id", b.id);
  return "sent";
}
