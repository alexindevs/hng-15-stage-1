import { createBrowserClient } from "@supabase/ssr";
import { publishableKey, supabaseUrl } from "./env";

export const createClient = () => createBrowserClient(supabaseUrl()!, publishableKey()!);
