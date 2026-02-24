/**
 * GET /api/decks/[id] - get deck with its cards (card_id, quantity).
 * PATCH /api/decks/[id] - update deck { name?, cards?: { card_id, quantity }[] }.
 * DELETE /api/decks/[id] - delete deck.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id, name, created_at, updated_at")
      .eq("id", id)
      .single();
    if (deckError || !deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    const { data: deckCards, error: cardsError } = await supabase
      .from("deck_cards")
      .select("card_id, quantity")
      .eq("deck_id", id)
      .order("created_at");
    if (cardsError) throw cardsError;
    const res = NextResponse.json({
      deck,
      cards: (deckCards ?? []).map((r) => ({ card_id: r.card_id, quantity: r.quantity })),
    });
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await request.json().catch(() => ({}));

    if (typeof body.name === "string" && body.name.trim()) {
      const { error: updateError } = await supabase
        .from("decks")
        .update({ name: body.name.trim() })
        .eq("id", id);
      if (updateError) throw updateError;
    }

    if (Array.isArray(body.cards)) {
      await supabase.from("deck_cards").delete().eq("deck_id", id);
      const rows = body.cards
        .filter((c: unknown) => c && typeof c === "object" && typeof (c as { card_id?: string }).card_id === "string")
        .map((c: { card_id: string; quantity?: number }) => ({
          deck_id: id,
          card_id: (c as { card_id: string }).card_id,
          quantity: Math.max(1, Math.floor(Number((c as { quantity?: number }).quantity) || 1)),
        }));
      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("deck_cards").insert(rows);
        if (insertError) throw insertError;
      }
    }

    const { data: deck, error: fetchError } = await supabase
      .from("decks")
      .select("id, name, created_at, updated_at")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;
    const { data: deckCards } = await supabase
      .from("deck_cards")
      .select("card_id, quantity")
      .eq("deck_id", id)
      .order("created_at");
    const res = NextResponse.json({
      deck,
      cards: (deckCards ?? []).map((r) => ({ card_id: r.card_id, quantity: r.quantity })),
    });
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const { error } = await supabase.from("decks").delete().eq("id", id);
    if (error) throw error;
    const res = NextResponse.json({ ok: true });
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
