-- Ego Olisa Enterprises — database schema.
-- Run in Supabase Dashboard -> SQL Editor (idempotent: safe to re-run).

create extension if not exists "pgcrypto";

-- ---------- products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  category text not null default 'General',
  price_kobo bigint not null check (price_kobo >= 0),    -- NGN in kobo (1 NGN = 100 kobo); bigint because cars exceed int4
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Listing details used by the storefront filters and cards (added after the first draft; safe to re-run).
alter table public.products add column if not exists year integer;
alter table public.products add column if not exists mileage_km integer;
alter table public.products add column if not exists condition text;
alter table public.products add column if not exists cutout_url text;  -- transparent PNG/WebP used in the home-page carousel

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,                         -- human-friendly, e.g. EO-20261002-AB12
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  city text not null,
  state text not null,
  notes text,
  payment_method text not null default 'pay_on_delivery'
    check (payment_method in ('pay_on_delivery','bank_transfer','paystack')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','failed')),
  paid_at timestamptz,
  paystack_reference text unique,                         -- reference of the latest Paystack attempt
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  total_kobo bigint not null check (total_kobo >= 0),
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_email_idx on public.orders(customer_email);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,                                     -- snapshot at purchase time
  unit_price_kobo bigint not null check (unit_price_kobo >= 0),
  quantity integer not null check (quantity > 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------- row level security ----------
-- Writes to orders/order_items happen server-side with the service-role key
-- (which bypasses RLS) so prices are validated on the server, never the client.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "products are public" on public.products;
create policy "products are public" on public.products
  for select using (active = true);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ---------- atomic order placement ----------
-- Locks product rows, checks stock, decrements it and inserts the order in one
-- transaction. Called from the server with the service-role key only.
drop function if exists public.place_order(uuid,text,text,text,text,text,text,text,text,jsonb);
create or replace function public.place_order(
  p_user_id uuid, p_name text, p_email text, p_phone text, p_address text,
  p_city text, p_state text, p_notes text, p_reference text, p_payment_method text,
  p_items jsonb  -- [{ "product_id": "...", "quantity": 2 }]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_total bigint := 0;
  v_item jsonb;
  v_prod public.products;
  v_qty integer;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  insert into public.orders(reference, user_id, customer_name, customer_email, customer_phone,
                            shipping_address, city, state, notes, payment_method, total_kobo)
  values (p_reference, p_user_id, p_name, p_email, p_phone, p_address, p_city, p_state, p_notes,
          p_payment_method, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid and active = true for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND:%', v_item->>'product_id'; end if;
    if v_prod.stock < v_qty then raise exception 'OUT_OF_STOCK:%', v_prod.name; end if;

    update public.products set stock = stock - v_qty where id = v_prod.id;
    insert into public.order_items(order_id, product_id, name, unit_price_kobo, quantity)
      values (v_order_id, v_prod.id, v_prod.name, v_prod.price_kobo, v_qty);
    v_total := v_total + v_prod.price_kobo * v_qty;
  end loop;

  update public.orders set total_kobo = v_total where id = v_order_id;
  return v_order_id;
end $$;

-- Cancels an unpaid pending order and returns its stock (used when a payment
-- could not be started). No-op for anything else.
create or replace function public.cancel_order(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set status = 'cancelled'
    where id = p_order_id and status = 'pending' and payment_status = 'unpaid';
  if not found then return false; end if;
  update public.products p set stock = p.stock + i.quantity
    from public.order_items i where i.order_id = p_order_id and i.product_id = p.id;
  return true;
end $$;

revoke all on function public.place_order from public, anon, authenticated;
revoke all on function public.cancel_order from public, anon, authenticated;
grant execute on function public.place_order to service_role;
grant execute on function public.cancel_order to service_role;

-- ---------- listing media (extra photos / videos per vehicle) ----------
-- The storefront shows products.image_url first, then these in sort order. Upload files to a Supabase
-- Storage bucket (public) and insert rows here until the admin area exists.
create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image','video')),
  url text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listing_media_product_idx on public.listing_media(product_id, sort);
alter table public.listing_media enable row level security;
drop policy if exists "listing media is public" on public.listing_media;
create policy "listing media is public" on public.listing_media for select using (true);

-- ---------- viewing bookings ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,                          -- e.g. BK-20261005-AB12
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,                              -- snapshot
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  slot_start timestamptz not null,                         -- start of a 1-hour viewing slot (Lagos time, UTC+1)
  notes text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','declined','cancelled','completed')),
  fee_kobo bigint not null default 0 check (fee_kobo >= 0), -- inspection fee
  fee_option text not null default 'at_viewing' check (fee_option in ('pay_now','at_viewing')),
  fee_status text not null default 'unpaid' check (fee_status in ('unpaid','paid')),
  paystack_reference text unique,
  paid_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bookings_slot_idx on public.bookings(slot_start);
create index if not exists bookings_user_idx on public.bookings(user_id);
alter table public.bookings enable row level security;
drop policy if exists "users read own bookings" on public.bookings;
create policy "users read own bookings" on public.bookings for select using (auth.uid() = user_id);

-- Creates a booking unless the slot already holds p_capacity active (pending/confirmed) bookings.
-- Pending bookings hold their slot until an admin declines or cancels them.
drop function if exists public.place_booking(uuid,uuid,text,text,text,timestamptz,text,text,bigint,text,integer);
create or replace function public.place_booking(
  p_user_id uuid, p_product_id uuid, p_name text, p_email text, p_phone text,
  p_slot timestamptz, p_notes text, p_reference text, p_fee_kobo bigint, p_fee_option text,
  p_capacity integer
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_product_name text;
begin
  perform pg_advisory_xact_lock(hashtext('booking:' || p_slot::text));
  if (select count(*) from public.bookings where slot_start = p_slot and status in ('pending','confirmed')) >= p_capacity then
    raise exception 'SLOT_FULL';
  end if;
  select name into v_product_name from public.products where id = p_product_id;
  if v_product_name is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  insert into public.bookings(reference, user_id, product_id, product_name, customer_name, customer_email,
                              customer_phone, slot_start, notes, fee_kobo, fee_option)
  values (p_reference, p_user_id, p_product_id, v_product_name, p_name, p_email, p_phone, p_slot, p_notes,
          p_fee_kobo, p_fee_option)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.place_booking from public, anon, authenticated;
grant execute on function public.place_booking to service_role;

-- ---------- booking status emails ----------
-- The app emails the customer when a booking becomes confirmed / declined / cancelled. Until the admin area
-- exists, staff change `status` in the table editor; a Database Webhook tells the app to send the email:
--   Dashboard -> Database -> Webhooks -> Create: table `bookings`, event `Update`, type HTTP Request,
--   method POST, URL https://<your-domain>/api/bookings/status,
--   HTTP header  x-webhook-secret: <same value as BOOKING_WEBHOOK_SECRET in the app's env>.
alter table public.bookings add column if not exists status_notified text;  -- last status the customer was emailed about
