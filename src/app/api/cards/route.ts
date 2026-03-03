/**
 * API Route: list cards from Supabase (synced data).
 * GET /api/cards?search=&page=1&limit=24&episodeId=
 * If no cards in DB, run POST /api/sync-cards first.
 */

import { getCardsFromDb } from "@/lib/db/cards";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "24", 10), 10000);
  const episodeIdParam = searchParams.get("episodeId");
  const episodeId = episodeIdParam ? parseInt(episodeIdParam, 10) : undefined;
  const color = searchParams.get("color") ?? undefined;
  const rarity = searchParams.get("rarity") ?? undefined;

  try {
    const { cards, total } = await getCardsFromDb({ search, page, limit, episodeId, color, rarity });
    return NextResponse.json({ cards, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV === "development") console.error("[api/cards]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
