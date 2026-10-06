import { createClient as createSbClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { publishableKey, supabaseConfigured, supabaseUrl } from "@/lib/supabase/env";

export const err = (message: string, status: number) => NextResponse.json({ error: message }, { status });

type Ok = { sb: SupabaseClient; user: User };

/**
 * Authenticates an API call. Mobile clients send `Authorization: Bearer <supabase access_token>`;
 * the website can call the same routes with its session cookie. Queries run as the user, so RLS applies.
 */
export async function authenticate(req: NextRequest): Promise<Ok | NextResponse> {
  if (!supabaseConfigured()) return err("Supabase is not configured on the server.", 503);
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const sb = token
    ? createSbClient(supabaseUrl()!, publishableKey()!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
    : await createCookieClient();
  const { data, error } = token ? await sb.auth.getUser(token) : await sb.auth.getUser();
  if (error || !data.user) {
    // Say why (expired / malformed token, user from another project, ...) so a failing client can be diagnosed.
    const why = error?.message ?? (token ? "token accepted but no user returned" : "no token or session cookie sent");
    return err(`Not signed in (${why}).`, 401);
  }
  return { sb, user: data.user };
}

/** Like authenticate(), but a missing or invalid login is not an error (guest checkout and booking are allowed). */
export async function optionalAuth(req: NextRequest): Promise<Ok | null> {
  const a = await authenticate(req);
  return a instanceof NextResponse ? null : a;
}
