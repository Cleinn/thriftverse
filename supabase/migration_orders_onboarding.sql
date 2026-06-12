-- ============================================================
-- ThriftVerse migration 2: Orders routing + Seller onboarding
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- ============================================================

-- ---------- 1) Shop profile columns (onboarding data) ----------
alter table public.profiles
  add column if not exists shop_name text,
  add column if not exists shop_description text,
  add column if not exists shop_contact text;

-- Profiles must be readable by everyone (buyers need shop_name in
-- product pages & chat). Without this, the UI falls back to "Penjual".
alter table public.profiles enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------- 2) Orders: extend the existing `transactions` table ----------
-- Existing columns: id, buyer_id, seller_id, product_id, status, created_at
alter table public.transactions
  add column if not exists product_title text,
  add column if not exists product_image text,
  add column if not exists quantity int default 1,
  add column if not exists price numeric default 0,
  add column if not exists total numeric default 0,
  add column if not exists shipping_method text,
  add column if not exists payment_method text,
  add column if not exists shipping_address jsonb,
  add column if not exists note text;

-- Relational integrity: Order -> Product -> Seller
-- (skip silently if FKs already exist)
do $$
begin
  begin
    alter table public.transactions
      add constraint transactions_product_id_fkey
      foreign key (product_id) references public.products(id);
  exception when duplicate_object then null;
  end;
end $$;

create index if not exists idx_transactions_seller on public.transactions (seller_id, created_at desc);
create index if not exists idx_transactions_buyer  on public.transactions (buyer_id,  created_at desc);

-- ---------- 3) RLS: sellers see ONLY their own sales ----------
alter table public.transactions enable row level security;

drop policy if exists "buyer creates own order" on public.transactions;
create policy "buyer creates own order"
  on public.transactions for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "participants read own orders" on public.transactions;
create policy "participants read own orders"
  on public.transactions for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "seller updates order status" on public.transactions;
create policy "seller updates order status"
  on public.transactions for update
  using (auth.uid() = seller_id);

-- ---------- 4) Realtime: new orders appear instantly in dashboard ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.transactions;
  exception when duplicate_object then null;
  end;
end $$;
