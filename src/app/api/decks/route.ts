/**
 * GET /api/decks - list all decks (with card count and leader image).
 * POST /api/decks - create deck { name?: string }.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const { data: decks, error: decksError } = await supabase
      .from("decks")
      .select("id, name, created_at, updated_at, is_active")
      .order("updated_at", { ascending: false });
    if (decksError) throw decksError;

    const deckIds = (decks ?? []).map((d) => d.id);
    if (deckIds.length === 0) {
      const res = NextResponse.json([]);
      return applyCookies(res);
    }

    const { data: deckCardsRows, error: dcError } = await supabase
      .from("deck_cards")
      .select("deck_id, card_id, quantity");
    if (dcError) throw dcError;

    // Group deck_cards by (deck_id, card_id) and sum quantities to avoid overcounting duplicates
    const mergedByDeckCard = new Map<string, Map<string, number>>();
    for (const row of deckCardsRows ?? []) {
      const r = row as { deck_id: string; card_id: string; quantity: number };
      const qty = r.quantity ?? 1;
      if (!mergedByDeckCard.has(r.deck_id)) mergedByDeckCard.set(r.deck_id, new Map());
      const byCard = mergedByDeckCard.get(r.deck_id)!;
      byCard.set(r.card_id, (byCard.get(r.card_id) ?? 0) + qty);
    }

    const countByDeck = new Map<string, number>();
    const cardIdsByDeck = new Map<string, string[]>();
    const deckCardsByDeck = new Map<string, { card_id: string; quantity: number }[]>();
    const allCardIds = new Set<string>();
    for (const [deckId, byCard] of mergedByDeckCard) {
      for (const [cardId, qty] of byCard) {
        countByDeck.set(deckId, (countByDeck.get(deckId) ?? 0) + qty);
        if (!cardIdsByDeck.has(deckId)) cardIdsByDeck.set(deckId, []);
        cardIdsByDeck.get(deckId)!.push(cardId);
        if (!deckCardsByDeck.has(deckId)) deckCardsByDeck.set(deckId, []);
        deckCardsByDeck.get(deckId)!.push({ card_id: cardId, quantity: qty });
        allCardIds.add(cardId);
      }
    }

    const inventoryByCard = new Map<string, number>();
    const { data: invRows } = await supabase.from("inventory").select("card_id, quantity");
    for (const row of invRows ?? []) {
      const r = row as { card_id: string; quantity: number };
      inventoryByCard.set(r.card_id, (inventoryByCard.get(r.card_id) ?? 0) + (r.quantity ?? 0));
    }

    const ownedByDeck = new Map<string, number>();
    for (const deckId of deckIds) {
      const entries = deckCardsByDeck.get(deckId) ?? [];
      let owned = 0;
      for (const { card_id, quantity: need } of entries) {
        const have = inventoryByCard.get(card_id) ?? 0;
        owned += Math.min(need, have);
      }
      ownedByDeck.set(deckId, owned);
    }

    let leaderImageByDeck = new Map<string, string | null>();
    if (allCardIds.size > 0) {
      const { data: cardRows, error: cardsError } = await supabase
        .from("cards")
        .select("id, type, image")
        .in("id", Array.from(allCardIds));
      if (!cardsError && cardRows?.length) {
        const cardMeta = new Map<string, { type: string | null; image: string | null }>();
        for (const c of cardRows as { id: string; type: string | null; image: string | null }[]) {
          cardMeta.set(c.id, { type: c.type ?? null, image: c.image ?? null });
        }
        for (const deckId of deckIds) {
          const cardIds = cardIdsByDeck.get(deckId) ?? [];
          let leaderImage: string | null = null;
          for (const cid of cardIds) {
            const meta = cardMeta.get(cid);
            if (meta?.type?.toLowerCase() === "leader" && meta.image) {
              leaderImage = meta.image;
              break;
            }
          }
          leaderImageByDeck.set(deckId, leaderImage);
        }
      }
    }

    const result = (decks ?? []).map((d) => {
      const total = countByDeck.get(d.id) ?? 0;
      const owned = ownedByDeck.get(d.id) ?? 0;
      return {
        ...d,
        card_count: total,
        owned_count: owned,
        leader_image: leaderImageByDeck.get(d.id) ?? null,
      };
    });
    const res = NextResponse.json(result);
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Untitled Deck";
    const { data, error } = await supabase
      .from("decks")
      .insert({ name })
      .select("id, name, created_at, updated_at")
      .single();
    if (error) throw error;
    const res = NextResponse.json(data);
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
