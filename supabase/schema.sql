-- One Piece TCG Inventory - Supabase schema
-- Run this in Supabase SQL Editor to create the inventory table and RLS.

-- Table: inventory (user's owned cards; card metadata lives in external API)
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  card_id text not null,
  quantity integer not null default 1 check (quantity >= 0),
  condition text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade
);

-- Optional: if you don't use Supabase Auth yet, drop the user_id FK and use a single-user app
-- alter table public.inventory drop constraint if exists inventory_user_id_fkey;
-- Then add user_id as plain uuid if you want to add auth later.

-- Unique: one row per card when user_id is null; per (user_id, card_id) when user_id is set
create unique index if not exists inventory_user_card_idx
  on public.inventory (card_id) where (user_id is null);
create unique index if not exists inventory_user_card_auth_idx
  on public.inventory (user_id, card_id) where (user_id is not null);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists inventory_updated_at on public.inventory;
create trigger inventory_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- RLS: enable and allow all for now (restrict by user_id when auth is added)
alter table public.inventory enable row level security;

-- Policy: allow all for anon/authenticated (single-user or add auth later)
create policy "Allow all for anon"
  on public.inventory for all
  to anon
  using (true)
  with check (true);

create policy "Allow all for authenticated"
  on public.inventory for all
  to authenticated
  using (true)
  with check (true);

-- Optional: when using auth, replace with user-scoped policy, e.g.:
-- create policy "Users can manage own inventory"
--   on public.inventory for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
