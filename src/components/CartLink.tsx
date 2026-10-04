"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="btn-ghost !px-4 !py-1.5 text-sm">
      Cart{ready && count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
