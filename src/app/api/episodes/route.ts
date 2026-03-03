/**
 * API Route: list episodes/sets from Supabase (synced with cards).
 * GET /api/episodes
 */

import { getEpisodesFromDb } from "@/lib/db/cards";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const episodes = await getEpisodesFromDb();
    return NextResponse.json(episodes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV === "development") console.error("[api/episodes]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
