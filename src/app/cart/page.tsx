"use client";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatNaira } from "@/lib/format";

export default function CartPage() {
  const { lines, totalKobo, setQty, remove, ready } = useCart();
  if (!ready) return null;
  if (!lines.length)
    return (
      <div className="py-20 text-center">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <Link href="/shop" className="btn-gold mt-6">Browse the shop</Link>
      </div>
    );
  return (
    <>
      <h1 className="font-display text-4xl">Your cart</h1>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {lines.map((l) => (
          <div key={l.slug} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <Link href={`/product/${l.slug}`} className="font-display text-lg hover:text-gold">{l.name}</Link>
              <p className="text-sm text-mute">{formatNaira(l.price_kobo)} each</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-ghost !px-3 !py-1" aria-label="Decrease" onClick={() => setQty(l.slug, l.quantity - 1)}>−</button>
              <span className="w-6 text-center">{l.quantity}</span>
              <button className="btn-ghost !px-3 !py-1" aria-label="Increase" disabled={l.quantity >= l.max} onClick={() => setQty(l.slug, l.quantity + 1)}>+</button>
              <span className="w-28 text-right text-gold">{formatNaira(l.price_kobo * l.quantity)}</span>
              <button className="text-sm text-mute hover:text-gold" onClick={() => remove(l.slug)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xl">Total <span className="ml-2 text-gold">{formatNaira(totalKobo)}</span></p>
        <Link href="/checkout" className="btn-gold">Checkout</Link>
      </div>
    </>
  );
}
