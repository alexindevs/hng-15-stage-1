import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseUrl } from "@/lib/supabase/env";

// GET /api/auth/google?redirect_to=<app deep link>
// Starts Google sign-in for the mobile app. Redirects to Supabase's Google authorize endpoint (implicit flow, so no
// server-side PKCE verifier is needed); Supabase then sends the user back to `redirect_to` with
// #access_token=...&refresh_token=... in the URL fragment, which the app turns into a session.
// `redirect_to` must ALSO be listed under Supabase -> Authentication -> URL Configuration -> Redirect URLs.
// Only the app's own schemes are accepted, so this cannot be used as an open redirect that leaks tokens.
// egoolisa:// = installed app; exp:// and exps:// = Expo Go; exp+<scheme>:// = Expo development builds.
const ALLOWED = [/^egoolisa:\/\//, /^exps?:\/\//, /^exp\+[a-z][a-z0-9.-]*:\/\//];

export function GET(req: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const redirectTo = req.nextUrl.searchParams.get("redirect_to") ?? "";
  if (!ALLOWED.some((re) => re.test(redirectTo))) {
    return NextResponse.json({ error: "redirect_to must be an app deep link (egoolisa://, exp:// or exp+egoolisa://)." }, { status: 400 });
  }
  const url = new URL("/auth/v1/authorize", supabaseUrl()!);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", redirectTo);
  return NextResponse.redirect(url.toString());
}
