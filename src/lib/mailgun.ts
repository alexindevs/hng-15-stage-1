import "server-only";
import { formatNaira, SHOP_NAME, siteUrl } from "./format";

export type PaymentMethod = "pay_on_delivery" | "bank_transfer" | "paystack";

export type OrderEmail = {
  reference: string;
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  totalKobo: number;
  paymentMethod: PaymentMethod;
  paid: boolean;
  items: { name: string; quantity: number; unit_price_kobo: number }[];
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const mailgunConfigured = () => Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);

// Brand palette (mirrors globals.css). Emails need inline styles + bgcolor attributes so Gmail/Outlook
// dark-mode inversion keeps the black and gold look.
const C = { ink: "#0a0a0a", panel: "#141414", line: "#2c2a24", gold: "#d4af37", goldSoft: "#f0d77a", bone: "#f5efdc", mute: "#a39d8a" };
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Helvetica,Arial,sans-serif";

function paymentBlock(o: OrderEmail): { title: string; lines: string[] } {
  if (o.paymentMethod === "paystack")
    return { title: "Payment received", lines: ["Paid securely online via Paystack. No further payment is needed."] };
  if (o.paymentMethod === "bank_transfer") {
    const bank = [
      process.env.BANK_NAME && `Bank: ${process.env.BANK_NAME}`,
      process.env.BANK_ACCOUNT_NAME && `Account name: ${process.env.BANK_ACCOUNT_NAME}`,
      process.env.BANK_ACCOUNT_NUMBER && `Account number: ${process.env.BANK_ACCOUNT_NUMBER}`,
    ].filter(Boolean) as string[];
    return {
      title: "Pay by bank transfer",
      lines: [...(bank.length ? bank : ["We will send you our account details shortly."]), `Use ${o.reference} as the payment reference, then reply to this email with your receipt.`],
    };
  }
  return { title: "Pay on delivery", lines: ["No payment is due now. You will pay when you inspect and collect your purchase."] };
}

