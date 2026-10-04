"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Horizontally scrolling row with no scrollbar. On desktop (md and up) it shows round arrow buttons at
 * whichever ends still have content to scroll to; on touch screens people just swipe.
 */
export function ScrollRow({
  children,
  className = "",
  prevLabel = "Scroll left",
  nextLabel = "Scroll right",
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { prevLabel?: string; nextLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: reduced ? "auto" : "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/95 text-bone shadow-lg shadow-black/50 transition hover:border-gold hover:text-gold md:flex";
  return (
    <div className="relative">
      {edge.left && (
        <button type="button" aria-label={prevLabel} onClick={() => scroll(-1)} className={`${arrow} left-1`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
        </button>
      )}
      <div ref={ref} className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`} {...rest}>
        {children}
      </div>
      {edge.right && (
        <button type="button" aria-label={nextLabel} onClick={() => scroll(1)} className={`${arrow} right-1`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      )}
    </div>
  );
}
