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
  cutout_url: string | null;
  year: number | null;
  mileage_km: number | null;
  condition: string | null;
  stock: number;
};

const fallback: Product[] = catalog.map((p) => ({
  id: p.slug,
  slug: p.slug,
  name: p.name,
  description: p.description,
  category: p.category,
  price_kobo: p.price_kobo,
  image_url: p.image,
  cutout_url: p.cutout,
  year: p.year,
  mileage_km: p.mileage_km,
  condition: p.condition,
  stock: p.stock,
}));

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

export type Media = { kind: "image" | "video"; url: string; plate?: boolean };

/** Photos and videos for a listing: the main photo, any listing_media rows, then the cut-out on a plate. */
export async function getProductMedia(p: Product): Promise<Media[]> {
  const media: Media[] = [];
  if (p.image_url) media.push({ kind: "image", url: p.image_url });
  if (supabaseConfigured() && p.id !== p.slug) {
    const { data } = await (await createClient())
      .from("listing_media").select("kind, url").eq("product_id", p.id).order("sort");
    for (const m of data ?? []) media.push({ kind: m.kind === "video" ? "video" : "image", url: m.url });
  }
  if (p.cutout_url) media.push({ kind: "image", url: p.cutout_url, plate: true });
  return media;
}
