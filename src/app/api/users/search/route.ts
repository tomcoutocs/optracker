/**
 * GET /api/users/search?q=username - list or search profiles.
 * No q or q < 2 chars: returns all profiles (limit 100).
 * q >= 2 chars: returns profiles matching username prefix.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();

    let query = supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .order("username");

    if (q && q.length >= 2) {
      query = query.ilike("username", `${q}%`).limit(50);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;
    if (error) throw error;

    const res = NextResponse.json(data ?? []);
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
