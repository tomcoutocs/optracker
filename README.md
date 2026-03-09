# OP Tracker – One Piece TCG Inventory

Production-quality web app to **browse** all One Piece TCG cards, **add/remove** cards to your inventory, and **filter/search** both the global card list and your inventory.

## Architecture

- **Frontend:** Next.js (App Router), React, Tailwind CSS, TanStack Table, TanStack Query.
- **Backend:** Supabase (Postgres + client SDK only; no custom server).
- **Card data:** Synced once per day from [One Piece API](https://one-piece-api.com/) into Supabase. The app reads cards from your database instead of calling the API on every request.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Supabase**

   - Create a project at [supabase.com](https://supabase.com).
   - Run the schema in the SQL Editor: first `supabase/schema.sql`, then `supabase/schema-cards.sql`.
   - In Project Settings → API, copy the project URL and anon key.

3. **One Piece API (RapidAPI)**

   - Subscribe to [One Piece TCG Prices](https://rapidapi.com/tcggopro/api/one-piece-tcg-prices) (free tier: 100 req/day).
   - Copy your RapidAPI key from the playground.

4. **Environment**

   - Copy `.env.example` to `.env.local`.
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `RAPIDAPI_KEY`.
   - Set `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Dashboard → Project Settings → API → service_role key) to view other users' profiles (inventory, decks). Without it, other users' profiles will show empty.

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

6. **Initial card data (one-time or daily)**

   Cards are read from your Supabase `cards` table. To populate it, run the sync once:

   ```bash
   curl -X POST http://localhost:3000/api/sync-cards
   ```

   Or from another machine (e.g. after deploy), call `POST https://your-app.com/api/sync-cards` with an optional secret:

   - Add `CRON_SECRET=your-secret` to `.env.local` (and your host’s env).
   - Call with header: `Authorization: Bearer your-secret` or `x-cron-secret: your-secret`.

   **Run sync once per day** so the card list stays up to date:

   - **Vercel env for Discord bot:** Add `DISCORD_BOT_SECRET` to your Vercel project’s Environment Variables (Production) so the `/api/discord/card-search` endpoint accepts requests from Optrackman.

- **Vercel (recommended):** The repo includes a cron in `vercel.json` that runs **daily at 5:00 AM EST** (10:00 UTC). To enable it:
     1. In the [Vercel Dashboard](https://vercel.com/dashboard), open your project.
     2. Go to **Settings → Environment Variables**.
     3. Add **CRON_SECRET**: name `CRON_SECRET`, value = a long random string (e.g. from `openssl rand -hex 32`). Add it for Production (and Preview if you want cron in preview).
     4. Redeploy the project (or push a commit) so the cron is active. Vercel will call `GET /api/sync-cards` at 5am EST and send `Authorization: Bearer <CRON_SECRET>` automatically.
     - Schedule is in UTC: `0 10 * * *` = 10:00 UTC = 5am EST. For 5am EDT use `0 9 * * *`.
   - **Other hosts:** Use a cron or scheduler to `POST /api/sync-cards` with header `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`) once per day.

## File structure

```
src/
  app/
    api/cards/          # List cards from Supabase (paginated, search, filter)
    api/cards/[id]/     # Single card from Supabase
    api/cards/batch/    # Multiple cards by id (for inventory join)
    api/episodes/       # Episodes/sets from Supabase
    api/sync-cards/     # POST: sync from One Piece API into Supabase (run daily)
    inventory/page.tsx  # Inventory page
    page.tsx            # Browse cards page
    layout.tsx, globals.css, providers.tsx
  components/
    AddCardModal.tsx
    CardGrid.tsx
    CardRow.tsx
    FiltersPanel.tsx
    InventoryTable.tsx
  hooks/
    useCards.ts         # Paginated cards (TanStack Query)
    useEpisodes.ts
    useInventory.ts
    useInventoryCards.ts  # Join inventory + API cards
    useAddCard.ts       # Add/increment (optimistic)
    useRemoveCard.ts    # Decrement/remove (optimistic)
  lib/
    api/client.ts       # Client fetchers for /api/*
    db/cards.ts         # Read cards/episodes from Supabase
    one-piece-api/server.ts  # Only used by sync job
    supabase/client.ts  # Browser Supabase client
    supabase/server.ts  # Server Supabase client (API routes, sync)
    sync-cards.ts       # Sync One Piece API → Supabase
  types/
    index.ts            # ApiCard, InventoryRow, etc.
supabase/
  schema.sql            # inventory table + RLS
  schema-cards.sql      # cards + episodes tables (for synced data)
```

## Features

- **Browse:** Paginated cards, search (debounced), filters (set, rarity, color), grid/list toggle, add to inventory.
- **Add card modal:** Quantity, condition, notes; if card already in inventory, quantity is incremented.
- **Inventory:** Table of owned cards with API metadata; sort/filter; decrement by 1 or remove entirely.
- **Performance:** Lazy-loaded images, debounced search, optimistic inventory updates.

## Discord Bot (Optrackman)

A separate project, [Optrackman](../optrackman), provides a Discord bot for card search. Clone or open the `optrackman` project, then:

1. Create a Discord Application at [discord.com/developers/applications](https://discord.com/developers/applications).
2. Create a Bot, copy the token → `DISCORD_BOT_TOKEN`.
3. Use OAuth2 → URL Generator (scope: `bot`, permissions: Send Messages) to add the bot to your server.
4. In your OP Tracker app `.env.local`, add `DISCORD_BOT_SECRET` (a long random string, e.g. `openssl rand -hex 32`).
5. In the `optrackman` project: copy `.env.example` to `.env`, set `DISCORD_BOT_TOKEN`, `DISCORD_BOT_SECRET`, and `OPTRACKER_API_URL`, then run `npm install` and `npm start`.

**Command:** `/card <search>` – Search by card name or card ID. Shows an embed with the card image, rarity, color, and who has it in inventory.

## API notes

- Card list and metadata are stored in Supabase and synced once per day from the One Piece API via `POST /api/sync-cards`. The browse and inventory pages read from your DB, so you don’t ping the external API on every request.
- Set `CRON_SECRET` and call the sync endpoint with that secret when using a cron/scheduler so only your job can trigger syncs.
- If the One Piece API uses different query params (e.g. `offset` instead of `page`), adjust `src/lib/one-piece-api/server.ts` and the sync in `src/lib/sync-cards.ts`.
