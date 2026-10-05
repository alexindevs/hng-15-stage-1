import { NextResponse, type NextRequest } from "next/server";
import { optionalAuth } from "@/lib/api-auth";
import { placeOrderCore } from "@/lib/checkout";

// POST /api/checkout { name, email, phone, address, city, state, notes?, paymentMethod, items:[{slug,quantity}] }
//   -> { ok:true, reference, redirectUrl? } | { ok:false, error }
// paymentMethod: pay_on_delivery | bank_transfer | paystack (redirectUrl is the Paystack page to open).
// Guest checkout is allowed; with a Bearer token the order is linked to the account and the saved cart is emptied.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  const auth = await optionalAuth(req);
  const result = await placeOrderCore(body, auth?.user.id ?? null);
  if (result.ok && auth && !result.redirectUrl) await auth.sb.from("cart_items").delete().eq("user_id", auth.user.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
