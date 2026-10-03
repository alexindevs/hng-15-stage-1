import Link from "next/link";
import { SHOP_NAME } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { CartLink } from "./CartLink";
import { MobileMenu } from "./MobileMenu";

export async function Header() {
  let email: string | null = null;
  if (supabaseConfigured()) {
    const { data } = await (await createClient()).auth.getUser();
    email = data.user?.email ?? null;
  }
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-display text-lg gold-text sm:text-xl">{SHOP_NAME}</Link>
        <div className="flex items-center gap-3 text-sm md:gap-5">
          <nav className="hidden items-center gap-5 md:flex">
            <Link href="/shop" className="hover:text-gold">Shop</Link>
            {email ? (
              <>
                <Link href="/orders" className="hover:text-gold">Orders</Link>
                <form action="/auth/signout" method="post">
                  <button className="text-mute hover:text-gold" title={email}>Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="hover:text-gold">Sign in</Link>
            )}
          </nav>
          <CartLink />
          <MobileMenu email={email} />
        </div>
      </div>
    </header>
  );
}
