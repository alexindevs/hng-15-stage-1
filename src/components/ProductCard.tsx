import Link from "next/link";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/products";
import { AddToCart } from "./AddToCart";
import { ProductArt } from "./ProductArt";

export function ProductCard({ p }: { p: Product }) {
  return (
    <div className="group flex flex-col border border-line bg-panel transition hover:border-gold">
      <Link href={`/product/${p.slug}`} className="block aspect-square overflow-hidden">
        <ProductArt name={p.name} src={p.image_url} />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs uppercase tracking-widest text-gold-deep">{p.category}</span>
        <Link href={`/product/${p.slug}`} className="font-display text-lg leading-snug hover:text-gold">
          {p.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-gold">{formatNaira(p.price_kobo)}</span>
          <AddToCart product={p} compact />
        </div>
      </div>
    </div>
  );
}
