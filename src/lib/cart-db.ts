import type { SupabaseClient } from "@supabase/supabase-js";

export type CartItem = {
  slug: string;
  name: string;
  category: string;
  price_kobo: number;
  image_url: string | null;
  cutout_url: string | null;
  stock: number;
  quantity: number;
};
export type CartResponse = { items: CartItem[]; count: number; total_kobo: number };

type Row = {
  quantity: number;
  products: Omit<CartItem, "quantity"> & { active: boolean } | null;
};

/** Reads the user's cart joined to current product data (price, stock). Sold-out / inactive lines are dropped. */
export async function readCart(sb: SupabaseClient, userId: string): Promise<CartResponse> {
  const { data, error } = await sb
    .from("cart_items")
    .select("quantity, products(slug, name, category, price_kobo, image_url, cutout_url, stock, active)")
    .eq("user_id", userId)
    .order("updated_at");
  if (error) throw new Error(error.message);
  const items: CartItem[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    const p = r.products;
    if (!p || !p.active || p.stock <= 0) continue;
    const { active: _a, ...rest } = p;
    items.push({ ...rest, quantity: Math.min(r.quantity, p.stock) });
  }
  return {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    total_kobo: items.reduce((n, i) => n + i.quantity * i.price_kobo, 0),
  };
}

/** Looks up active products by slug (stock + id) for validating cart writes. */
export async function productsBySlug(sb: SupabaseClient, slugs: string[]) {
  if (!slugs.length) return new Map<string, { id: string; stock: number }>();
  const { data, error } = await sb.from("products").select("id, slug, stock").eq("active", true).in("slug", slugs);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.slug as string, { id: p.id as string, stock: p.stock as number }]));
}
