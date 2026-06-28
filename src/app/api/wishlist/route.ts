/**
 * GET /api/wishlist — list wishlist card IDs for current user.
 * POST { card_id } — add to wishlist.
 * DELETE ?card_id= — remove from wishlist.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("wishlist")
      .select("card_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const res = NextResponse.json({ card_ids: (data ?? []).map((r) => r.card_id) });
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

    const body = await request.json().catch(() => ({}));
    const cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
    if (!cardId) return NextResponse.json({ error: "card_id required" }, { status: 400 });

    const { error } = await supabase.from("wishlist").upsert(
      { user_id: user.id, card_id: cardId },
      { onConflict: "user_id,card_id" }
    );
    if (error) throw error;

    const res = NextResponse.json({ ok: true, card_id: cardId });
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cardId = new URL(request.url).searchParams.get("card_id");
    if (!cardId) return NextResponse.json({ error: "card_id required" }, { status: 400 });

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("card_id", cardId);
    if (error) throw error;

    const res = NextResponse.json({ ok: true });
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
