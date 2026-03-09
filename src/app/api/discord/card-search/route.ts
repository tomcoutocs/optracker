/**
 * GET /api/discord/card-search?q=... - for Discord bot.
 * Searches cards by name or ID, returns card + users who have it with quantities.
 * Requires Authorization: Bearer <DISCORD_BOT_SECRET> header.
 */

import { createServerClient } from "@/lib/supabase/server";
import { getCardByIdFromDb, getCardsFromDb } from "@/lib/db/cards";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.DISCORD_BOT_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing q parameter (card name or ID)" }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const admin = createServerClient();
  try {
    // Try exact ID match first (e.g. OP11-040)
    let card = await getCardByIdFromDb(q);
    if (!card) {
      // Search by name
      const { cards } = await getCardsFromDb({ search: q, page: 1, limit: 5 });
      card = cards[0] ?? null;
    }
    if (!card) {
      return NextResponse.json({ error: "Card not found", card: null, owners: [] });
    }

    const cardId = String(card.id);
    const { data: invRows } = await admin
      .from("inventory")
      .select("user_id, quantity")
      .eq("card_id", cardId);

    const byUser = new Map<string, number>();
    for (const row of invRows ?? []) {
      const r = row as { user_id: string; quantity: number };
      byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + (r.quantity ?? 0));
    }

    const userIds = Array.from(byUser.keys());
    const owners: { username: string; quantity: number }[] = [];
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        const profile = p as { id: string; username: string };
        const qty = byUser.get(profile.id) ?? 0;
        owners.push({ username: profile.username, quantity: qty });
      }
      owners.sort((a, b) => b.quantity - a.quantity);
    }

    return NextResponse.json({
      card: {
        id: card.id,
        name: card.name,
        card_number: card.card_number,
        image: card.image,
        rarity: card.rarity,
        color: card.color,
      },
      owners,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV === "development") console.error("[api/discord/card-search]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
