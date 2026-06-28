/**
 * POST /api/trades - create trade proposal { toUserId, fromItems, toItems }.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  normalizeTradeItems,
  inventoryMapFromRows,
  validateInventoryForItems,
} from "@/lib/trade-validation";

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: trades, error } = await supabase
      .from("trades")
      .select("id, from_user_id, to_user_id, status, from_items, to_items, created_at, updated_at")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const userIds = new Set<string>();
    for (const t of trades ?? []) {
      userIds.add(t.from_user_id);
      userIds.add(t.to_user_id);
    }
    const admin = createServerClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", Array.from(userIds));

    const profileMap = new Map((profiles ?? []).map((p: { id: string; username: string }) => [p.id, p.username]));

    const enriched = (trades ?? []).map((t) => ({
      ...t,
      from_username: profileMap.get(t.from_user_id) ?? null,
      to_username: profileMap.get(t.to_user_id) ?? null,
      is_mine_outgoing: t.from_user_id === user.id,
      is_pending_for_me: t.to_user_id === user.id && t.status === "pending",
    }));

    const res = NextResponse.json(enriched);
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const toUserId = body.toUserId as string | undefined;
    const validFrom = normalizeTradeItems(
      Array.isArray(body.fromItems) ? body.fromItems : []
    );
    const validTo = normalizeTradeItems(
      Array.isArray(body.toItems) ? body.toItems : []
    );

    if (!toUserId || toUserId === user.id) {
      return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
    }
    if (validFrom.length === 0 && validTo.length === 0) {
      return NextResponse.json({ error: "Must offer or request at least one card" }, { status: 400 });
    }

    const { data: invRows, error: invError } = await supabase
      .from("inventory")
      .select("card_id, quantity")
      .eq("user_id", user.id);
    if (invError) throw invError;

    const inventory = inventoryMapFromRows(invRows ?? []);
    const validationError = validateInventoryForItems(inventory, validFrom, "You");
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data: trade, error } = await supabase
      .from("trades")
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        from_items: validFrom,
        to_items: validTo,
      })
      .select()
      .single();
    if (error) throw error;

    const res = NextResponse.json(trade);
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
