-- Restrict inventory, decks, and deck_cards to user-scoped access only.
-- Drops permissive read policies so each user only sees their own data.
-- Profile viewing uses service role (SUPABASE_SERVICE_ROLE_KEY) in the API to fetch other users' data.
-- Run after schema-profiles-public-read-inventory-decks.sql.

drop policy if exists "Authenticated users can read inventory" on public.inventory;
drop policy if exists "Authenticated users can read decks" on public.decks;
drop policy if exists "Authenticated users can read deck_cards" on public.deck_cards;
