import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { CONTACT } from "@/lib/site";

export const metadata = {
  title: "Contact",
  description: "Call, WhatsApp or message Ego Olisa Enterprises, or book a viewing.",
};

export default function Contact() {
  const wa = `https://wa.me/${CONTACT.whatsapp}`;
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
      <p className="eyebrow">Get in touch</p>
      <h1 className="font-display mt-2 max-w-2xl text-5xl sm:text-6xl">Talk to a real person.</h1>
      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-8">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {([
              ["Call", CONTACT.phone, `tel:${CONTACT.phone.replace(/\s/g, "")}`],
              ["WhatsApp", "Chat with us", wa],
              ["Email", CONTACT.email, `mailto:${CONTACT.email}`],
              ["Visit", CONTACT.address, undefined],
            ] as [string, string, string | undefined][]).map(([k, v, href]) => (
              <div key={k} className="bg-panel p-6">
                <p className="eyebrow">{k}</p>
                {href ? <a href={href} className="mt-2 block hover:text-gold">{v}</a> : <p className="mt-2">{v}</p>}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="eyebrow">Opening hours</p>
            <dl className="mt-3 space-y-2 text-sm">
              {CONTACT.hours.map(([d, h]) => (
                <div key={d} className="flex justify-between gap-4"><dt className="text-mute">{d}</dt><dd>{h}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-6">
            <h2 className="font-display text-2xl">Want to see a vehicle?</h2>
            <p className="mt-2 text-sm text-mute">Pick a slot online and come and inspect it in person.</p>
            <Link href="/book" className="btn-gold mt-4">Book a viewing</Link>
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-coal p-6 sm:p-8">
          <h2 className="font-display text-2xl">Send a message</h2>
          <div className="mt-6"><ContactForm /></div>
        </div>
      </div>
    </div>
  );
}
