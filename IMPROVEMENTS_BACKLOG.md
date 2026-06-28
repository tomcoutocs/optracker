# Improvements Backlog

Next-up work after the June 2026 review. See `IMPROVEMENTS_LOG.md` for what shipped in that batch.

Priority is rough — adjust as needed.

## High — reliability & polish

| # | Item | Why |
|---|------|-----|
| 1 | **Wishlist in Browse** — filter “wishlist only”, heart on grid rows | Schema/API exist; only card detail has toggle today |
| 2 | **Wishlist page** — `/wishlist` or profile section listing wanted cards | No central view of wishlist yet |
| 3 | **Fix ESLint warnings** — `decks/page.tsx` deps, unused vars in trade/profile/Landing | Clean CI / `next build` lint step |
| 4 | **Shared auth hook in Header** — replace duplicate `getUser` with `useAuthUser` | One source of truth for session state |
| 5 | **Error boundaries** — per-route fallback instead of blank screens on chunk errors | Helps when `.next` cache goes stale |

## Medium — UX & features

| # | Item | Why |
|---|------|-----|
| 6 | **Inventory export** — CSV/JSON download of owned cards | Collectors often want a backup |
| 7 | **Collections default when data loads** — smart default view (collections vs search) | Search is default after inventory fixes |
| 8 | **Trade notifications** — badge refresh / optional email when proposal arrives | Trades tab badge exists; no push/email |
| 9 | **Deck builder: missing-card hints** — link to browse filtered to needed cards | Have/need exists; discovery could be smoother |
| 10 | **Card detail: add to inventory** — quantity modal on `/cards/[id]` | Today browse-only add flow |
| 11 | **Public profile URLs** — shareable read-only deck/inventory links without login | Profiles require auth for some API paths |
| 12 | **Sync dashboard** — admin page showing last sync, errors, manual trigger (with secret) | `sync_meta` exists; no UI |

## Medium — security & ops

| # | Item | Why |
|---|------|-----|
| 13 | **Verify `CRON_SECRET` on Vercel** — document in deploy checklist | Sync 401s in prod without it |
| 14 | **Rate limit public APIs** — sync, batch cards, search | Reduce abuse surface |
| 15 | **Audit RLS** — confirm catalog lockdown + inventory scoping in advisors | Post-migration sanity check |

## Lower — quality & scale

| # | Item | Why |
|---|------|-----|
| 16 | **Tests** — smoke tests for inventory API, trade accept, batch cards POST | No automated tests yet |
| 17 | **Typegen** — `supabase gen types` → shared DB types | Hand-rolled types drift over time |
| 18 | **Image CDN / unoptimized strategy** — revisit `next/image` config vs Vercel cost | Currently unoptimized for cost |
| 19 | **Pagination on inventory Search** — virtual scroll or pages for 500+ rows | Fine for ~400 cards; scales poorly |
| 20 | **Figma design system sync** — finish component library in Figma file | Partial MCP work from design refresh |

## Ideas (unscoped)

- Discord bot: link inventory counts from same Supabase project
- Mobile PWA / install prompt
- Price history charts from sync snapshots
- Multi-language card names (OPTCG vs EN)
- Bulk import inventory from CSV

---

_When an item ships, move it to `IMPROVEMENTS_LOG.md` with date and delete or strike from this file._
