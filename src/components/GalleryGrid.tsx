"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type GalleryItem = { src: string; name: string; slug: string; category: string };

/** Photo mosaic with a keyboard-friendly lightbox. */
export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const move = useCallback((d: number) => setOpen((o) => (o === null ? o : (o + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, move]);

  const cur = open === null ? null : items[open];
  return (
    <>
      <div className="grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[220px] md:grid-cols-4">
        {items.map((it, i) => (
          <button
            key={it.slug}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open ${it.name}`}
            className={`group relative overflow-hidden rounded-2xl border border-line bg-panel ${i % 7 === 0 ? "col-span-2 row-span-2" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.src} alt={it.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-sm opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">{it.name}</span>
          </button>
        ))}
      </div>

      {cur && (
        <div role="dialog" aria-modal="true" aria-label={cur.name} className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between text-sm" onClick={(e) => e.stopPropagation()}>
            <p><span className="eyebrow mr-3">{cur.category}</span>{cur.name}</p>
            <button className="btn-ghost !px-4 !py-1.5" onClick={() => setOpen(null)}>Close</button>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden py-4" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Previous photo" className="btn-ghost absolute left-0 z-10 !h-11 !w-11 !p-0" onClick={() => move(-1)}>‹</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.src} alt={cur.name} className="max-h-full max-w-full rounded-xl object-contain" />
            <button aria-label="Next photo" className="btn-ghost absolute right-0 z-10 !h-11 !w-11 !p-0" onClick={() => move(1)}>›</button>
          </div>
          <div className="text-center" onClick={(e) => e.stopPropagation()}>
            <Link href={`/product/${cur.slug}`} className="btn-gold">View this vehicle</Link>
          </div>
        </div>
      )}
    </>
  );
}
