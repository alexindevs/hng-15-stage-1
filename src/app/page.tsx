import Link from "next/link";
import { getProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { SHOP_NAME } from "@/lib/format";

export default async function Home() {
  const products = (await getProducts()).slice(0, 4);
  return (
    <>
      <section className="relative overflow-hidden border border-line px-6 py-24 text-center bg-[radial-gradient(ellipse_at_top,#2a2412,#0a0a0a_70%)]">
        <p className="text-xs uppercase tracking-[0.4em] text-gold-deep">Cars · SUVs · Motorcycles</p>
        <h1 className="font-display mx-auto mt-4 max-w-3xl text-5xl leading-tight md:text-7xl">
          <span className="gold-text">{SHOP_NAME}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-mute">
          Quality cars, SUVs and motorcycles, carefully inspected and honestly priced. Browse, pay securely and drive away.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/shop" className="btn-gold">Browse vehicles</Link>
          <Link href="/login" className="btn-ghost">Sign in</Link>
        </div>
      </section>
      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl">Featured</h2>
          <Link href="/shop" className="text-gold hover:underline">View all →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
      </section>
    </>
  );
}
