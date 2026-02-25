/**
 * GET /api/users/[username] - get profile by username.
 * Returns id, username, avatar_url or 404.
 */

import { createServerClientFromRequest } from "@/lib/supabase/server-cookies";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { supabase, applyCookies } = createServerClientFromRequest(request);
  const { username } = await params;
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, created_at")
      .eq("username", decodeURIComponent(username))
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const res = NextResponse.json(data);
    return applyCookies(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
