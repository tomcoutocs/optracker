/**
 * PATCH /api/trades/[id] - accept, reject, cancel, or counter a trade.
 * Body: { action: 'accept' | 'reject' | 'cancel' | 'counter' }
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  normalizeTradeItems,
  inventoryMapFromRows,
  validateInventoryForItems,
} from "@/lib/trade-validation";

const ACTIONS = new Set(["accept", "reject", "cancel", "counter"]);

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
    if (!ACTIONS.has(action)) {
      return NextResponse.json(
        { error: "Action must be 'accept', 'reject', 'cancel', or 'counter'" },
        { status: 400 }
      );
    }

    const { data: trade, error: fetchError } = await supabase
      .from("trades")
      .select("id, from_user_id, to_user_id, status, from_items, to_items")
      .eq("id", id)
      .single();
    if (fetchError || !trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }
    if (trade.status !== "pending") {
      return NextResponse.json({ error: "Trade is no longer pending" }, { status: 400 });
    }

    if (action === "cancel") {
      if (trade.from_user_id !== user.id) {
        return NextResponse.json({ error: "Only the sender can cancel" }, { status: 403 });
      }
      const { error: updateError } = await supabase
        .from("trades")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (updateError) throw updateError;
      const res = NextResponse.json({ ...trade, status: "cancelled" });
      return applyCookies(res);
    }

    if (action === "reject" || action === "counter") {
      if (trade.to_user_id !== user.id) {
        return NextResponse.json({ error: "Only the recipient can reject or counter" }, { status: 403 });
      }
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

    if (action === "counter") {
      const fromItems = normalizeTradeItems(trade.to_items as { card_id: string; quantity: number }[]);
      const toItems = normalizeTradeItems(trade.from_items as { card_id: string; quantity: number }[]);

      const { data: invRows } = await supabase
        .from("inventory")
        .select("card_id, quantity")
        .eq("user_id", user.id);
      const inventory = inventoryMapFromRows(invRows ?? []);
      const validationError = validateInventoryForItems(inventory, fromItems, "You");
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      const { error: markError } = await supabase
        .from("trades")
        .update({ status: "countered" })
        .eq("id", id);
      if (markError) throw markError;

      const { data: newTrade, error: insertError } = await supabase
        .from("trades")
        .insert({
          from_user_id: user.id,
          to_user_id: trade.from_user_id,
          from_items: fromItems,
          to_items: toItems,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const res = NextResponse.json({ countered: trade.id, trade: newTrade });
      return applyCookies(res);
    }

    // Accept
    if (trade.to_user_id !== user.id) {
      return NextResponse.json({ error: "Only the recipient can accept" }, { status: 403 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const admin = createServerClient();
    const fromItems = normalizeTradeItems(trade.from_items as { card_id: string; quantity: number }[]);
    const toItems = normalizeTradeItems(trade.to_items as { card_id: string; quantity: number }[]);

    const { data: proposerInv } = await admin
      .from("inventory")
      .select("card_id, quantity")
      .eq("user_id", trade.from_user_id);
    const proposerMap = inventoryMapFromRows(proposerInv ?? []);
    const proposerError = validateInventoryForItems(proposerMap, fromItems, "Proposer");
    if (proposerError) {
      return NextResponse.json({ error: proposerError }, { status: 400 });
    }

    const { data: recipientInv } = await admin
      .from("inventory")
      .select("card_id, quantity")
      .eq("user_id", trade.to_user_id);
    const recipientMap = inventoryMapFromRows(recipientInv ?? []);
    const recipientError = validateInventoryForItems(recipientMap, toItems, "You");
    if (recipientError) {
      return NextResponse.json({ error: recipientError }, { status: 400 });
    }

    const { error: swapError } = await admin.rpc("execute_trade_swap", {
      p_trade_id: id,
      p_from_user_id: trade.from_user_id,
      p_to_user_id: trade.to_user_id,
      p_from_items: fromItems,
      p_to_items: toItems,
    });
    if (swapError) throw swapError;

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
