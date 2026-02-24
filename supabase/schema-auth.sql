-- Multi-user auth: profiles, decks.user_id, RLS so each user sees only their data.
-- Run after schema.sql and schema-decks.sql. Enable Auth in Supabase Dashboard first.

-- Profiles: username (and optional display) for auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_unique unique (username)
);

create index if not exists profiles_username_idx on public.profiles(username);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create profile on signup (username from raw_user_meta_data).
-- Username must be unique; we check before insert and raise a clear error.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  chosen_username text;
begin
  chosen_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );
  if exists (select 1 from public.profiles where username = chosen_username) then
    raise exception 'Username already taken' using errcode = 'unique_violation';
  end if;
  insert into public.profiles (id, username)
  values (new.id, chosen_username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Inventory: restrict to own rows and set user_id on insert
drop policy if exists "Allow all for anon" on public.inventory;
drop policy if exists "Allow all for authenticated" on public.inventory;
drop policy if exists "Users can manage own inventory" on public.inventory;
create policy "Users can manage own inventory"
  on public.inventory for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.inventory_set_user_id()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists inventory_set_user_id on public.inventory;
create trigger inventory_set_user_id
  before insert on public.inventory
  for each row execute function public.inventory_set_user_id();

-- Decks: add user_id and restrict to own rows
alter table public.decks add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists decks_user_id_idx on public.decks(user_id);

drop policy if exists "Allow all decks" on public.decks;
drop policy if exists "Users can manage own decks" on public.decks;
create policy "Users can manage own decks"
  on public.decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.decks_set_user_id()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists decks_set_user_id on public.decks;
create trigger decks_set_user_id
  before insert on public.decks
  for each row execute function public.decks_set_user_id();

-- Deck_cards: allow only if deck belongs to user
drop policy if exists "Allow all deck_cards" on public.deck_cards;
drop policy if exists "Users can manage deck_cards of own decks" on public.deck_cards;
create policy "Users can manage deck_cards of own decks"
  on public.deck_cards for all
  using (
    exists (select 1 from public.decks d where d.id = deck_cards.deck_id and d.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.decks d where d.id = deck_cards.deck_id and d.user_id = auth.uid())
  );

-- Cards/episodes remain readable by all (browse is public).
