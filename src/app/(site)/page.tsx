import Link from "next/link";
import { getProducts } from "@/lib/products";
import { formatNaira } from "@/lib/format";
import { inspectionFeeKobo } from "@/lib/site";
import { ProductCard } from "@/components/ProductCard";
import { VehicleCarousel, type CarouselItem } from "@/components/VehicleCarousel";

const CATEGORIES = [
  { name: "Cars", blurb: "Saloons and coupes", img: "/vehicles/cutouts/sedan-white-mercedes.webp" },
  { name: "SUVs & Trucks", blurb: "Family haulers, off-roaders, pickups", img: "/vehicles/cutouts/suv-white-fortuner.webp" },
  { name: "Motorcycles", blurb: "Commuters to sports bikes", img: "/vehicles/cutouts/moto-tvs-apache.webp" },
  { name: "Bicycles", blurb: "Trail and town", img: "/vehicles/cutouts/bicycle-trek-800.webp" },
];

const REASONS = [
  { n: "01", t: "Honest listings", d: "Every listing shows the price, year, mileage and condition up front. No “call for price”." },
  { n: "02", t: "See it before you buy", d: "Book a viewing slot online and inspect the vehicle in person before you commit." },
  { n: "03", t: "Pay your way", d: "Pay online with Paystack, by bank transfer, or on delivery. Your choice at checkout." },
];

const STEPS = [
  { n: "1", t: "Browse", d: "Filter by category, price and year to find what fits." },
  { n: "2", t: "Book a viewing", d: "Pick a date and time that suits you. We confirm the slot." },
  { n: "3", t: "Inspect", d: "Come and look it over, take it for a spin, ask anything." },
  { n: "4", t: "Drive away", d: "Settle payment and collect your vehicle with all documents." },
];

const FAQ = [
  { q: "Can I see a vehicle before paying?", a: "Yes. Book a viewing from the vehicle page, choose a slot, and we will confirm it. You can inspect the vehicle in person before any purchase." },
  { q: "What is the inspection fee?", a: "Each viewing carries a {FEE} inspection fee, which you can pay when you book or at the viewing. The inspection fee is non-refundable." },
  { q: "How do I pay?", a: "Online with Paystack, by bank transfer, or on delivery. The options are shown at checkout." },
  { q: "Are the prices negotiable?", a: "Prices are shown on every listing. If you have a question about a price, ask us when you book your viewing." },
  { q: "Do you deliver?", a: "We can arrange delivery. Tell us your city when you order and we will confirm the details." },
];

export default async function Home() {
  const products = await getProducts();
  const order = [
    "mercedes-c-class-2022", "toyota-fortuner-trd", "tvs-apache-rtr-160", "toyota-hilux-gr-sport",
    "jeep-compass-limited", "yamaha-mt-09", "hyundai-palisade-2023", "honda-cg125", "honda-cb200x-adventure",
    "trek-800-mountain-bike",
  ];
  const slides: CarouselItem[] = products
    .filter((p) => p.cutout_url)
    .sort((a, b) => (order.indexOf(a.slug) + 100) % 100 - (order.indexOf(b.slug) + 100) % 100)
    .map((p) => ({
      slug: p.slug, name: p.name, category: p.category, price_kobo: p.price_kobo,
      year: p.year, condition: p.condition, cutout: p.cutout_url!,
    }));
  const featured = products.filter((p) => p.stock > 0).slice(0, 6);

  return (
    <>
      {/* HERO: blurred gold wordmark behind a rotating 3D carousel */}
      <section className="relative isolate overflow-hidden pb-16 pt-6 sm:pt-10">
        <div aria-hidden className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_70%_55%_at_50%_38%,#241d0b,#0a0a0a_72%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-6 -z-10 flex flex-col items-center sm:top-8 sm:flex-row sm:justify-center sm:gap-[1.8vw]">
          <span className="backdrop-word">Ego</span>
          <span className="backdrop-word -mt-[4vw] sm:mt-0">Olisa</span>
        </div>
        <h1 className="sr-only">Ego Olisa Enterprises: cars, SUVs, motorcycles and bikes in Lagos</h1>
        <div className="mx-auto max-w-7xl px-4 pt-[34vw] sm:pt-[8vw]">
          {slides.length > 0 && <VehicleCarousel items={slides} />}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Shop by type</p>
            <h2 className="font-display mt-2 text-4xl sm:text-5xl">Find your ride</h2>
          </div>
          <Link href="/shop" className="text-sm text-gold hover:underline">See everything →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.name}
              href={`/shop?category=${encodeURIComponent(c.name)}`}
              className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/60 sm:p-5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.img}
                alt=""
                loading="lazy"
                className="absolute inset-x-3 bottom-[18%] w-[calc(100%-1.5rem)] object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,.6)] transition duration-500 group-hover:scale-105"
              />
              <span className="eyebrow relative">{c.blurb}</span>
              <span className="font-display relative text-2xl sm:text-3xl">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="border-y border-line bg-coal">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">Why Ego Olisa</p>
            <h2 className="font-display mt-2 text-4xl sm:text-5xl">Buying a vehicle should feel straightforward.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {REASONS.map((r) => (
              <div key={r.n} className="rounded-2xl border border-line bg-ink p-6">
                <p className="font-display text-gold">{r.n}</p>
                <h3 className="font-display mt-6 text-xl">{r.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow">In stock</p>
            <h2 className="font-display mt-2 text-4xl sm:text-5xl">Latest arrivals</h2>
          </div>
          <Link href="/shop" className="text-sm text-gold hover:underline">View all →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
      </section>

      {/* PHOTO BAND */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="relative isolate overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vehicles/suv-dusk.jpg" alt="" loading="lazy" className="h-[420px] w-full object-cover sm:h-[480px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center gap-4 p-7 sm:p-14">
            <p className="eyebrow !text-gold">Viewings by appointment</p>
            <h2 className="font-display max-w-lg text-4xl sm:text-6xl">See it in person before you decide.</h2>
            <p className="max-w-md text-sm text-bone/75">Pick a slot, come by, and inspect the vehicle with no pressure.</p>
            <div><Link href="/shop" className="btn-gold">Choose a vehicle</Link></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (light section) */}
      <section className="paper mt-20">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <p className="eyebrow !text-paper-ink/60">How it works</p>
          <h2 className="font-display mt-2 max-w-xl text-4xl sm:text-5xl">From browsing to the keys in four steps.</h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-paper-ink/15 bg-paper-ink/15 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-paper p-6 sm:p-8">
                <span className="font-display text-5xl text-paper-ink/25">{s.n}</span>
                <h3 className="font-display mt-6 text-xl">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-ink/70">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 className="font-display mt-2 text-4xl sm:text-5xl">Good to know.</h2>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium marker:hidden">
                {f.q}
                <span className="text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-mute">{f.a.replace("{FEE}", formatNaira(inspectionFeeKobo()))}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="border-t border-line bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,#241d0b,#0a0a0a_70%)]">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h2 className="font-display text-4xl sm:text-6xl">Ready to find yours?</h2>
          <p className="mx-auto mt-4 max-w-md text-mute">Browse the full stock, or sign in to track your orders.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="btn-gold">Browse vehicles</Link>
            <Link href="/login" className="btn-ghost">Sign in</Link>
          </div>
        </div>
      </section>
    </>
  );
}
