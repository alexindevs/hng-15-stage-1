import Link from "next/link";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/products";
import { ProductArt } from "./ProductArt";

export function ProductCard({ p }: { p: Product }) {
  const meta = [p.year, p.mileage_km != null ? `${p.mileage_km.toLocaleString("en-NG")} km` : null, p.condition]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/product/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-gold/60"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(ellipse_at_50%_90%,#2a2616,#111_70%)]">
        {p.cutout_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.cutout_url}
            alt={p.name}
            loading="lazy"
            className="absolute inset-x-[8%] bottom-[10%] h-[78%] w-[84%] object-contain object-bottom drop-shadow-[0_14px_22px_rgba(0,0,0,.6)] transition duration-500 group-hover:scale-105"
          />
        ) : (
          <ProductArt name={p.name} src={p.image_url} />
        )}
        {p.stock <= 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-bone">Sold</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <span className="eyebrow">{p.category}</span>
        <h3 className="font-display text-xl leading-snug">{p.name}</h3>
        {meta && <p className="text-sm text-mute">{meta}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="font-semibold text-gold">{formatNaira(p.price_kobo)}</span>
          <span className="text-sm text-bone/70 transition group-hover:translate-x-0.5 group-hover:text-gold">View →</span>
        </div>
      </div>
    </Link>
  );
}
