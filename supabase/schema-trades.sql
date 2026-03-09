-- Trade proposals between users.
-- Run after schema-auth.sql (profiles, inventory with user_id).
-- from_items: what proposer offers. to_items: what proposer wants from recipient.
-- Both are jsonb: [{card_id, quantity}, ...]

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  from_items jsonb not null default '[]'::jsonb,
  to_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_no_self check (from_user_id != to_user_id)
);

create index if not exists trades_from_user_id_idx on public.trades(from_user_id);
create index if not exists trades_to_user_id_idx on public.trades(to_user_id);
create index if not exists trades_status_idx on public.trades(status);

drop trigger if exists trades_updated_at on public.trades;
create trigger trades_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

alter table public.trades enable row level security;

-- Users can read trades they're involved in (as sender or recipient)
create policy "Users can read own trades"
  on public.trades for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Users can insert trades where they are the sender
create policy "Users can create trades as sender"
  on public.trades for insert
  with check (auth.uid() = from_user_id);

-- Recipients can update (accept/reject) trades sent to them
create policy "Recipients can update trades"
  on public.trades for update
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);
