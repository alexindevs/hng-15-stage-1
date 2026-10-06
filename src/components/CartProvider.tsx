"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ApiError, backoffMs, withRetry } from "@/lib/retry";

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
const sameCart = (a: CartLine[], b: CartLine[]) =>
  JSON.stringify(a.map((l) => [l.slug, l.quantity])) === JSON.stringify(b.map((l) => [l.slug, l.quantity]));

async function call(method: "GET" | "PUT" | "POST" | "PATCH" | "DELETE", path = "", body?: unknown): Promise<ServerCart> {
  const res = await fetch(`/api/cart${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(`cart ${res.status}`, res.status);
  return res.json();
}

/**
 * Cart in React context + localStorage (guests). When signed in, the cart also lives in Supabase through /api/cart
 * (the endpoint the mobile app uses):
 *  - on sign-in the device cart is merged into the account cart (higher quantity wins);
 *  - every edit is sent as a per-item operation (add / set quantity / remove / clear), in order, so edits made on
 *    different devices combine instead of overwriting each other;
 *  - a websocket broadcast tells this tab when the cart changed elsewhere; the cart page also polls every 5 seconds.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const linesRef = useRef(lines);
  linesRef.current = lines;
  const synced = useRef(false); // initial merge with the account cart finished
  const inflight = useRef(0); // queued/running operations; while > 0 server reads are ignored
  const chain = useRef<Promise<unknown>>(Promise.resolve());

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

  const userRef = useRef(userId);
  userRef.current = userId;
  const syncing = useRef(false);
  const failures = useRef(0); // consecutive failed first-sync attempts (drives the backoff)
  const nextTryAt = useRef(0); // earliest time the first sync may be retried (exponential backoff with jitter)

  // Merge the device cart with the account cart (higher quantity wins), save it, adopt the server's version.
  // Retried by refresh() until it succeeds (e.g. after a network error).
  const initialSync = useCallback(async () => {
    const uid = userRef.current;
    if (!uid || syncing.current || Date.now() < nextTryAt.current) return;
    syncing.current = true;
    try {
      const server = await withRetry(() => call("GET"));
      const merged = new Map<string, number>();
      for (const i of server.items) merged.set(i.slug, i.quantity);
      for (const l of linesRef.current) merged.set(l.slug, Math.max(merged.get(l.slug) ?? 0, l.quantity));
      const result = await withRetry(() => call("PUT", "", { items: [...merged].map(([slug, quantity]) => ({ slug, quantity })) }));
      if (userRef.current !== uid) return;
      failures.current = 0;
      nextTryAt.current = 0;
      setLines(fromServer(result));
      synced.current = true;
    } catch {
      // keep the device cart; refresh() retries after an exponential backoff with jitter
      if (userRef.current === uid) nextTryAt.current = Date.now() + backoffMs(failures.current++, 1000, 60_000);
    } finally {
      syncing.current = false;
    }
  }, []);

  useEffect(() => {
    synced.current = false;
    failures.current = 0;
    nextTryAt.current = 0;
    if (ready && userId) initialSync();
  }, [ready, userId, initialSync]);

  /** Sends one operation after all earlier ones; when the queue drains, adopts the server's answer. */
  const enqueue = useCallback((op: () => Promise<ServerCart>) => {
    if (!synced.current) return;
    inflight.current += 1;
    chain.current = chain.current.then(async () => {
      let result: ServerCart | null = null;
      try {
        result = await withRetry(op); // transient failures retry with exponential backoff + jitter, keeping order
      } catch {
        // keep the optimistic local state; the next refresh reconciles with the server
      }
      inflight.current -= 1;
      if (inflight.current === 0 && result) setLines(fromServer(result));
    });
  }, []);

  // Re-read the account cart. Skipped while local edits are still being saved so they cannot be overwritten.
  const refresh = useCallback(async () => {
    if (!synced.current) {
      initialSync(); // earlier sync failed or has not run yet: try again
      return;
    }
    if (inflight.current > 0) return;
    try {
      const next = fromServer(await call("GET"));
      if (inflight.current > 0) return;
      if (!sameCart(next, linesRef.current)) setLines(next);
    } catch {}
  }, [initialSync]);

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

  const add = useCallback<Ctx["add"]>(
    (l, qty = 1) => {
      setLines((cur) => {
        const found = cur.find((x) => x.slug === l.slug);
        if (found) return cur.map((x) => (x.slug === l.slug ? { ...x, quantity: Math.min(x.quantity + qty, l.max) } : x));
        return [...cur, { ...l, quantity: Math.min(qty, l.max) }];
      });
      enqueue(() => call("POST", "", { slug: l.slug, quantity: qty }));
    },
    [enqueue],
  );
  const setQty = useCallback(
    (slug: string, qty: number) => {
      setLines((cur) =>
        cur.flatMap((x) => (x.slug !== slug ? [x] : qty <= 0 ? [] : [{ ...x, quantity: Math.min(qty, x.max) }])),
      );
      enqueue(() => call("PATCH", `/${encodeURIComponent(slug)}`, { quantity: Math.max(0, qty) }));
    },
    [enqueue],
  );
  const remove = useCallback(
    (slug: string) => {
      setLines((c) => c.filter((x) => x.slug !== slug));
      enqueue(() => call("DELETE", `/${encodeURIComponent(slug)}`));
    },
    [enqueue],
  );
  const clear = useCallback(() => {
    setLines([]);
    enqueue(() => call("DELETE"));
  }, [enqueue]);

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
