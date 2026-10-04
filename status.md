# status.md

Last updated: 2026-10-02 (second pass). Branch: `main`.
Deadline: Friday 11:59 PM WAT.

## Client demo redesign (2026-10-04, in progress)
The project is now a demo for a real client (scope of work: landing site, storefront, viewing bookings). Redesign in phases.

Phase 1 done (uncommitted at time of writing):
- New design system: Archivo (variable width/weight) for display, Inter for body; flat gold accent, off-white "paper" sections, pill buttons. Tokens in `src/app/globals.css`.
- Route groups: `src/app/(site)` = full-bleed landing pages (home now); `src/app/(shop)` = inner pages in a centred container (shop, product, cart, checkout, order(s), login). URLs unchanged.
- Home page: blurred gold "EGO OLISA" behind a 3D coverflow carousel of background-removed vehicles (`src/components/VehicleCarousel.tsx`: drag/swipe, arrows, keys, dots, autoplay, honours reduced motion), category tiles, "why", latest arrivals, photo band, how-it-works, FAQ, closing CTA. Header/footer/mobile menu restyled; nav list lives in `src/lib/nav.ts`.
- Catalogue (`src/lib/catalog.json`) rewritten to match the 13 stock photos; new fields `year`, `mileage_km`, `condition`, `image`, `cutout`. **Names, years, mileage and prices are invented placeholders**; models were identified from the photos by eye and are unverified. Schema gained `year`, `mileage_km`, `condition`, `cutout_url` columns; `seed.sql` regenerated.
- Image pipeline: `assets-originals/` (untouched downloads, read-only) -> `scripts/process-images.mjs` -> `public/vehicles/*.jpg`; `assets-cutouts/` (remove.bg PNGs) -> `scripts/process-cutouts.mjs` -> `public/vehicles/cutouts/*.webp`. Credits in `public/vehicles/CREDITS.md`. BMW and red sedan have no cutout yet; the Bajaj Boxer cutout is not used (cluttered source photo).
- **To see this against a real Supabase project, re-run `supabase/schema.sql` then `supabase/seed.sql`.** Until the seed is re-run the DB still holds the old rows (no cutouts), so the home carousel is empty. With Supabase env vars unset the site uses the bundled catalogue.

Phase 2 done (2026-10-04, uncommitted at time of writing; type-checks, all routes return 200 with Supabase off, layouts checked at 1440px and 375px):
- Every page redesigned: shop (category pills + price / year / sort filters in the URL, `src/components/FilterBar.tsx`), product (gallery with photos and videos, spec grid, Book a viewing + Add to cart, related vehicles), cart, checkout, order, orders (now also lists viewings), login. New pages: About, Gallery (lightbox), Contact (form -> Mailgun to `SHOP_OWNER_EMAIL`, honeypot field). Header has a "Book a viewing" button.
- **Viewing bookings**: `/book` (vehicle -> date and hourly slot -> details -> inspection fee), `/booking/[reference]` status page, `src/lib/booking.ts` (slot rules), `src/lib/bookings.ts` (availability, email, fee settlement), `src/app/(shop)/book/actions.ts`. Mon-Sat, 9:00-16:00 hourly start times, Lagos time, bookable from 12 hours ahead up to 14 days out, 2 viewings per slot (`BOOKING_SLOT_CAPACITY`). Bookings start `pending` and hold their slot. DB: `bookings` table + atomic `place_booking()` (advisory lock, capacity check) in `supabase/schema.sql`.
- **Inspection fee: NGN 20,000** (`INSPECTION_FEE_KOBO`, default 2000000; 0 = no fee). Customer chooses pay now (Paystack, references start `BK-`, verified server-side, webhook handles both orders and bookings) or pay at the viewing. The confirmation email for a pay-now booking is sent when the payment verifies.
- Media: `listing_media` table (extra photos/videos per vehicle, public read) is shown on the product page. There is no upload UI yet (no admin): add rows by hand in Supabase.
- SEO: per-page titles and descriptions, `sitemap.xml`, `robots.txt`. Still to do: submit to Google Search Console after deploy.

**Not tested against a real database or services**: `place_booking()` and the `bookings` / `listing_media` SQL have never run on Postgres; the booking and contact server actions only had their "Supabase missing" error path exercised; Paystack for bookings and the new emails are untested. Re-run `supabase/schema.sql` and `seed.sql`, then place a test booking (with and without paying the fee) and check the `bookings` row, the email and the status page.

