-- Cards and episodes tables: store synced data from One Piece API.
-- Run after the main schema.sql (inventory table).
-- Sync job runs once per day and upserts into these tables.

-- Episodes/sets from the API (synced with cards)
create table if not exists public.episodes (
  id integer primary key,
  code text not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Cards from the API (synced daily)
create table if not exists public.cards (
  id text primary key,
  name text not null,
  name_numbered text,
  slug text,
  type text,
  card_number text not null,
  rarity text not null,
  color text not null,
  image text,
  episode_id integer references public.episodes(id) on delete set null,
  episode_code text,
  episode_name text,
  market_price numeric(10, 2),
  inventory_price numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_episode_id_idx on public.cards(episode_id);
create index if not exists cards_rarity_idx on public.cards(rarity);
create index if not exists cards_color_idx on public.cards(color);
create index if not exists cards_name_lower_idx on public.cards(lower(name));

-- Updated_at trigger for cards
drop trigger if exists cards_updated_at on public.cards;
create trigger cards_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- RLS: allow read for everyone; allow insert/update/delete only from service (sync runs server-side with anon or service role)
alter table public.episodes enable row level security;
alter table public.cards enable row level security;

drop policy if exists "Anyone can read episodes" on public.episodes;
create policy "Anyone can read episodes"
  on public.episodes for select to anon, authenticated using (true);

drop policy if exists "Anyone can read cards" on public.cards;
create policy "Anyone can read cards"
  on public.cards for select to anon, authenticated using (true);

-- Sync job will use service role or a dedicated key; for anon key sync we need write policy.
drop policy if exists "Allow insert and update on episodes for anon" on public.episodes;
create policy "Allow insert and update on episodes for anon"
  on public.episodes for all to anon using (true) with check (true);

drop policy if exists "Allow insert and update on cards for anon" on public.cards;
create policy "Allow insert and update on cards for anon"
  on public.cards for all to anon using (true) with check (true);

-- Distinct filter options (colors, rarities) for browse dropdowns
create or replace function public.get_distinct_card_filters()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'colors', coalesce(
      (select array_agg(c) from (select distinct color as c from cards where color is not null and trim(color) != '' order by c) t),
      array[]::text[]
    ),
    'rarities', coalesce(
      (select array_agg(r) from (select distinct rarity as r from cards where rarity is not null and trim(rarity) != '' order by r) t),
      array[]::text[]
    )
  );
$$;

-- Allow anon/authenticated to call the function
grant execute on function public.get_distinct_card_filters() to anon;
grant execute on function public.get_distinct_card_filters() to authenticated;

-- Card count per episode (for set completion)
create or replace function public.get_episode_card_counts()
returns table(episode_id integer, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.episode_id::integer, count(*)::bigint
  from cards c
  where c.episode_id is not null
  group by c.episode_id
  order by c.episode_id;
$$;
grant execute on function public.get_episode_card_counts() to anon;
grant execute on function public.get_episode_card_counts() to authenticated;

-- Add price columns if upgrading existing DB (no-op if already present)
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS market_price numeric(10, 2);
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS inventory_price numeric(10, 2);
