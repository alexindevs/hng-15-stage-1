"use client";
import { useState } from "react";
import type { Media } from "@/lib/products";

/** Main viewer + thumbnails for a listing's photos and videos. */
export function ProductGallery({ media, name }: { media: Media[]; name: string }) {
  const [i, setI] = useState(0);
  if (!media.length) {
    return <div className="aspect-[4/3] rounded-3xl border border-line bg-panel" role="img" aria-label={name} />;
  }
  const cur = media[i];
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-panel">
        {cur.kind === "video" ? (
          <video key={cur.url} src={cur.url} controls playsInline preload="metadata" className="h-full w-full object-contain bg-black" />
        ) : cur.plate ? (
          <div className="flex h-full w-full items-end justify-center bg-[radial-gradient(ellipse_at_50%_95%,#2f2917,#101010_70%)] p-[8%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.url} alt={`${name}, cut-out`} className="max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.6)]" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.url} alt={name} className="h-full w-full object-cover" />
        )}
      </div>
      {media.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Gallery">
          {media.map((m, n) => (
            <button
              key={m.url}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={m.kind === "video" ? "Play video" : `Photo ${n + 1}`}
              onClick={() => setI(n)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border bg-panel transition ${n === i ? "border-gold" : "border-line opacity-70 hover:opacity-100"}`}
            >
              {m.kind === "video" ? (
                <span className="flex h-full w-full items-center justify-center text-gold">▶</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className={`h-full w-full ${m.plate ? "object-contain p-1" : "object-cover"}`} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
