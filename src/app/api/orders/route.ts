import { NextResponse, type NextRequest } from "next/server";
import { authenticate } from "@/lib/api-auth";

// GET /api/orders (auth) -> the signed-in user's orders, newest first.
export async function GET(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  const { data, error } = await a.sb
    .from("orders")
    .select("reference,status,payment_status,payment_method,total_kobo,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
