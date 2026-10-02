import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publishableKey, supabaseConfigured, supabaseUrl } from "@/lib/supabase/env";

// Next 16 "proxy" (formerly middleware): keeps the Supabase auth session fresh.
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl()!, publishableKey()!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims(); // refreshes an expiring session; verifies the JWT (docs: prefer over getUser here)
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
