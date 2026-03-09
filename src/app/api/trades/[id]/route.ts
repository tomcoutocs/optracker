/**
 * PATCH /api/trades/[id] - accept or reject a trade.
 * Body: { action: 'accept' | 'reject' }
 * On accept: swaps inventory items between users (uses service role).
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Trade ID required" }, { status: 400 });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const action = body.action as string;
    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Action must be 'accept' or 'reject'" }, { status: 400 });
    }

    const { data: trade, error: fetchError } = await supabase
      .from("trades")
      .select("id, from_user_id, to_user_id, status, from_items, to_items")
      .eq("id", id)
      .single();
    if (fetchError || !trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }
    if (trade.to_user_id !== user.id) {
      return NextResponse.json({ error: "Only the recipient can accept or reject" }, { status: 403 });
    }
    if (trade.status !== "pending") {
      return NextResponse.json({ error: "Trade is no longer pending" }, { status: 400 });
    }

    if (action === "reject") {
      const { error: updateError } = await supabase
        .from("trades")
        .update({ status: "rejected" })
        .eq("id", id);
      if (updateError) throw updateError;
      const res = NextResponse.json({ ...trade, status: "rejected" });
      return applyCookies(res);
    }

    // Accept: need to swap inventory. Use service role.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const admin = createServerClient();
    const fromItems = (trade.from_items ?? []) as { card_id: string; quantity: number }[];
    const toItems = (trade.to_items ?? []) as { card_id: string; quantity: number }[];

    // Verify proposer has enough of from_items
    const { data: proposerInv } = await admin
      .from("inventory")
      .select("card_id, quantity")
      .eq("user_id", trade.from_user_id);
    const proposerByCard = new Map<string, number>();
    for (const r of proposerInv ?? []) {
      proposerByCard.set(r.card_id, (proposerByCard.get(r.card_id) ?? 0) + r.quantity);
    }
    for (const { card_id, quantity } of fromItems) {
      if ((proposerByCard.get(card_id) ?? 0) < quantity) {
        return NextResponse.json(
          { error: `Proposer no longer has enough of card ${card_id}` },
          { status: 400 }
        );
      }
    }

    // Verify recipient has enough of to_items
    const { data: recipientInv } = await admin
      .from("inventory")
      .select("card_id, quantity")
      .eq("user_id", trade.to_user_id);
    const recipientByCard = new Map<string, number>();
    for (const r of recipientInv ?? []) {
      recipientByCard.set(r.card_id, (recipientByCard.get(r.card_id) ?? 0) + r.quantity);
    }
    for (const { card_id, quantity } of toItems) {
      if ((recipientByCard.get(card_id) ?? 0) < quantity) {
        return NextResponse.json(
          { error: `You no longer have enough of card ${card_id}` },
          { status: 400 }
        );
      }
    }

    // Execute swap: remove from proposer, add to recipient (from_items)
    for (const { card_id, quantity } of fromItems) {
      await adjustInventory(admin, trade.from_user_id, card_id, -quantity);
      await adjustInventory(admin, trade.to_user_id, card_id, quantity);
    }
    // Remove from recipient, add to proposer (to_items)
    for (const { card_id, quantity } of toItems) {
      await adjustInventory(admin, trade.to_user_id, card_id, -quantity);
      await adjustInventory(admin, trade.from_user_id, card_id, quantity);
    }

    const { error: updateError } = await admin
      .from("trades")
      .update({ status: "accepted" })
      .eq("id", id);
    if (updateError) throw updateError;

    const res = NextResponse.json({ ...trade, status: "accepted" });
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV === "development") console.error("[api/trades PATCH]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function adjustInventory(
  admin: ReturnType<typeof createServerClient>,
  userId: string,
  cardId: string,
  delta: number
) {
  const { data: row } = await admin
    .from("inventory")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (!row) {
    if (delta <= 0) return;
    await admin.from("inventory").insert({
      user_id: userId,
      card_id: cardId,
      quantity: delta,
    });
    return;
  }

  const newQty = row.quantity + delta;
  if (newQty <= 0) {
    await admin.from("inventory").delete().eq("id", row.id);
  } else {
    await admin.from("inventory").update({ quantity: newQty }).eq("id", row.id);
  }
}
