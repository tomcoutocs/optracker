-- Wishlist: cards a user wants to acquire.
-- Run after schema-auth.sql.

create table if not exists public.wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index if not exists wishlist_user_id_idx on public.wishlist(user_id);

alter table public.wishlist enable row level security;

drop policy if exists "Users read own wishlist" on public.wishlist;
create policy "Users read own wishlist"
  on public.wishlist for select using (auth.uid() = user_id);

drop policy if exists "Users manage own wishlist" on public.wishlist;
create policy "Users manage own wishlist"
  on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
