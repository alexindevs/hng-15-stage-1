import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { NAV } from "@/lib/nav";
import { CartLink } from "./CartLink";
import { MobileMenu } from "./MobileMenu";

export function Wordmark() {
  return (
    <Link href="/" className="whitespace-nowrap leading-none" aria-label="Ego Olisa Enterprises, home">
      <span className="font-display block text-lg tracking-tight sm:text-xl" style={{ fontStretch: "125%" }}>EGO OLISA</span>
      <span className="eyebrow block !text-[.6rem] !tracking-[.38em] text-gold">Enterprises</span>
    </Link>
  );
}

export async function Header() {
  let email: string | null = null;
  if (supabaseConfigured()) {
    const { data } = await (await createClient()).auth.getUser();
    email = data.user?.email ?? null;
  }
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5">
        <Wordmark />
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-bone/80 hover:text-gold">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 text-sm">
          <div className="hidden items-center gap-5 md:flex">
            {email ? (
              <>
                <Link href="/orders" className="text-bone/80 hover:text-gold">Orders</Link>
                <form action="/auth/signout" method="post">
                  <button className="text-mute hover:text-gold" title={email}>Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="text-bone/80 hover:text-gold">Sign in</Link>
            )}
          </div>
          <Link href="/book" className="btn-gold hidden !px-4 !py-1.5 text-sm md:inline-flex">Book a viewing</Link>
          <CartLink />
          <MobileMenu email={email} />
        </div>
      </div>
    </header>
  );
}
