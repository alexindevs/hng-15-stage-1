"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Hamburger button + dropdown for small screens. The desktop nav lives in Header. */
export function MobileMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const item = "block px-4 py-3 text-left text-base hover:text-gold";

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="btn-ghost !px-2.5 !py-2"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <path d="M4 4l12 12M16 4L4 16" />
          ) : (
            <path d="M3 5.5h14M3 10h14M3 14.5h14" />
          )}
        </svg>
      </button>

      {open && (
        <>
          <nav
            id="mobile-menu"
            className="absolute inset-x-0 top-full border-b border-line bg-ink shadow-lg shadow-black/50"
          >
            <ul className="mx-auto max-w-6xl divide-y divide-line py-1">
              <li><Link href="/shop" onClick={close} className={item}>Shop</Link></li>
              {email ? (
                <>
                  <li><Link href="/orders" onClick={close} className={item}>Orders</Link></li>
                  <li>
                    <form action="/auth/signout" method="post">
                      <button className={`${item} w-full text-mute`}>Sign out</button>
                      <p className="px-4 pb-3 -mt-2 truncate text-xs text-mute">{email}</p>
                    </form>
                  </li>
                </>
              ) : (
                <li><Link href="/login" onClick={close} className={item}>Sign in</Link></li>
              )}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
