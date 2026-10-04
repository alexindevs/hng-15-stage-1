"use client";
import { useState, useTransition } from "react";
import { sendContact } from "@/app/(site)/contact/actions";

export function ContactForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? "");
    setError("");
    start(async () => {
      const res = await sendContact({ name: g("name"), email: g("email"), phone: g("phone"), message: g("message"), website: g("website") });
      if (res.ok) { setSent(true); form.reset(); } else setError(res.error);
    });
  }

  if (sent)
    return (
      <div className="rounded-2xl border border-gold/50 bg-gold/5 p-8">
        <h3 className="font-display text-2xl">Message sent</h3>
        <p className="mt-2 text-mute">Thank you. We will get back to you soon.</p>
        <button className="btn-ghost mt-5" onClick={() => setSent(false)}>Send another</button>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">Name<input name="name" required className="input mt-1" autoComplete="name" /></label>
        <label className="block text-sm">Phone (optional)<input name="phone" type="tel" className="input mt-1" autoComplete="tel" /></label>
      </div>
      <label className="block text-sm">Email<input name="email" type="email" required className="input mt-1" autoComplete="email" /></label>
      <label className="block text-sm">How can we help?<textarea name="message" rows={5} required className="input mt-1" /></label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button className="btn-gold" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
