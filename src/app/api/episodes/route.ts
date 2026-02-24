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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
