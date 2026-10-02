# status.md

Last updated: 2026-10-02 (second pass). Branch: `claude/ego-olisa-shop-website-307fnh`.
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
4. Paystack: initialize, redirect, return, webhook. **I could not read Paystack's docs** (paystack.com is blocked by this sandbox's network policy), so `src/lib/paystack.ts` is written from a web-search summary plus my memory of the API (`POST /transaction/initialize`, `GET /transaction/verify/:ref`, HMAC-SHA512 `x-paystack-signature`, event `charge.success`). Please check it against https://paystack.com/docs/api/ before relying on it. Test with a `sk_test_...` key.

## Setup steps for the owner (in this order)
1. **Supabase**: create a project. SQL Editor: run `supabase/schema.sql`, then `supabase/seed.sql`. Copy Project URL, anon key and service-role key into `.env.local` (see `.env.example`).
2. **Google**: Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web). Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Then Supabase → Authentication → Providers → Google: paste client ID and secret. Supabase → Authentication → URL Configuration: set Site URL and add `http://localhost:3000/**` and the production URL to Redirect URLs.
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
