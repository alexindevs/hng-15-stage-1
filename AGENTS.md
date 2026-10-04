# AGENTS.md — Ego Olisa Enterprises shop

Handover guide for any agent continuing this project. Read `status.md` next for what is done and what is blocked.

## Project
E-commerce site for **Ego Olisa Enterprises** (HNG15 Lesson 2, Task 1), a seller of cars, SUVs, motorcycles and bikes. Black & gold theme. Currency NGN (stored as kobo integers).

## Stack
- Next.js 16 (App Router, TypeScript, `src/`), React 19, Tailwind CSS v4 (tokens in `src/app/globals.css` `@theme`)
- Supabase: Postgres (data), Auth (Google OAuth), via `@supabase/ssr` + `@supabase/supabase-js`
- Mailgun: HTTP API called with plain `fetch` (no SDK) in `src/lib/mailgun.ts`
- Paystack: hosted-checkout redirect flow via REST (`src/lib/paystack.ts`); no client-side SDK or public key
- Zod for input validation

## Commands
- `npm install`, `npm run dev`, `npm run build`, `npm run lint` (= `tsc --noEmit`)
- `node scripts/gen-seed.mjs` regenerates `supabase/seed.sql` from `src/lib/catalog.json`

## Layout
- `supabase/schema.sql` — tables, RLS policies, `place_order()` RPC (atomic stock check + order insert). `supabase/seed.sql` — placeholder catalogue.
- `src/lib/catalog.json` — placeholder products; also the **fallback** catalogue when Supabase env vars are absent (so the UI previews without creds).
- `src/lib/supabase/{client,server,admin,env}.ts` — browser / server (cookies) / service-role clients. `src/proxy.ts` refreshes the auth session (Next 16 renamed middleware to proxy).
- `src/app/(shop)/checkout/actions.ts` — server action `placeOrder`: validates, re-reads prices from the DB, calls `place_order`, then sends the Mailgun email.
- `src/lib/payments.ts` — `settlePaystackPayment(ref)`: server-side verify with Paystack, check amount == order total and NGN, flip `unpaid -> paid` once, then email. Called from the order page (return from Paystack) and `src/app/api/paystack/webhook/route.ts` (HMAC-SHA512 `x-paystack-signature`). Idempotent.
- `src/lib/mailgun.ts` — black/gold table-based HTML email with a payment block per method.
- `src/components/CartProvider.tsx` — cart in React context + localStorage (`eo-cart-v1`). Cart stores slugs only; the server never trusts client prices.
- `src/app/auth/*` — OAuth callback and signout. `src/app/(shop)/login` — Google button.
- Viewing bookings: `src/lib/booking.ts` (pure slot rules, shared with the client form), `src/lib/bookings.ts` (server: availability, emails, fee settlement), `src/app/(shop)/book/*`, `src/app/(shop)/booking/[reference]`, SQL `place_booking()`. Paystack references starting `BK-` are bookings, all others are orders (see the webhook route).
- Route groups: `src/app/(site)` full-bleed landing pages; `src/app/(shop)` inner pages inside a centred container (URLs unchanged). Nav links: `src/lib/nav.ts`.
- Images: `scripts/process-images.mjs` and `scripts/process-cutouts.mjs` build `public/vehicles/` from `assets-originals/` and `assets-cutouts/`. Never edit the originals.

## Rules / conventions
- Never trust client-sent prices or totals. Order writes happen only server-side with the Supabase secret key (`SUPABASE_SECRET_KEY`; legacy `SUPABASE_SERVICE_ROLE_KEY` still works); the `server-only` import guards `admin.ts`.
- Never commit `.env*` (gitignored). Add any new variable to `.env.example`.
- Payment methods: `paystack`, `bank_transfer`, `pay_on_delivery`. Paystack orders are only emailed/confirmed after verified payment; the Paystack option hides itself when `PAYSTACK_SECRET_KEY` is unset.
- Money is integer kobo everywhere (DB columns are `bigint`: a car exceeds int4 kobo); format with `formatNaira`.
- Email failure must not fail the order (order is already persisted); `orders.email_sent_at` records success.
- Fonts: Archivo (`font-display`) for headings, Inter for body text. Keep the black/gold/off-white palette: use the Tailwind tokens (`gold`, `ink`, `panel`, `line`, `bone`, `mute`, `paper`), not ad-hoc colours.
- Next 16 specifics: `params` / `searchParams` / `cookies()` are async; `middleware.ts` is now `proxy.ts`.

## Credentials
Owner supplies these after the build (see `.env.example`). Setup steps are in `status.md`. Do not invent or hardcode keys.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
