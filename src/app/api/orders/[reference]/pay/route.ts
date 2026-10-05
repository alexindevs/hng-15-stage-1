import { NextResponse } from "next/server";
import { retryPaystackCore } from "@/lib/checkout";

// POST /api/orders/:reference/pay -> { ok:true, redirectUrl } to retry an abandoned card payment.
export async function POST(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const r = await retryPaystackCore((await params).reference);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
