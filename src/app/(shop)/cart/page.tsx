"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { PageHeader } from "@/components/PageHeader";
import { formatNaira } from "@/lib/format";

export default function CartPage() {
  const { lines, totalKobo, setQty, remove, ready, refresh } = useCart();
  // Safety net on top of the websocket: re-read the account cart every 5 seconds while this page is open.
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);
  if (!ready) return null;
  if (!lines.length)
    return (
      <div className="rounded-3xl border border-dashed border-line py-24 text-center">
        <h1 className="font-display text-4xl">Your cart is empty</h1>
        <p className="mt-2 text-mute">Browse the showroom and add a vehicle, or book a viewing first.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/shop" className="btn-gold">Browse vehicles</Link>
          <Link href="/book" className="btn-ghost">Book a viewing</Link>
        </div>
      </div>
    );
  return (
    <>
      <PageHeader eyebrow="Cart" title="Your cart" />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {lines.map((l) => (
            <li key={l.slug} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="eyebrow">{l.category}</p>
                <Link href={`/product/${l.slug}`} className="font-display text-xl hover:text-gold">{l.name}</Link>
                <p className="mt-1 text-sm text-mute">{formatNaira(l.price_kobo)} each</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn-ghost !h-9 !w-9 !p-0" aria-label="Decrease quantity" onClick={() => setQty(l.slug, l.quantity - 1)}>−</button>
                <span className="w-6 text-center" aria-live="polite">{l.quantity}</span>
                <button className="btn-ghost !h-9 !w-9 !p-0" aria-label="Increase quantity" disabled={l.quantity >= l.max} onClick={() => setQty(l.slug, l.quantity + 1)}>+</button>
                <span className="w-32 text-right font-semibold text-gold">{formatNaira(l.price_kobo * l.quantity)}</span>
                <button className="text-sm text-mute hover:text-gold" onClick={() => remove(l.slug)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-2xl border border-line bg-panel p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl">Summary</h2>
          <p className="mt-4 flex justify-between border-t border-line pt-4 text-lg">
            <span>Total</span><span className="font-semibold text-gold">{formatNaira(totalKobo)}</span>
          </p>
          <Link href="/checkout" className="btn-gold mt-6 w-full">Checkout</Link>
          <Link href="/shop" className="btn-ghost mt-3 w-full">Keep browsing</Link>
        </aside>
      </div>
    </>
  );
}
