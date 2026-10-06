"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CartLine = { slug: string; name: string; price_kobo: number; category: string; quantity: number; max: number };
type Ctx = {
  lines: CartLine[];
  count: number;
  totalKobo: number;
  add: (l: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** Re-read the account cart now (used for polling on the cart page). No-op for guests. */
  refresh: () => Promise<void>;
  ready: boolean;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "eo-cart-v1";

type ServerCart = {
  items: { slug: string; name: string; category: string; price_kobo: number; stock: number; quantity: number }[];
};
const fromServer = (c: ServerCart): CartLine[] =>
  c.items.map((i) => ({ slug: i.slug, name: i.name, price_kobo: i.price_kobo, category: i.category, quantity: i.quantity, max: i.stock }));

async function api(method: "GET" | "PUT", items?: { slug: string; quantity: number }[]): Promise<ServerCart> {
  const res = await fetch("/api/cart", {
    method,
    headers: { "Content-Type": "application/json" },
    body: items ? JSON.stringify({ items }) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`cart ${res.status}`);
  return res.json();
}

/**
 * Cart in React context + localStorage (guests). When signed in, the cart is also stored in Supabase through /api/cart
 * (the same endpoint the mobile app uses): the device cart is merged into the account cart on sign-in, every edit is
 * pushed, and a websocket broadcast (plus 5-second polling on the cart page) brings in changes made on the phone.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const linesRef = useRef(lines);
  linesRef.current = lines;
  const synced = useRef(false); // initial merge with the account cart finished
  const skipPush = useRef(false); // next lines change came from the server; do not echo it back
  const version = useRef(0); // bumps on every local edit so stale responses are ignored
  const pending = useRef(false); // a local edit has not been saved yet; do not overwrite it with a server read

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  // Who is signed in (cookie session). Skipped when Supabase is not configured.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sign-in: merge the device cart with the account cart (higher quantity wins), save it, adopt the server's version.
  useEffect(() => {
    synced.current = false;
    if (!ready || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const server = await api("GET");
        const merged = new Map<string, number>();
        for (const i of server.items) merged.set(i.slug, i.quantity);
        for (const l of linesRef.current) merged.set(l.slug, Math.max(merged.get(l.slug) ?? 0, l.quantity));
        const result = await api("PUT", [...merged].map(([slug, quantity]) => ({ slug, quantity })));
        if (cancelled) return;
        skipPush.current = true;
        setLines(fromServer(result));
        synced.current = true;
      } catch {
        // offline or API error: keep the device cart; the next edit retries
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  // Push every local edit (debounced); the server's answer carries current prices and stock caps.
  useEffect(() => {
    if (!ready || !userId) return;
    if (skipPush.current) {
      skipPush.current = false;
      return;
    }
    if (!synced.current) return;
    const v = ++version.current;
    pending.current = true;
    const t = setTimeout(async () => {
      try {
        const result = await api("PUT", linesRef.current.map((l) => ({ slug: l.slug, quantity: l.quantity })));
        if (v !== version.current) return;
        pending.current = false;
        skipPush.current = true;
        setLines(fromServer(result));
      } catch {
        if (v === version.current) pending.current = false;
      }
    }, 300);
    return () => clearTimeout(t);
  }, [lines, ready, userId]);

  // Re-read the account cart. Skipped while a local edit is waiting to be saved so it can never be overwritten.
  const refresh = useCallback(async () => {
    if (!synced.current || pending.current) return;
    const v = version.current;
    try {
      const next = fromServer(await api("GET"));
      if (v !== version.current || pending.current) return;
      const key = (ls: CartLine[]) => JSON.stringify(ls.map((l) => [l.slug, l.quantity]));
      if (key(next) !== key(linesRef.current)) {
        skipPush.current = true;
        setLines(next);
      }
    } catch {}
  }, []);

  // Live updates: the database broadcasts "cart_changed" on a private channel only this user can join (websocket).
  // Also refresh when the tab regains focus. The cart page adds 5-second polling on top as a safety net.
  useEffect(() => {
    if (!ready || !userId || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`cart:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "cart_changed" }, () => {
          clearTimeout(debounce);
          debounce = setTimeout(refresh, 150);
        })
        .subscribe();
    })();
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, userId, refresh]);

  const add = useCallback<Ctx["add"]>((l, qty = 1) => {
    setLines((cur) => {
      const found = cur.find((x) => x.slug === l.slug);
      if (found) return cur.map((x) => (x.slug === l.slug ? { ...x, quantity: Math.min(x.quantity + qty, l.max) } : x));
      return [...cur, { ...l, quantity: Math.min(qty, l.max) }];
    });
  }, []);
  const setQty = useCallback((slug: string, qty: number) => {
    setLines((cur) =>
      cur.flatMap((x) => (x.slug !== slug ? [x] : qty <= 0 ? [] : [{ ...x, quantity: Math.min(qty, x.max) }])),
    );
  }, []);
  const remove = useCallback((slug: string) => setLines((c) => c.filter((x) => x.slug !== slug)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totalKobo: lines.reduce((n, l) => n + l.quantity * l.price_kobo, 0),
      add,
      setQty,
      remove,
      clear,
      refresh,
    }),
    [lines, ready, add, setQty, remove, clear, refresh],
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};
