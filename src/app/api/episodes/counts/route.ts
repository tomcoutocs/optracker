/**
 * API Route: card count per episode (for set completion progress).
 * GET /api/episodes/counts
 */

import { getEpisodeCardCounts } from "@/lib/db/cards";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const counts = await getEpisodeCardCounts();
    return NextResponse.json(counts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
