import catalog from "./catalog.json";
import { createClient } from "./supabase/server";
import { supabaseConfigured } from "./supabase/env";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_kobo: number;
  image_url: string | null;
  stock: number;
};

const fallback: Product[] = catalog.map((p) => ({ ...p, id: p.slug, image_url: null }));

/** Reads from Supabase when configured, otherwise from the bundled catalogue (local preview). */
export async function getProducts(): Promise<Product[]> {
  if (!supabaseConfigured()) return fallback;
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").eq("active", true).order("created_at");
  if (error || !data?.length) return fallback;
  return data as Product[];
}

export async function getProduct(slug: string): Promise<Product | null> {
  return (await getProducts()).find((p) => p.slug === slug) ?? null;
}
