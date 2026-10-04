import { NextResponse, type NextRequest } from "next/server";
import { validWebhookSignature } from "@/lib/paystack";
import { settlePaystackPayment } from "@/lib/payments";
import { settleBookingPayment } from "@/lib/bookings";
import { adminConfigured } from "@/lib/supabase/env";

// Set this URL as the Webhook URL in the Paystack dashboard (Settings -> API Keys & Webhooks).
export async function POST(request: NextRequest) {
  const raw = await request.text(); // signature is computed over the raw body
  if (!validWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  if (!adminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const event = JSON.parse(raw) as { event: string; data?: { reference?: string } };
  if (event.event === "charge.success" && event.data?.reference) {
    // Re-verified with Paystack inside; the webhook body itself is never trusted for the amount.
    // Booking inspection fees use references starting "BK-"; everything else is an order.
    if (event.data.reference.startsWith("BK-")) await settleBookingPayment(event.data.reference);
    else await settlePaystackPayment(event.data.reference);
  }
  return NextResponse.json({ received: true });
}
