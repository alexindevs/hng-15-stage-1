import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseUrl } from "@/lib/supabase/env";

// GET /api/auth/google?redirect_to=<app deep link>
// Starts Google sign-in for the mobile app. Redirects to Supabase's Google authorize endpoint (implicit flow, so no
// server-side PKCE verifier is needed); Supabase then sends the user back to `redirect_to` with
// #access_token=...&refresh_token=... in the URL fragment of /auth/mobile, which passes it to the app deep link.
// This site's own origin (e.g. https://<site>/**) must be in Supabase -> Authentication -> URL Configuration -> Redirect URLs.
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
  // Supabase returns to an https page on this site (already allowed for the website's own login), which forwards the
  // session to the app's deep link. This avoids depending on Supabase matching exp:// patterns.
  const bounce = new URL("/auth/mobile", req.nextUrl.origin);
  bounce.searchParams.set("to", redirectTo);
  url.searchParams.set("redirect_to", bounce.toString());
  return NextResponse.redirect(url.toString());
}
