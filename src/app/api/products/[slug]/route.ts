import { NextResponse } from "next/server";
import { getProduct, getProductMedia, getProducts } from "@/lib/products";

// GET /api/products/:slug -> { product, media, related }
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  if (!p) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  const [media, all] = await Promise.all([getProductMedia(p), getProducts()]);
  const related = all.filter((x) => x.slug !== p.slug && x.category === p.category).slice(0, 3);
  return NextResponse.json({ product: p, media, related });
}