Decisions / gaps to confirm with the client:
- No admin yet, so a booking is approved by changing `status` to `confirmed` / `declined` / `cancelled` in the Supabase table editor. **The customer is emailed automatically** via a Supabase Database Webhook: Dashboard -> Database -> Webhooks -> create one on table `bookings`, event Update, HTTP Request POST to `https://<domain>/api/bookings/status`, with header `x-webhook-secret` = the `BOOKING_WEBHOOK_SECRET` env var (route: `src/app/api/bookings/status/route.ts`). Each status is emailed once (`bookings.status_notified`), a failed send returns 500 so the webhook retries, and the status is re-read from the DB. The route auth and request handling were tested locally; the email templates and the webhook itself were not.
- Inspection fee payment options (2026-10-04): Paystack (only when `PAYSTACK_SECRET_KEY` is set), **bank transfer now** (customer is shown / emailed the `BANK_*` account details and uses the booking reference), or pay at the viewing. Bank-transfer fees stay `fee_status = unpaid` until staff set it to `paid` in the table editor (no email is sent for that yet). The booking page also offers "Pay online" to anyone with an unpaid fee when Paystack is configured. Run the latest `schema.sql` (it widens the `fee_option` check). Untested against a real database.
- Fee policy (decided 2026-10-04): the inspection fee is **non-refundable**. Shown on the booking form, product page, booking page, home FAQ and booking emails (`FEE_POLICY` in `src/lib/site.ts`). Open question: if the shop itself declines a booking after the customer paid, the decline email only says to reply about payment; decide what happens then.
- Contact details (phone, WhatsApp, email, address, opening hours) are placeholders in `src/lib/site.ts`; override with the `NEXT_PUBLIC_CONTACT_*` env vars. Set `SHOP_OWNER_EMAIL` or the contact form reports "not connected".
- About, FAQ and "why us" copy is generic wording, not the client's. Opening hours and slot times (Mon-Sat 9-5) are assumptions.
- Opening hours Mon-Sat 9:00-5:00 and hourly slots 9:00-16:00 confirmed 2026-10-04. Slots are global (not per vehicle) with capacity 2; confirm how the showroom actually works.

Not started: admin area (content, listings, categories, uploads, booking approval); client logo/brand assets (none supplied, header uses a text wordmark); subdomain split (www vs shop; currently one app, `/` is the landing site and `/shop` the store); the remaining cut-outs (BMW, red sedan).

## Done (code complete, builds clean, all routes return 200 locally without credentials)
- Black & gold storefront: home, `/shop` (category filter), `/product/[slug]`, `/cart`, `/checkout`, `/order/[reference]`, `/orders`, `/login`
- Cart (localStorage), server-validated checkout, atomic stock decrement via `place_order()` SQL function
- Supabase schema + RLS + seed (`supabase/`)
- Google sign-in wired through Supabase Auth (guest checkout also allowed)
- **Paystack** as a third payment option (alongside bank transfer and pay on delivery): hosted checkout redirect, server-side verification, signed webhook, "Pay now" retry for abandoned payments, stock released if payment cannot be started
- Catalogue switched to vehicles (cars, SUVs, motorcycles, bicycles); DB money columns are `bigint`
- Order emails restyled (black/gold, per-payment-method block); previewed as rendered screenshots, not tested in real mail clients
- Mailgun confirmation email (HTML + text, optional BCC to owner) after a successful order
- `AGENTS.md`, `.env.example`

## Not yet verified (needs the owner's credentials)
Nothing below has been tested against real services. I could not create the accounts, and I have not seen a live order, login or email work end to end.
1. Supabase connection and `place_order()` RPC (the SQL has not been run against a real Postgres)
2. Google OAuth round trip
3. Mailgun delivery
4. Paystack: initialize, redirect, return, webhook. **Docs now read and compared (2026-10-02)**, see "Paystack docs review" below. Still never run against a real account: test with a `sk_test_...` key.

## Paystack docs review (2026-10-02)
Read https://paystack.com/docs/api/transaction/ and https://paystack.com/docs/payments/webhooks/ and compared with `src/lib/paystack.ts`, `src/lib/payments.ts`, the webhook route and `src/app/checkout/actions.ts`.

Matches the docs:
- `POST /transaction/initialize` and `GET /transaction/verify/:reference` on `https://api.paystack.co`, `Authorization: Bearer <secret>`, JSON body.
- `data.authorization_url` in the initialize response; `data.status === "success"`, `data.amount`, `data.currency` in verify.
- Amount in subunit (kobo). Our references (`EO-YYYYMMDD-XXXX`, retries `...-R1-xxxx`) only use alphanumerics and `-`, which the docs allow (`-`, `.`, `=`, alphanumeric).
- Webhook: `x-paystack-signature` = HMAC-SHA512 of the raw body with the secret key, hex; event `charge.success`; we return 200. IP allowlist in docs (52.31.139.75, 52.49.173.169, 52.214.14.220) is optional; we rely on the signature.

Changed:
- `amount` is documented as a string; we sent a number. Now `String(amountKobo)`.
- `metadata` is documented as a *stringified* JSON object; we were sending an object. Now `JSON.stringify`'d.
- Amount check now compares the order total with `requested_amount` (falls back to `amount`). The verify sample shows `amount` (40333) can differ from `requested_amount` (30050) when fees are passed to the customer, and strict equality on `amount` would then reject a genuine payment. **Assumption**: `requested_amount` is what we sent in initialize; confirm with a test transaction.

