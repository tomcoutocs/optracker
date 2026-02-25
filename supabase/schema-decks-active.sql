-- Add is_active to decks. Run after schema-decks.sql.
-- When a deck is active, its cards show as "in deck" in inventory with a link.

alter table public.decks add column if not exists is_active boolean not null default false;
