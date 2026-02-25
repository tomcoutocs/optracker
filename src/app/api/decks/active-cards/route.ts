/**
 * GET /api/decks/active-cards - returns card_id -> deck[] for cards in active decks.
 * Used by inventory to show "in deck" badges with links.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { NextRequest, NextResponse } from "next/server";

export interface ActiveDeckInfo {
  id: string;
  name: string;
}

export type ActiveDeckCardsResponse = Record<string, ActiveDeckInfo[]>;

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const { data: activeDecks, error: decksError } = await supabase
      .from("decks")
      .select("id, name")
      .eq("is_active", true);
    if (decksError) throw decksError;
    if (!activeDecks?.length) {
      const res = NextResponse.json({} as ActiveDeckCardsResponse);
      return applyCookies(res);
    }

    const deckIds = activeDecks.map((d) => d.id);
    const { data: deckCards, error: cardsError } = await supabase
      .from("deck_cards")
      .select("deck_id, card_id")
      .in("deck_id", deckIds);
    if (cardsError) throw cardsError;

    const deckMap = new Map(activeDecks.map((d) => [d.id, { id: d.id, name: d.name }]));
    const byCard = new Map<string, ActiveDeckInfo[]>();
    for (const row of deckCards ?? []) {
      const r = row as { deck_id: string; card_id: string };
      const deck = deckMap.get(r.deck_id);
      if (!deck) continue;
      const list = byCard.get(r.card_id) ?? [];
      if (!list.some((d) => d.id === deck.id)) list.push(deck);
      byCard.set(r.card_id, list);
    }

    const result: ActiveDeckCardsResponse = {};
    byCard.forEach((decks, cardId) => {
      result[cardId] = decks;
    });
    const res = NextResponse.json(result);
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
