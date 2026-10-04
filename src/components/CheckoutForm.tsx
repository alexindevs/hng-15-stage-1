"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useCart } from "@/components/CartProvider";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { placeOrder } from "@/app/(shop)/checkout/actions";

type Method = "paystack" | "bank_transfer" | "pay_on_delivery";

export function CheckoutForm({ paystack }: { paystack: boolean }) {
  const { lines, totalKobo, clear, ready } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [method, setMethod] = useState<Method>(paystack ? "paystack" : "bank_transfer");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    createClient().auth.getUser().then(({ data }) => {
      setEmail((e) => e || data.user?.email || "");
      setName((n) => n || data.user?.user_metadata?.full_name || "");
    });
  }, []);

  if (!ready) return null;
  if (!lines.length)
    return (
      <div className="rounded-3xl border border-dashed border-line py-24 text-center">
        <h1 className="font-display text-4xl">Nothing to check out</h1>
        <Link href="/shop" className="btn-gold mt-6">Browse vehicles</Link>
      </div>
    );

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "");
    setError("");
    start(async () => {
      const res = await placeOrder({
        name: g("name"), email: g("email"), phone: g("phone"), address: g("address"),
        city: g("city"), state: g("state"), notes: g("notes"), paymentMethod: method,
        items: lines.map((l) => ({ slug: l.slug, quantity: l.quantity })),
      });
      if (!res.ok) return setError(res.error);
      clear();
      if (res.redirectUrl) window.location.href = res.redirectUrl; // Paystack hosted checkout
      else router.push(`/order/${res.reference}`);
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="space-y-4">
        <PageHeader eyebrow="Checkout" title="Complete your order" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">Full name
            <input name="name" required className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <label className="block text-sm">Email
            <input name="email" type="email" required className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label className="block text-sm">Phone
            <input name="phone" type="tel" required className="input mt-1" autoComplete="tel" /></label>
          <label className="block text-sm">City
            <input name="city" required className="input mt-1" autoComplete="address-level2" /></label>
        </div>
        <label className="block text-sm">Delivery / contact address
          <input name="address" required className="input mt-1" autoComplete="street-address" /></label>
        <label className="block text-sm">State
          <input name="state" required className="input mt-1" autoComplete="address-level1" /></label>
        <label className="block text-sm">Order notes (optional)
          <textarea name="notes" rows={3} className="input mt-1" /></label>
        <fieldset className="space-y-2">
          <legend className="text-sm">Payment method</legend>
          {([
            ...(paystack ? [["paystack", "Pay online with Paystack", "Card, bank transfer or USSD, securely processed by Paystack."]] : []),
            ["bank_transfer", "Bank transfer", "We email you our account details. Your order is held once you pay."],
            ["pay_on_delivery", "Pay on delivery / collection", "Pay when you inspect and collect your purchase."],
          ] as [Method, string, string][]).map(([v, title, hint]) => (
            <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${method === v ? "border-gold bg-gold/5" : "border-line"}`}>
              <input type="radio" name="payment" className="mt-1 accent-[#d4af37]" checked={method === v} onChange={() => setMethod(v)} />
              <span><span className="block">{title}</span><span className="text-sm text-mute">{hint}</span></span>
            </label>
          ))}
        </fieldset>
        {error && <p role="alert" className="text-red-400">{error}</p>}
        <button className="btn-gold w-full" disabled={pending}>{pending ? "Please wait…" : method === "paystack" ? `Pay ${formatNaira(totalKobo)}` : `Place order · ${formatNaira(totalKobo)}`}</button>
      </form>
      <aside className="h-fit rounded-2xl border border-line bg-panel p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-xl">Order summary</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.slug} className="flex justify-between gap-3"><span>{l.name} × {l.quantity}</span><span className="text-gold">{formatNaira(l.price_kobo * l.quantity)}</span></li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-line pt-4"><span>Total</span><span className="text-gold">{formatNaira(totalKobo)}</span></p>
      </aside>
    </div>
  );
}