function render(o: OrderEmail) {
  const pay = paymentBlock(o);
  const rows = o.items
    .map(
      (i) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${C.line};font:15px ${SANS};color:${C.bone}">${esc(i.name)}<br><span style="color:${C.mute};font-size:13px">Qty ${i.quantity} × ${formatNaira(i.unit_price_kobo)}</span></td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font:15px ${SANS};color:${C.bone};white-space:nowrap">${formatNaira(i.unit_price_kobo * i.quantity)}</td></tr>`,
    )
    .join("");
  const payLines = pay.lines.map((l) => esc(l)).join("<br>");
  const preheader = `Order ${o.reference} received. Total ${formatNaira(o.totalKobo)}.`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>${SHOP_NAME}</title></head>
<body style="margin:0;padding:0;background:${C.ink}" bgcolor="${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.ink}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.ink}" style="background:${C.ink}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border:1px solid ${C.gold}" bgcolor="${C.panel}">
<tr><td height="6" bgcolor="${C.gold}" style="background:${C.gold};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td align="center" bgcolor="${C.ink}" style="padding:36px 24px 28px;border-bottom:1px solid ${C.line}">
  <div style="font:700 28px ${SERIF};letter-spacing:6px;color:${C.gold}">EGO OLISA</div>
  <div style="font:12px ${SANS};letter-spacing:8px;color:${C.goldSoft};margin-top:6px">ENTERPRISES</div>
  <div style="font:11px ${SANS};letter-spacing:3px;color:${C.mute};margin-top:14px">CARS &nbsp;·&nbsp; SUVS &nbsp;·&nbsp; MOTORCYCLES</div>
</td></tr>
<tr><td style="padding:32px 32px 8px" bgcolor="${C.panel}">
  <h1 style="margin:0 0 12px;font:400 26px ${SERIF};color:${C.gold}">Thank you, ${esc(o.name.split(" ")[0])}.</h1>
  <p style="margin:0;font:15px/1.6 ${SANS};color:${C.bone}">Your order has been received. Our team will contact you to arrange inspection, documentation and delivery or collection.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr><td style="border:1px solid ${C.gold};padding:8px 16px;font:13px ${SANS};letter-spacing:2px;color:${C.gold}">ORDER &nbsp;<strong>${esc(o.reference)}</strong></td></tr></table>
</td></tr>
<tr><td style="padding:0 32px" bgcolor="${C.panel}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td colspan="2" style="padding-bottom:8px;border-bottom:2px solid ${C.gold};font:11px ${SANS};letter-spacing:3px;color:${C.gold}">YOUR ORDER</td></tr>
  ${rows}
  <tr><td style="padding-top:18px;font:15px ${SANS};color:${C.mute}">Total</td>
  <td align="right" style="padding-top:18px;font:700 24px ${SERIF};color:${C.gold}">${formatNaira(o.totalKobo)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:28px 32px 0" bgcolor="${C.panel}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.ink}" style="background:${C.ink}"><tr>
  <td width="4" bgcolor="${C.gold}" style="background:${C.gold}">&nbsp;</td>
  <td style="padding:16px 18px"><div style="font:11px ${SANS};letter-spacing:3px;color:${C.gold};margin-bottom:8px">${esc(pay.title.toUpperCase())}</div>
  <div style="font:14px/1.7 ${SANS};color:${C.bone}">${payLines}</div></td></tr></table>
</td></tr>
<tr><td style="padding:20px 32px 0" bgcolor="${C.panel}">
  <div style="font:11px ${SANS};letter-spacing:3px;color:${C.gold};margin-bottom:6px">DELIVERY / CONTACT ADDRESS</div>
  <div style="font:14px/1.6 ${SANS};color:${C.bone}">${esc(o.address)}<br>${esc(o.city)}, ${esc(o.state)}</div>
</td></tr>
<tr><td align="center" style="padding:32px" bgcolor="${C.panel}">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.gold}" style="background:${C.gold};border-radius:3px">
  <a href="${siteUrl()}/order/${encodeURIComponent(o.reference)}" style="display:inline-block;padding:14px 30px;font:700 14px ${SANS};letter-spacing:2px;color:${C.ink};text-decoration:none">VIEW YOUR ORDER</a>
  </td></tr></table>
</td></tr>
<tr><td align="center" bgcolor="${C.ink}" style="padding:22px 24px;border-top:1px solid ${C.line};font:12px/1.6 ${SANS};color:${C.mute}">
  ${SHOP_NAME} · Lagos, Nigeria<br>Questions? Just reply to this email.
</td></tr>
</table></td></tr></table></body></html>`;

  const text =
    `${SHOP_NAME}\n\nThank you, ${o.name.split(" ")[0]}. Your order ${o.reference} has been received.\n\n` +
    o.items.map((i) => `${i.name}  x${i.quantity}  ${formatNaira(i.unit_price_kobo * i.quantity)}`).join("\n") +
    `\n\nTotal: ${formatNaira(o.totalKobo)}\n\n${pay.title}\n${pay.lines.join("\n")}\n\n` +
    `Address: ${o.address}, ${o.city}, ${o.state}\n${siteUrl()}/order/${o.reference}\n`;
  return { html, text };
}

/** Sends the order email through the Mailgun HTTP API. Returns true on success. */
export async function sendOrderEmail(o: OrderEmail): Promise<boolean> {
  if (!mailgunConfigured()) {
    console.warn("[mailgun] MAILGUN_API_KEY / MAILGUN_DOMAIN not set; skipping email for", o.reference);
    return false;
  }
  const { html, text } = render(o);
  const form = new URLSearchParams({
    from: process.env.MAILGUN_FROM ?? `${SHOP_NAME} <orders@${process.env.MAILGUN_DOMAIN}>`,
    to: o.email,
    subject: `Order ${o.paid ? "confirmed & paid" : "received"}: ${o.reference} | ${SHOP_NAME}`,
    html,
    text,
  });
  if (process.env.SHOP_OWNER_EMAIL) form.append("bcc", process.env.SHOP_OWNER_EMAIL);

  const base = process.env.MAILGUN_API_BASE ?? "https://api.mailgun.net";
  try {
    const res = await fetch(`${base}/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64") },
      body: form,
    });
    if (!res.ok) console.error("[mailgun] send failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[mailgun] network error", e);
    return false;
  }
}

export const renderOrderEmailForPreview = render;
