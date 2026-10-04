import Link from "next/link";

export const metadata = {
  title: "About",
  description: "Who we are, how we sell, and why you can view every vehicle before you buy.",
};

const VALUES = [
  { t: "Clear pricing", d: "The price, year, mileage and condition sit on every listing. What you see is what we quote." },
  { t: "Look before you leap", d: "Every vehicle can be viewed in person. Book a slot, bring a mechanic if you like, take your time." },
  { t: "Flexible payment", d: "Pay online, by transfer, or when you collect. We keep the paperwork straightforward." },
];

export default function About() {
  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">About us</p>
          <h1 className="font-display mt-2 text-4xl sm:text-6xl">Vehicles sold the straightforward way.</h1>
          <p className="mt-6 max-w-xl leading-relaxed text-mute">
            Ego Olisa Enterprises sells cars, SUVs, pickups, motorcycles and bicycles in Lagos. We list what we have,
            show you the price, and let you see it in person before you spend a naira.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-gold">Browse vehicles</Link>
            <Link href="/contact" className="btn-ghost">Contact us</Link>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vehicles/suv-white-fortuner.jpg" alt="A white Toyota Fortuner parked on a dirt road" className="aspect-[4/5] w-full object-cover" />
        </div>
      </section>

      <section className="border-y border-line bg-coal">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-20 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <div key={v.t} className="rounded-2xl border border-line bg-ink p-7">
              <p className="font-display text-gold">0{i + 1}</p>
              <h2 className="font-display mt-6 text-2xl">{v.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mute">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h2 className="font-display text-4xl sm:text-5xl">Come and see for yourself.</h2>
        <p className="mx-auto mt-4 max-w-md text-mute">Choose a vehicle, pick a time, and we will have it ready.</p>
        <Link href="/book" className="btn-gold mt-8">Book a viewing</Link>
      </section>
    </>
  );
}
