"use server";
import { z } from "zod";
import { emailEsc, sendMail } from "@/lib/mailgun";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(2000),
  website: z.string().max(0).optional(), // honeypot: real people leave this empty
});

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContact(input: z.input<typeof schema>): Promise<ContactResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const to = process.env.SHOP_OWNER_EMAIL;
  if (!to) return { ok: false, error: "Messages are not connected yet. Please call or WhatsApp us instead." };
  const ok = await sendMail({
    to,
    replyTo: d.email,
    subject: `Website enquiry from ${d.name}`,
    text: `From: ${d.name} <${d.email}>\nPhone: ${d.phone || "n/a"}\n\n${d.message}\n`,
    html: `<p><strong>${emailEsc(d.name)}</strong> &lt;${emailEsc(d.email)}&gt;<br>Phone: ${emailEsc(d.phone || "n/a")}</p><p style="white-space:pre-wrap">${emailEsc(d.message)}</p>`,
  });
  return ok ? { ok: true } : { ok: false, error: "We could not send your message. Please try again or call us." };
}