Left as is, worth knowing:
- Webhook retries only happen on non-200. We always return 200 after a valid signature, so if `settlePaystackPayment` fails transiently (e.g. verify call times out) Paystack will not retry; the order page re-verifies when the customer returns, which is the backstop.
- "Pay now" retry overwrites `orders.paystack_reference`. A webhook for the *earlier* attempt's reference would not find the order. Rare (customer pays the first tab after starting a second); would need a table of attempts to fix.
- Docs say test-mode webhooks need a public URL (localhost cannot receive events). Use a tunnel.

## Supabase docs review (2026-10-02)
Read the API keys, SSR client and Sign in with Google guides. Nothing run yet.

Matches the docs: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` naming; secret key only used server-side (`admin.ts` is `server-only`); PKCE flow with `exchangeCodeForSession` in `/auth/callback`; `redirectTo` pointing at that route; `next` param restricted to relative paths; `proxy.ts` is the right file name for Next 16; RLS enabled on all three tables; `place_order`/`cancel_order` granted to `service_role` only.

Changed:
- `proxy.ts` called `auth.getUser()` (a network call on every request). Docs say to use `auth.getClaims()` in the proxy. Switched.
- `/auth/callback` now honours `x-forwarded-host` outside development, as in the docs' example, so the post-login redirect lands on the public host when deployed behind a load balancer.

Notes for setup (docs):
- Supabase says legacy `anon`/`service_role` keys are being deprecated by the end of 2026; both key systems work side by side until you disable the legacy ones. The new secret key is rejected if the request looks like it comes from a browser (User-Agent check); our use is server-side Node, so it should be fine, but confirm on the first order.
- Google Cloud Console is now the "Google Auth Platform": in Clients create an OAuth client (Web application), add **Authorized JavaScript origins** (`http://localhost:3000` for dev, the production origin) as well as the Authorized redirect URI (`https://<project-ref>.supabase.co/auth/v1/callback`). Under Data Access add the `openid` scope manually (email and profile are default).
- Table grants are checked before RLS. Tables made in the SQL editor normally get the default grants; if you see "permission denied" rather than empty results, check grants.

## Setup steps for the owner (in this order)
1. **Supabase**: create a project. SQL Editor: run `supabase/schema.sql`, then `supabase/seed.sql`. Copy Project URL, the **publishable key** (`sb_publishable_...`) and **secret key** (`sb_secret_...`) from Project Settings -> API Keys into `.env.local` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (see `.env.example`). The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` names still work as fallbacks (changed 2026-10-02; not yet type-checked or run).
2. **Google**: Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web). Authorised JavaScript origins: `http://localhost:3000` (and the production URL). Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Add the `openid` scope under Data Access. Then Supabase → Authentication → Providers → Google: paste client ID and secret. Supabase → Authentication → URL Configuration: set Site URL and add `http://localhost:3000/**` and the production URL to Redirect URLs.
3. **Mailgun**: add and verify a sending domain (or use the sandbox domain, which only delivers to authorised recipients). Set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`; use `MAILGUN_API_BASE=https://api.eu.mailgun.net` for EU accounts.
4. **Paystack**: Dashboard -> Settings -> API Keys & Webhooks. Put the secret key in `PAYSTACK_SECRET_KEY`. Set the Webhook URL to `https://<your-domain>/api/paystack/webhook` (needs a public URL; use a tunnel for local testing). Optionally set `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER` for the bank-transfer email.
5. `npm run dev`, place a test order, confirm: row in `orders` / `order_items`, stock decremented, email received, order visible under `/orders` when signed in.
6. Deploy (Vercel is the obvious choice for Next.js): set the same env vars, set `NEXT_PUBLIC_SITE_URL`, add the deployed URL to Supabase redirect URLs.

## Assumptions to review (I guessed these)
- **Catalogue is placeholder**: vehicles, models, years and prices are invented; replace with real stock and photos. Edit `src/lib/catalog.json`, then `node scripts/gen-seed.mjs`.
- Vehicle prices are tens of millions of naira. Paystack may cap or flag transactions of that size depending on channel and account limits (I do not know the current limits; check with Paystack). A deposit or reservation-fee flow may suit cars better than full payment online.
- Product images are generated monogram placeholders; `products.image_url` is supported for real photos.
- Guest checkout is allowed; the order page is reachable by reference without login.
- Shop details ("Lagos, Nigeria" in the footer and emails, email tagline) are filler, so please correct.

## Known gaps / next steps
- Abandoned Paystack checkouts keep their stock reserved until paid; there is no automatic expiry yet (`cancel_order()` exists in SQL to build one on).
- `supabase/schema.sql` changed after the first draft (bigint, payment columns, new `place_order` signature): run the current file on a fresh project.
- No admin UI; manage products and order status in the Supabase dashboard.
- No order-status emails (only the confirmation).
- No automated tests.
- Order page access is by reference only; consider a signed token if orders hold sensitive data.
- Orders cannot be placed without Supabase env vars; without them the site shows the bundled catalogue but checkout returns an explanatory error.
