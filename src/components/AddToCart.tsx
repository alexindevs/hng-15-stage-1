"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";
import type { Product } from "@/lib/products";

export function AddToCart({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const out = product.stock <= 0;
  return (
    <button
      className={compact ? "btn-ghost text-sm" : "btn-gold"}
      disabled={out}
      onClick={() => {
        add({ slug: product.slug, name: product.name, price_kobo: product.price_kobo, category: product.category, max: product.stock });
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {out ? "Sold out" : done ? "Added ✓" : "Add to cart"}
    </button>
  );
}
