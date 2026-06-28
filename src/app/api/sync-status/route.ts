/**
 * GET /api/sync-status — public last sync metadata for browse footer.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: meta } = await supabase
      .from("sync_meta")
      .select("last_sync_at, cards_count, episodes_count, source")
      .eq("id", 1)
      .maybeSingle();

    if (meta) {
      return NextResponse.json(meta);
    }

    const { count: cardsCount } = await supabase
      .from("cards")
      .select("*", { count: "exact", head: true });
    const { count: episodesCount } = await supabase
      .from("episodes")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      last_sync_at: null,
      cards_count: cardsCount ?? 0,
      episodes_count: episodesCount ?? 0,
      source: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
