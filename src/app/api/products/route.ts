import { NextResponse, type NextRequest } from "next/server";
import { getProducts } from "@/lib/products";

// GET /api/products?category=&q=&year=&min=&max=&sort=newest|price_asc|price_desc  (prices in kobo)
// Same data as the /shop page; also returns the available categories.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const all = await getProducts();
  const category = sp.get("category");
  const q = sp.get("q")?.toLowerCase().trim();
  const num = (k: string) => (sp.get(k) && Number.isFinite(Number(sp.get(k))) ? Number(sp.get(k)) : null);
  const [year, min, max] = [num("year"), num("min"), num("max")];
  let items = all.filter(
    (p) =>
      (!category || p.category === category) &&
      (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)) &&
      (year === null || (p.year ?? 0) >= year) &&
      (min === null || p.price_kobo >= min) &&
      (max === null || p.price_kobo <= max),
  );
  const sort = sp.get("sort");
  if (sort === "price_asc") items = [...items].sort((a, b) => a.price_kobo - b.price_kobo);
  if (sort === "price_desc") items = [...items].sort((a, b) => b.price_kobo - a.price_kobo);
  return NextResponse.json({ items, categories: [...new Set(all.map((p) => p.category))] });
}
