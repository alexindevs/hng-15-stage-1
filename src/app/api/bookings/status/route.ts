import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { notifyBookingStatus } from "@/lib/bookings";
import { adminConfigured } from "@/lib/supabase/env";

// Target of a Supabase Database Webhook on `bookings` UPDATE (see supabase/schema.sql for setup).
// Authenticated with a shared secret header; the body is only used to find the booking id, and the
// status that gets emailed is re-read from the database.
export async function POST(request: NextRequest) {
  const secret = process.env.BOOKING_WEBHOOK_SECRET;
  if (!secret || !adminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const given = Buffer.from(request.headers.get("x-webhook-secret") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { type?: string; table?: string; record?: { id?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (body.table !== "bookings" || body.type !== "UPDATE" || !body.record?.id) {
    return NextResponse.json({ ignored: true });
  }
  const result = await notifyBookingStatus(body.record.id);
  // A failed send returns 500 so the webhook is retried; "skipped" (already notified, or a status we do not email) is fine.
  return NextResponse.json({ result }, { status: result === "failed" ? 500 : 200 });
}
