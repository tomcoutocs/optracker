-- Decks for deck builder. Run after schema.sql and schema-cards.sql.
-- No user_id for now (single-user / anon); add user_id and RLS when auth is used.

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled Deck',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists decks_updated_at on public.decks;
create trigger decks_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

create table if not exists public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  card_id text not null,
  quantity integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now(),
  unique(deck_id, card_id)
);

create index if not exists deck_cards_deck_id_idx on public.deck_cards(deck_id);

alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;

drop policy if exists "Allow all decks" on public.decks;
create policy "Allow all decks" on public.decks for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow all deck_cards" on public.deck_cards;
create policy "Allow all deck_cards" on public.deck_cards for all to anon, authenticated using (true) with check (true);
