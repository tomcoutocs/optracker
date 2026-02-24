/**
 * POST /api/sync-cards (or GET for Vercel Cron)
 * Fetches all cards (and episodes) from external API only when running sync; upserts into Supabase.
 * ?debug=1 returns DB stats only (no external API calls).
 */

import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync-cards";
import { getEpisodesFromDb, getCardsFromDb } from "@/lib/db/cards";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === secret;
  }
  return cronSecret === secret;
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("debug") === "1") {
    try {
      const [episodes, cardsResult] = await Promise.all([
        getEpisodesFromDb(),
        getCardsFromDb({ page: 1, limit: 5 }),
      ]);
      return NextResponse.json({
        debug: true,
        source: "database",
        episodes: { count: episodes.length, sample: episodes[0] ?? null },
        cards: { total: cardsResult.total, count: cardsResult.cards.length, sample: cardsResult.cards[0] ?? null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ debug: true, error: message }, { status: 500 });
    }
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSync();
    return NextResponse.json({
      ok: true,
      episodes: result.episodes,
      cards: result.cards,
      source: result.source,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[sync-cards]", err);
    return NextResponse.json(
      { error: message, ...(process.env.NODE_ENV === "development" && stack && { stack }) },
      { status: 500 }
    );
  }
}

/** GET allowed for Vercel Cron. ?debug=1 returns DB stats (no external API). */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("debug") === "1") {
    return POST(request);
  }
  return POST(request);
}
