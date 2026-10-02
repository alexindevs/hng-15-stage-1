import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Paystack REST API. Checked against https://paystack.com/docs/api/transaction/ and
// https://paystack.com/docs/payments/webhooks/ on 2026-10-02 (not yet run against a live/test account).
const BASE = "https://api.paystack.co";

export const paystackConfigured = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

const headers = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

type Envelope<T> = { status: boolean; message: string; data: T };

/** Starts a hosted checkout. `amountKobo` is in kobo (NGN's smallest unit). */
export async function initializeTransaction(p: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  try {
    const res = await fetch(`${BASE}/transaction/initialize`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        email: p.email,
        amount: String(p.amountKobo), // docs type this as a string
        currency: "NGN",
        reference: p.reference,
        callback_url: p.callbackUrl,
        // Docs type this field as a stringified JSON object.
        metadata: p.metadata ? JSON.stringify(p.metadata) : undefined,
      }),
    });
    const json = (await res.json()) as Envelope<{ authorization_url: string }>;
    if (!res.ok || !json.status) return { error: json.message ?? `Paystack error ${res.status}` };
    return { authorizationUrl: json.data.authorization_url };
  } catch (e) {
    console.error("[paystack] initialize failed", e);
    return { error: "Could not reach Paystack" };
  }
}

// `amount` is what the customer was charged (can include fees if the account passes them on);
// `requested_amount` is the amount we asked for in initialize.
export type Verification = { status: string; amount: number; requested_amount?: number; currency: string; reference: string };

export async function verifyTransaction(reference: string): Promise<Verification | null> {
  try {
    const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: headers(),
      cache: "no-store",
    });
    const json = (await res.json()) as Envelope<Verification>;
    return res.ok && json.status ? json.data : null;
  } catch (e) {
    console.error("[paystack] verify failed", e);
    return null;
  }
}

/** Webhook authenticity: x-paystack-signature = HMAC-SHA512(raw body, secret key), hex. */
export function validWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
