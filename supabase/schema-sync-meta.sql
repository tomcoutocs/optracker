-- Sync metadata for "last updated" display and admin visibility.
-- Run after schema-cards.sql.

create table if not exists public.sync_meta (
  id integer primary key default 1 check (id = 1),
  last_sync_at timestamptz,
  cards_count integer not null default 0,
  episodes_count integer not null default 0,
  source text,
  constraint sync_meta_single_row check (id = 1)
);

alter table public.sync_meta enable row level security;

drop policy if exists "Anyone can read sync meta" on public.sync_meta;
create policy "Anyone can read sync meta"
  on public.sync_meta for select to anon, authenticated using (true);

insert into public.sync_meta (id, last_sync_at, cards_count, episodes_count)
values (1, null, 0, 0)
on conflict (id) do nothing;
