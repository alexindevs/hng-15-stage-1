import Link from "next/link";
import { Suspense } from "react";
import { getProducts, type Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader } from "@/components/PageHeader";

export const metadata = {
  title: "Shop vehicles",
  description: "Browse cars, SUVs, pickups, motorcycles and bicycles. Filter by category, price and year.",
};

type SP = { category?: string; price?: string; year?: string; sort?: string };

/** "a-b" range in plain units; either side may be empty. */
function range(v?: string): [number, number] {
  if (!v) return [-Infinity, Infinity];
  const [a, b] = v.split("-");
  return [a ? Number(a) : -Infinity, b ? Number(b) : Infinity];
}

function apply(all: Product[], sp: SP) {
  const [pMin, pMax] = range(sp.price);
  const [yMin, yMax] = range(sp.year);
  const out = all.filter((p) => {
    if (sp.category && p.category !== sp.category) return false;
    const naira = p.price_kobo / 100;
    if (naira < pMin || naira >= pMax) return false;
    if (sp.year && (p.year == null || p.year < yMin || p.year > yMax)) return false;
    return true;
  });
  const by: Record<string, (a: Product, b: Product) => number> = {
    "price-asc": (a, b) => a.price_kobo - b.price_kobo,
    "price-desc": (a, b) => b.price_kobo - a.price_kobo,
    "year-desc": (a, b) => (b.year ?? 0) - (a.year ?? 0),
  };
  return sp.sort && by[sp.sort] ? out.sort(by[sp.sort]) : out;
}

export default async function Shop({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const all = await getProducts();
  const categories = [...new Set(all.map((p) => p.category))];
  const products = apply(all, sp);
  return (
    <>
      <PageHeader eyebrow="The showroom" title="Our vehicles">
        Every listing shows its price, year and condition. Found one you like? Book a viewing before you buy.
      </PageHeader>
      <Suspense>
        <FilterBar categories={categories} />
      </Suspense>
      <p className="mb-5 mt-8 text-sm text-mute" aria-live="polite">
        {products.length} {products.length === 1 ? "vehicle" : "vehicles"}
      </p>
      {products.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line py-20 text-center">
          <p className="font-display text-2xl">Nothing matches those filters</p>
          <p className="mt-2 text-mute">Try a wider price or year range.</p>
          <Link href="/shop" className="btn-gold mt-6">Clear filters</Link>
        </div>
      )}
    </>
  );
}
