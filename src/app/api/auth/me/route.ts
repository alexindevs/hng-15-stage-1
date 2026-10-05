import { NextResponse, type NextRequest } from "next/server";
import { authenticate } from "@/lib/api-auth";

// GET /api/auth/me with `Authorization: Bearer <access token>` -> the signed-in user, or 401.
export async function GET(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  const { user } = a;
  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    name: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  });
}
