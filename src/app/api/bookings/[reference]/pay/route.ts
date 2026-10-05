import { NextResponse } from "next/server";
import { retryBookingCore } from "@/lib/bookings-create";

// POST /api/bookings/:reference/pay -> { ok:true, redirectUrl } to pay the inspection fee online.
export async function POST(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const r = await retryBookingCore((await params).reference);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
