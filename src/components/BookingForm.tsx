"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/format";
import { slotKey, type Day } from "@/lib/booking";
import { FEE_POLICY } from "@/lib/site";
import { createBooking } from "@/app/(shop)/book/actions";

type Vehicle = { slug: string; name: string };
type FeeOption = "pay_now" | "at_viewing";

export function BookingForm({
  vehicles, initialSlug, days, booked, capacity, feeKobo, paystack,
}: {
  vehicles: Vehicle[];
  initialSlug: string;
  days: Day[];
  booked: Record<string, number>;
  capacity: number;
  feeKobo: number;
  paystack: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [slug, setSlug] = useState(initialSlug);
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const canPayNow = feeKobo > 0 && paystack;
  const [feeOption, setFeeOption] = useState<FeeOption>(canPayNow ? "pay_now" : "at_viewing");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    createClient().auth.getUser().then(({ data }) => {
      setEmail((e) => e || data.user?.email || "");
      setName((n) => n || data.user?.user_metadata?.full_name || "");
    });
  }, []);

  const day = useMemo(() => days.find((d) => d.date === date) ?? days[0], [days, date]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "");
    setError("");
    if (!slot) return setError("Choose a date and time for your viewing.");
    start(async () => {
      const res = await createBooking({
        slug, slot, name: g("name"), email: g("email"), phone: g("phone"), notes: g("notes"), feeOption,
      });
      if (!res.ok) return setError(res.error);
      if (res.redirectUrl) window.location.href = res.redirectUrl;
      else router.push(`/booking/${res.reference}`);
    });
  }

  const step = "font-display text-gold text-sm";
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-10">
        <section>
          <p className={step}>01</p>
          <h2 className="font-display mt-1 text-2xl">Which vehicle?</h2>
          <select className="input mt-4" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Vehicle">
            {vehicles.map((v) => <option key={v.slug} value={v.slug}>{v.name}</option>)}
          </select>
        </section>

        <section>
          <p className={step}>02</p>
          <h2 className="font-display mt-1 text-2xl">Pick a date and time</h2>
          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Date">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                role="tab"
                aria-selected={d.date === day?.date}
                onClick={() => { setDate(d.date); setSlot(""); }}
                className={`shrink-0 rounded-xl border px-4 py-3 text-sm transition ${d.date === day?.date ? "border-gold bg-gold text-black" : "border-line hover:border-gold/60"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Time">
            {day?.slots.map((s) => {
              const full = (booked[slotKey(s.iso)] ?? 0) >= capacity;
              const on = slot === s.iso;
              return (
                <button
                  key={s.iso}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={full}
                  onClick={() => setSlot(s.iso)}
                  className={`rounded-xl border px-3 py-3 text-sm transition ${
                    full ? "cursor-not-allowed border-line text-mute/50 line-through"
                    : on ? "border-gold bg-gold/10 text-gold" : "border-line hover:border-gold/60"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-mute">Times are in Lagos time. Viewings last about an hour. Closed on Sundays.</p>
        </section>

        <section>
          <p className={step}>03</p>
          <h2 className="font-display mt-1 text-2xl">Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">Full name
              <input name="name" required className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
            <label className="block text-sm">Phone
              <input name="phone" type="tel" required className="input mt-1" autoComplete="tel" /></label>
            <label className="block text-sm sm:col-span-2">Email
              <input name="email" type="email" required className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
            <label className="block text-sm sm:col-span-2">Anything we should know? (optional)
              <textarea name="notes" rows={3} className="input mt-1" /></label>
          </div>
        </section>

        {feeKobo > 0 && (
          <section>
            <p className={step}>04</p>
            <h2 className="font-display mt-1 text-2xl">Inspection fee</h2>
            <p className="mt-2 text-sm text-mute">A {formatNaira(feeKobo)} inspection fee applies to each viewing. Pay it now or at the viewing. <strong className="text-bone">{FEE_POLICY}</strong></p>
            <fieldset className="mt-4 space-y-2">
              {([
                ...(canPayNow ? [["pay_now", `Pay ${formatNaira(feeKobo)} now`, "Securely with Paystack (card, bank transfer or USSD)."]] : []),
                ["at_viewing", "Pay at the viewing", "Settle the fee when you arrive."],
              ] as [FeeOption, string, string][]).map(([v, title, hint]) => (
                <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${feeOption === v ? "border-gold bg-gold/5" : "border-line"}`}>
                  <input type="radio" name="fee" className="mt-1 accent-[#d4af37]" checked={feeOption === v} onChange={() => setFeeOption(v)} />
                  <span><span className="block">{title}</span><span className="text-sm text-mute">{hint}</span></span>
                </label>
              ))}
            </fieldset>
          </section>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-panel p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-xl">Your viewing</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div><dt className="eyebrow">Vehicle</dt><dd className="mt-1">{vehicles.find((v) => v.slug === slug)?.name}</dd></div>
          <div><dt className="eyebrow">When</dt>
            <dd className="mt-1">{slot ? `${days.find((d) => d.slots.some((s) => s.iso === slot))?.label}, ${days.flatMap((d) => d.slots).find((s) => s.iso === slot)?.label}` : "Not chosen yet"}</dd></div>
          {feeKobo > 0 && <div><dt className="eyebrow">Inspection fee</dt><dd className="mt-1 text-gold">{formatNaira(feeKobo)} <span className="text-mute">({feeOption === "pay_now" ? "pay now" : "at viewing"})</span></dd></div>}
        </dl>
        <p className="mt-5 text-xs leading-relaxed text-mute">
          Your request is held while we confirm it. You will get an email once it is approved.{feeKobo > 0 && <> {FEE_POLICY}</>}
        </p>
        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
        <button className="btn-gold mt-5 w-full" disabled={pending}>
          {pending ? "Please wait…" : feeOption === "pay_now" && feeKobo > 0 ? `Pay ${formatNaira(feeKobo)} and request` : "Request viewing"}
        </button>
      </aside>
    </form>
  );
}
