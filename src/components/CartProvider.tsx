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
 * pushed, and the account cart is re-read when the tab regains focus so changes made on the phone show up here.
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
    const t = setTimeout(async () => {
      try {
        const result = await api("PUT", linesRef.current.map((l) => ({ slug: l.slug, quantity: l.quantity })));
        if (v !== version.current) return;
        skipPush.current = true;
        setLines(fromServer(result));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [lines, ready, userId]);

  // Pick up changes made elsewhere (the phone) when this tab becomes visible again, and every 20 seconds while open.
  useEffect(() => {
    if (!ready || !userId) return;
    const refresh = async () => {
      if (!synced.current || document.visibilityState !== "visible") return;
      const v = version.current;
      try {
        const server = await api("GET");
        if (v !== version.current) return; // edited locally while loading
        const next = fromServer(server);
        if (JSON.stringify(next.map((l) => [l.slug, l.quantity])) !== JSON.stringify(linesRef.current.map((l) => [l.slug, l.quantity]))) {
          skipPush.current = true;
          setLines(next);
        }
      } catch {}
    };
    const timer = setInterval(refresh, 20_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [ready, userId]);

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
    }),
    [lines, ready, add, setQty, remove, clear],
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};
