import Link from "next/link";
import { getProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export const metadata = { title: "Shop" };

export default async function Shop({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const all = await getProducts();
  const categories = [...new Set(all.map((p) => p.category))];
  const products = category ? all.filter((p) => p.category === category) : all;
  return (
    <>
      <h1 className="font-display text-4xl">Our vehicles</h1>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {[undefined, ...categories].map((c) => (
          <Link
            key={c ?? "all"}
            href={c ? `/shop?category=${encodeURIComponent(c)}` : "/shop"}
            className={`rounded-full border px-4 py-1.5 ${c === category ? "border-gold bg-gold text-black" : "border-line hover:border-gold"}`}
          >
            {c ?? "All"}
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.slug} p={p} />)}
      </div>
    </>
  );
}
