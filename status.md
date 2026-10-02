# status.md

Last updated: 2026-10-02 (second pass). Branch: `main`.
Deadline: Friday 11:59 PM WAT.

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
