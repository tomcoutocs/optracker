/**
 * GET /api/users/[username]/profile-data - full profile for viewing another user.
 * Returns profile, totalValue, recentCards, decks, inventoryItems.
 * Uses service role for inventory/decks so we can read another user's data (RLS restricts to own rows).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local for viewing other users' profiles.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { createServerClient } from "@/lib/supabase/server";
import { getCardsByIdsFromDb } from "@/lib/db/cards";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  const { username } = await params;
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  // Service role is required to read another user's inventory/decks (RLS restricts to own rows)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (from Supabase Dashboard → Project Settings → API → service_role key) to view other users' profiles.",
      },
      { status: 503 }
    );
  }

  const admin = createServerClient();

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("username", decodeURIComponent(username))
      .single();
    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const userId = profile.id;

    // Use service role to read another user's inventory (RLS restricts client to own rows only)
    const { data: invRows, error: invError } = await admin
      .from("inventory")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (invError) throw invError;
    const inventory = invRows ?? [];

    const cardIds = inventory.map((r: { card_id: string }) => r.card_id);
    const cards = cardIds.length > 0 ? await getCardsByIdsFromDb(cardIds) : [];
    const cardMap = new Map(cards.map((c) => [String(c.id), c]));

    let totalValue = 0;
    const inventoryItems: { card: unknown; inventory: unknown }[] = [];
    for (const inv of inventory) {
      const card = cardMap.get(inv.card_id);
      if (card) {
        const price = card.market_price ?? card.inventory_price ?? 0;
        totalValue += inv.quantity * Number(price);
        inventoryItems.push({ card, inventory: inv });
      }
    }

    const recentCards = inventoryItems.slice(0, 5);

    // Use service role to read another user's decks
    const { data: decksRows, error: decksError } = await admin
      .from("decks")
      .select("id, name, created_at, updated_at, is_active")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (decksError) throw decksError;
    const decks = decksRows ?? [];

    const deckIds = decks.map((d: { id: string }) => d.id);
    let decksWithMeta: Array<{ id: string; name: string; card_count: number; owned_count: number; leader_image: string | null }> = [];
    if (deckIds.length > 0) {
      const { data: deckCardsRows } = await admin
        .from("deck_cards")
        .select("deck_id, card_id, quantity")
        .in("deck_id", deckIds);
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
      for (const row of inventory) {
        inventoryByCard.set(row.card_id, (inventoryByCard.get(row.card_id) ?? 0) + (row.quantity ?? 0));
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
      const leaderImageByDeck = new Map<string, string | null>();
      if (allCardIds.size > 0) {
        const cardRows = await getCardsByIdsFromDb(Array.from(allCardIds));
        const cardMeta = new Map(cardRows.map((c) => [String(c.id), { type: c.type ?? null, image: c.image ?? null }]));
        for (const deckId of deckIds) {
          const cids = cardIdsByDeck.get(deckId) ?? [];
          let leaderImage: string | null = null;
          for (const cid of cids) {
            const meta = cardMeta.get(cid);
            if (meta?.type?.toLowerCase() === "leader" && meta.image) {
              leaderImage = meta.image;
              break;
            }
          }
          leaderImageByDeck.set(deckId, leaderImage);
        }
      }
      decksWithMeta = decks.map((d: { id: string; name: string }) => ({
        id: d.id,
        name: d.name,
        card_count: countByDeck.get(d.id) ?? 0,
        owned_count: ownedByDeck.get(d.id) ?? 0,
        leader_image: leaderImageByDeck.get(d.id) ?? null,
      }));
    } else {
      decksWithMeta = decks.map((d: { id: string; name: string }) => ({
        id: d.id,
        name: d.name,
        card_count: 0,
        owned_count: 0,
        leader_image: null,
      }));
    }

    const res = NextResponse.json({
      profile,
      totalValue,
      recentCards,
      decks: decksWithMeta,
      inventoryItems,
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
