# Improvements Log

Tracks each improvement from the full-app review. Entries are logged as work is completed.

| # | Improvement | Status | Completed |
|---|-------------|--------|-----------|
| 1 | `IMPROVEMENTS_LOG.md` + `.env.example` | Done | 2026-06-28 |
| 2 | Lock sync endpoint (require `CRON_SECRET` in production) | Done | 2026-06-28 |
| 3 | Catalog write RLS lockdown SQL migration | Done | 2026-06-28 |
| 4 | Trade inventory validation on create | Done | 2026-06-28 |
| 5 | Transactional trade accept (DB function `execute_trade_swap`) | Done | 2026-06-28 |
| 6 | Trade cancel (sender) + counter-offer flow | Done | 2026-06-28 |
| 7 | Fix `AddCardModal` close-on-success only | Done | 2026-06-28 |
| 8 | Header: skip `useTrades` when logged out | Done | 2026-06-28 |
| 9 | Secure `/api/decks/[id]/view` with auth | Done | 2026-06-28 |
| 10 | Browse pagination (48 per page + load more) | Done | 2026-06-28 |
| 11 | Collections: hide empty sets | Done | 2026-06-28 |
| 12 | Deck list API: filter `deck_cards` by deck IDs | Done | 2026-06-28 |
| 13 | Profile page: pass inventory to grid (no double fetch) | Done | 2026-06-28 |
| 14 | Mobile nav (hamburger menu on small screens) | Done | 2026-06-28 |
| 15 | `InventoryTable` horizontal scroll wrapper | Done | 2026-06-28 |
| 16 | Trade page responsive grid columns | Done | 2026-06-28 |
| 17 | Single active deck when starring | Done | 2026-06-28 |
| 18 | Card detail page `/cards/[id]` | Done | 2026-06-28 |
| 19 | Wishlist (schema + API + card page toggle) | Done | 2026-06-28 |
| 20 | Deck OP TCG legality hints | Done | 2026-06-28 |
| 21 | Profile username editing | Done | 2026-06-28 |
| 22 | Light/dark theme toggle | Done | 2026-06-28 |
| 23 | Sync status API + browse footer | Done | 2026-06-28 |
| 24 | Trade empty states (incoming/outgoing) | Done | 2026-06-28 |
| 25 | Guest read-only browse on landing | Done | 2026-06-28 |
| 26 | `SETUP.md` + README update | Done | 2026-06-28 |
| 27 | ESLint config (`.eslintrc.json`) | Done | 2026-06-28 |
| 28 | Inventory auth race fix (`useAuthUser`, scoped query key) | Done | 2026-06-28 |
| 29 | `/api/inventory` + POST card batch + inventory empty/login states | Done | 2026-06-28 |

**Next work:** see [`IMPROVEMENTS_BACKLOG.md`](IMPROVEMENTS_BACKLOG.md).

## Supabase migrations to run (if not already)

Run in SQL Editor after existing schema:

1. `supabase/schema-trades-cancel-counter.sql`
2. `supabase/schema-catalog-write-lockdown.sql`
3. `supabase/schema-sync-meta.sql`
4. `supabase/schema-wishlist.sql`

See `SETUP.md` for the full ordered list.

## Key files added

- `src/lib/trade-validation.ts` — shared trade inventory checks
- `src/lib/deck-legality.ts` — OP TCG deck rules (simplified)
- `src/app/api/sync-status/route.ts`
- `src/app/api/wishlist/route.ts`
- `src/app/cards/[id]/page.tsx`
- `src/components/GuestBrowseView.tsx`
- `src/hooks/useAuthUser.ts`
- `src/app/api/inventory/route.ts`
