/**
 * GET /api/inventory — current user's inventory rows (cookie session + RLS).
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) {
      const res = NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      return applyCookies(res);
    }

    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const res = NextResponse.json(data ?? []);
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
