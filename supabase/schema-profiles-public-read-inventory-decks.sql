-- Allow authenticated users to read other users' inventory and decks (for viewing profiles).
-- Run after schema-auth.sql.
-- INSERT/UPDATE/DELETE remain restricted to own data.

drop policy if exists "Authenticated users can read inventory" on public.inventory;
create policy "Authenticated users can read inventory"
  on public.inventory for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read decks" on public.decks;
create policy "Authenticated users can read decks"
  on public.decks for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read deck_cards" on public.deck_cards;
create policy "Authenticated users can read deck_cards"
  on public.deck_cards for select using (auth.role() = 'authenticated');
