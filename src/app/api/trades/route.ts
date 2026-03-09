/**
 * GET /api/trades - list trades for current user (sent and received).
 * POST /api/trades - create trade proposal { toUserId, fromItems, toItems }.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { NextRequest, NextResponse } from "next/server";

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
    const admin = (await import("@/lib/supabase/server")).createServerClient();
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
    const fromItems = Array.isArray(body.fromItems) ? body.fromItems as { card_id: string; quantity: number }[] : [];
    const toItems = Array.isArray(body.toItems) ? body.toItems as { card_id: string; quantity: number }[] : [];

    if (!toUserId || toUserId === user.id) {
      return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
    }
    if (fromItems.length === 0 && toItems.length === 0) {
      return NextResponse.json({ error: "Must offer or request at least one card" }, { status: 400 });
    }

    const validFrom = fromItems.filter((x) => x?.card_id && typeof x.quantity === "number" && x.quantity > 0);
    const validTo = toItems.filter((x) => x?.card_id && typeof x.quantity === "number" && x.quantity > 0);

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
