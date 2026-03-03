/**
 * GET /api/decks/[id]/view - fetch deck with cards for viewing (e.g. another user's deck).
 * Uses service role to bypass RLS. Read-only; for copying or exporting.
 * Includes card metadata (name, image) for display.
 */

import { createServerClient } from "@/lib/supabase/server";
import { getCardsByIdsFromDb } from "@/lib/db/cards";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const admin = createServerClient();
  try {
    const { data: deck, error: deckError } = await admin
      .from("decks")
      .select("id, name, created_at, updated_at")
      .eq("id", id)
      .single();
    if (deckError || !deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    const { data: deckCards, error: cardsError } = await admin
      .from("deck_cards")
      .select("card_id, quantity")
      .eq("deck_id", id)
      .order("created_at");
    if (cardsError) throw cardsError;
    const mergedByCard = new Map<string, number>();
    for (const r of deckCards ?? []) {
      const row = r as { card_id: string; quantity: number };
      mergedByCard.set(row.card_id, (mergedByCard.get(row.card_id) ?? 0) + (row.quantity ?? 1));
    }
    const cardIds = Array.from(mergedByCard.keys());
    const cardRows = cardIds.length > 0 ? await getCardsByIdsFromDb(cardIds) : [];
    const cardMap = new Map(cardRows.map((c) => [String(c.id), c]));
    const cards = Array.from(mergedByCard.entries()).map(([card_id, quantity]) => ({
      card_id,
      quantity,
      card: cardMap.get(card_id) ?? null,
    }));
    return NextResponse.json({ deck, cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV === "development") console.error("[api/decks/view]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
