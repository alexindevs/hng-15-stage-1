"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatNaira } from "@/lib/format";

export type CarouselItem = {
  slug: string;
  name: string;
  category: string;
  price_kobo: number;
  year: number | null;
  condition: string | null;
  cutout: string;
};

/**
 * 3D "coverflow" carousel: the active vehicle sits centre-stage and the rest recede on either side.
 * Drag / swipe, arrow keys, arrow buttons and dots all work; it auto-advances unless the user prefers
 * reduced motion or is interacting with it.
 */
export function VehicleCarousel({ items }: { items: CarouselItem[] }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const startX = useRef<number | null>(null);
  const dragged = useRef(false);

  const go = useCallback((delta: number) => setActive((a) => (a + delta + n) % n), [n]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || reduced || n < 2) return;
    const t = setInterval(() => go(1), 4500);
    return () => clearInterval(t);
  }, [paused, reduced, go, n]);

  const offset = (i: number) => {
    let d = (((i - active) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };

  const current = items[active];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        className="relative mx-auto h-[260px] touch-pan-y select-none sm:h-[330px] lg:h-[380px]"
        style={{ perspective: "1500px" }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Featured vehicles"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onPointerDown={(e) => {
          startX.current = e.clientX;
          dragged.current = false;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 45) {
            dragged.current = true;
            go(dx < 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => (startX.current = null)}
      >
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {items.map((it, i) => {
            const d = offset(i);
            const abs = Math.abs(d);
            const visible = abs <= 2;
            return (
              <button
                key={it.slug}
                type="button"
                tabIndex={d === 0 ? 0 : -1}
                aria-label={d === 0 ? `${it.name} (selected)` : `Show ${it.name}`}
                aria-hidden={!visible}
                onClick={() => !dragged.current && setActive(i)}
                className="absolute bottom-6 left-1/2 flex h-[78%] w-[min(78vw,640px)] items-end justify-center outline-none"
                style={{
                  transform: `translateX(calc(-50% + ${d * 60}%)) translateZ(${-abs * 260}px) rotateY(${-d * 32}deg) scale(${d === 0 ? 1 : 0.84})`,
                  opacity: !visible ? 0 : abs === 2 ? 0.22 : abs === 1 ? 0.6 : 1,
                  zIndex: 10 - abs,
                  pointerEvents: abs <= 1 ? "auto" : "none",
                  transition: reduced ? "none" : "transform .8s cubic-bezier(.22,.8,.2,1), opacity .6s",
                  filter: d === 0 ? "none" : "brightness(.7)",
                }}
              >
                {/* ground shadow */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-1/2 h-6 w-[78%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-xl"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.cutout}
                  alt={it.name}
                  draggable={false}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="relative max-h-full max-w-full object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,.55)]"
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-1 flex max-w-4xl flex-col items-center px-4 text-center" aria-live="polite">
        <p className="eyebrow !text-gold">{current.category}</p>
        <h2 className="font-display mt-1.5 text-3xl sm:text-4xl lg:text-5xl">{current.name}</h2>
        <p className="mt-2 text-sm text-mute">
          {[current.year, current.condition].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 text-xl font-semibold text-gold">{formatNaira(current.price_kobo)}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link href={`/product/${current.slug}`} className="btn-gold">View details</Link>
          <Link href="/shop" className="btn-ghost">Browse all</Link>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-center gap-4">
        <button type="button" onClick={() => go(-1)} aria-label="Previous vehicle" className="btn-ghost !h-10 !w-10 !p-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose vehicle">
          {items.map((it, i) => (
            <button
              key={it.slug}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={it.name}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-gold" : "w-1.5 bg-bone/25 hover:bg-bone/50"}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next vehicle" className="btn-ghost !h-10 !w-10 !p-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      </div>
    </div>
  );
}
