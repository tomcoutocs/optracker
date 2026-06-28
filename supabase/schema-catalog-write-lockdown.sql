-- Lock catalog writes to service role only (run after schema-cards.sql).
-- Sync uses SUPABASE_SERVICE_ROLE_KEY on the server.

drop policy if exists "Allow insert and update on episodes for anon" on public.episodes;
drop policy if exists "Allow insert and update on cards for anon" on public.cards;

-- Authenticated users should not mutate catalog either
drop policy if exists "Allow insert and update on episodes for authenticated" on public.episodes;
drop policy if exists "Allow insert and update on cards for authenticated" on public.cards;
