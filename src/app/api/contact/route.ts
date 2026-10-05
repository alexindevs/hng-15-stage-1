import { NextResponse } from "next/server";
import { sendContact } from "@/app/(site)/contact/actions";

// POST /api/contact { name, email, phone?, message } -> { ok:true } | { ok:false, error }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  const r = await sendContact(body);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
