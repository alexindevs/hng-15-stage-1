import { NextResponse, type NextRequest } from "next/server";
import { authenticate, optionalAuth } from "@/lib/api-auth";
import { createBookingCore } from "@/lib/bookings-create";

// POST /api/bookings { slug, slot (ISO from /availability), name, email, phone, notes?, feeOption }
//   feeOption: pay_now | bank_transfer | at_viewing  -> { ok:true, reference, redirectUrl? } | { ok:false, error }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  const auth = await optionalAuth(req);
  const result = await createBookingCore(body, auth?.user.id ?? null);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

// GET /api/bookings (auth) -> the signed-in user's bookings.
export async function GET(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  const { data, error } = await a.sb
    .from("bookings")
    .select("reference,product_name,slot_start,status,fee_kobo,fee_status")
    .order("slot_start", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
