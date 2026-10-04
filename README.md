# Ego Olisa Enterprises

E-commerce site for Ego Olisa Enterprises, a seller of cars, SUVs, motorcycles and bicycles (HNG15 Lesson 2, Task 1). Black and gold theme, prices in NGN.

## Features

- Storefront: home, shop with category filter, product pages, cart, checkout, order tracking, order history
- Server-validated checkout: prices are always re-read from the database, and stock is decremented atomically
- Three payment methods: Paystack (card/online), bank transfer, pay on delivery
- Google sign-in through Supabase Auth (guest checkout also works)
- Order confirmation emails through Mailgun
- Viewing bookings: pick a date and hourly slot, optional NGN 20,000 inspection fee via Paystack, held as pending until approved
- Landing pages (home with 3D vehicle carousel, about, gallery, contact) and a filterable storefront

## Stack

Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS v4, Supabase (Postgres + Auth), Mailgun, Paystack, Zod.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With no credentials the site shows the bundled catalogue from `src/lib/catalog.json`, but checkout is disabled because orders need the database.

### Environment variables

Copy `.env.example` to `.env.local` and fill in what you need:

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Redirect and callback URLs (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Database, orders and auth |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`, `MAILGUN_API_BASE`, `SHOP_OWNER_EMAIL` | Order emails |
| `PAYSTACK_SECRET_KEY` | Paystack payments (the option hides itself when unset) |
| `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER` | Bank-transfer details in the email |
| `INSPECTION_FEE_KOBO`, `BOOKING_SLOT_CAPACITY` | Viewing bookings: fee per viewing (default 2000000 = NGN 20,000) and viewings per slot (default 2) |
| `BOOKING_WEBHOOK_SECRET` | Shared secret for the Supabase Database Webhook that emails customers when a booking is confirmed or declined (setup in `status.md`) |
| `NEXT_PUBLIC_CONTACT_PHONE`, `_WHATSAPP`, `_EMAIL`, `_ADDRESS` | Contact details shown on the site (placeholders if blank) |

The secret keys are server-side only. Never commit `.env*` files.

### Supabase

1. Create a project, then run `supabase/schema.sql` followed by `supabase/seed.sql` in the SQL Editor.
2. Copy the project URL, publishable key and secret key (Project Settings, API Keys) into `.env.local`.

### Google sign-in

1. In Google Cloud Console (Google Auth Platform), create an OAuth client of type Web application. Add `http://localhost:3000` as an authorised JavaScript origin and `https://<project-ref>.supabase.co/auth/v1/callback` as the authorised redirect URI. Add the `openid` scope under Data Access.
2. In Supabase, go to Authentication, Providers, Google and paste the client ID and secret.
3. In Supabase, go to Authentication, URL Configuration. Set the Site URL and add `http://localhost:3000/**` (and your production URL) to Redirect URLs.

### Paystack

Use a `sk_test_...` key while developing. The return redirect works on localhost, but the webhook needs a public URL, so use a tunnel (for example `npx ngrok http 3000`) and set the webhook URL in the Paystack dashboard to `https://<host>/api/paystack/webhook`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `node scripts/gen-seed.mjs` | Regenerate `supabase/seed.sql` from `src/lib/catalog.json` |

## Project layout

- `src/app` routes: shop, product, cart, checkout, order, orders, login, `auth/*`, `api/paystack/webhook`
- `src/app/checkout/actions.ts` server action that validates and places orders
- `src/lib` Supabase clients, Paystack, Mailgun, payment settlement, catalogue
- `supabase/` schema, row level security policies, `place_order()` function and seed data

## Status and further reading

`status.md` lists what is done, what has not yet been tested against real services, and known gaps. `AGENTS.md` is the handover guide with conventions for anyone continuing the project.
