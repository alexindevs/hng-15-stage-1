import Link from "next/link";
import { SHOP_NAME } from "@/lib/format";
import { NAV } from "@/lib/nav";
import { Wordmark } from "./Header";
import { CONTACT } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm text-mute">
            Cars, SUVs, motorcycles and bikes, honestly sold. Lagos, Nigeria.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2.5 text-sm">
            {NAV.map((n) => (
              <li key={n.href}><Link href={n.href} className="text-bone/80 hover:text-gold">{n.label}</Link></li>
            ))}
            <li><Link href="/book" className="text-bone/80 hover:text-gold">Book a viewing</Link></li>
            <li><Link href="/cart" className="text-bone/80 hover:text-gold">Cart</Link></li>
            <li><Link href="/orders" className="text-bone/80 hover:text-gold">My orders</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Visit</p>
          <p className="text-sm text-bone/80">{CONTACT.address}</p>
          <p className="mt-1 text-sm text-mute">Viewings by appointment.</p>
          <p className="mt-3 text-sm text-bone/80">{CONTACT.phone}</p>
          <p className="text-sm text-bone/80">{CONTACT.email}</p>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-mute">
        © {new Date().getFullYear()} {SHOP_NAME}. Photography: see /vehicles/CREDITS.md.
      </div>
    </footer>
  );
}
