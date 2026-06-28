# OP Tracker — Supabase setup

Run these SQL files in the Supabase SQL Editor **in order**. Skipping or reordering can break RLS or foreign keys.

## 1. Core tables

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase/schema.sql` | `inventory` table (legacy; superseded by auth-scoped RLS) |
| 2 | `supabase/schema-cards.sql` | `cards`, `episodes`, filter RPCs |
| 3 | `supabase/schema-decks.sql` | `decks`, `deck_cards` |
| 4 | `supabase/schema-decks-active.sql` | `is_active` on decks |
| 5 | `supabase/schema-auth.sql` | `profiles`, user-scoped inventory/decks RLS |
| 6 | `supabase/schema-profiles-public.sql` | Authenticated users can read profiles |
| 7 | `supabase/schema-inventory-user-scoped.sql` **OR** `schema-profiles-public-read-inventory-decks.sql` | Pick one visibility model (see README) |
| 8 | `supabase/schema-profile-edit-only-own.sql` | Profile update restricted to owner |
| 9 | `supabase/schema-profile-avatar.sql` | `avatar_url`, storage bucket |
| 10 | `supabase/schema-trades.sql` | Trade proposals |
| 11 | `supabase/schema-trades-cancel-counter.sql` | Cancel/counter statuses + transactional swap RPC |
| 12 | `supabase/schema-catalog-write-lockdown.sql` | Remove anon write on catalog |
| 13 | `supabase/schema-sync-meta.sql` | Last sync timestamp table |
| 14 | `supabase/schema-wishlist.sql` | Wishlist table |

## 2. Auth

1. Enable **Email** provider in Authentication → Providers.
2. Configure site URL and redirect URLs for your domain (and `http://localhost:3000` for dev).

## 3. Environment variables

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for trades, cross-user profiles, deck view API)
- `CRON_SECRET` (required in production for `/api/sync-cards`)
- `RAPIDAPI_KEY` (optional; OPTCG fallback if unset)
- `DISCORD_BOT_SECRET` (optional; for Optrackman bot)

## 4. Initial card sync

```bash
curl -X POST http://localhost:3000/api/sync-cards \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or without `CRON_SECRET` in local dev:

```bash
curl -X POST http://localhost:3000/api/sync-cards
```

## 5. Vercel cron

`vercel.json` schedules daily sync. Set `CRON_SECRET` in Vercel env vars before deploying.
