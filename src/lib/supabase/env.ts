// Supabase's new API keys (sb_publishable_... / sb_secret_...) replace the legacy anon / service_role
// keys. Both formats work with supabase-js, so legacy variable names are still accepted as a fallback.
// Keep these as literal `process.env.X` references: Next only inlines NEXT_PUBLIC_* vars that way.
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
export const publishableKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const secretKey = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = () => Boolean(supabaseUrl() && publishableKey());

export const adminConfigured = () => supabaseConfigured() && Boolean(secretKey());
