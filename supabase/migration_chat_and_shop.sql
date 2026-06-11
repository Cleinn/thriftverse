-- ============================================================
-- ThriftVerse migration: Shop Name + Realtime Chat support
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1) Shop name must live in a PUBLICLY READABLE table (profiles),
--    not in auth user_metadata (which other users cannot read).
alter table public.profiles
  add column if not exists shop_name text;

-- 2) Make sure realtime is enabled for chat tables
--    (Database -> Replication also works; this is the SQL form)
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;
end $$;

-- 3) RLS policies (idempotent) so buyer & seller can both read/write
--    their own conversations + messages
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "participants can read conversations" on public.conversations;
create policy "participants can read conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "buyer can start conversation" on public.conversations;
create policy "buyer can start conversation"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "participants can update conversations" on public.conversations;
create policy "participants can update conversations"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "participants can read messages" on public.messages;
create policy "participants can read messages"
  on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));

drop policy if exists "participants can send messages" on public.messages;
create policy "participants can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
