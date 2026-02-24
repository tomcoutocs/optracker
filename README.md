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

   - **Vercel:** Create `vercel.json` in the project root with:
     ```json
     { "crons": [{ "path": "/api/sync-cards", "schedule": "0 6 * * *" }] }
     ```
     (Runs at 06:00 UTC daily.) Set `CRON_SECRET` in Vercel project env; Vercel will send it when invoking the cron.
   - **Other:** Use a cron job or scheduler (GitHub Actions, etc.) to `POST /api/sync-cards` with the secret header once per day.

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

## API notes

- Card list and metadata are stored in Supabase and synced once per day from the One Piece API via `POST /api/sync-cards`. The browse and inventory pages read from your DB, so you don’t ping the external API on every request.
- Set `CRON_SECRET` and call the sync endpoint with that secret when using a cron/scheduler so only your job can trigger syncs.
- If the One Piece API uses different query params (e.g. `offset` instead of `page`), adjust `src/lib/one-piece-api/server.ts` and the sync in `src/lib/sync-cards.ts`.
