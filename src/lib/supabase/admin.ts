import "server-only";
import { createClient } from "@supabase/supabase-js";
import { secretKey, supabaseUrl } from "./env";

/** Secret-key client (legacy: service_role). Bypasses RLS. Server-side only; never import from client code. */
export const createAdminClient = () =>
  createClient(supabaseUrl()!, secretKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
