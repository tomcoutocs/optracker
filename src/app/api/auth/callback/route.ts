/**
 * POST /api/auth/callback - set session cookie from client's refresh_token after login.
 * Client calls this after signInWithPassword/signUp so middleware can read the session.
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const refreshToken = body.refresh_token as string | undefined;
  if (!refreshToken || typeof refreshToken !== "string") {
    return NextResponse.json({ error: "refresh_token required" }, { status: 400 });
  }

  const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach((c) => cookiesToSet.push({ name: c.name, value: c.value, options: c.options }));
      },
    },
  });

  const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Record<string, unknown> & { maxAge?: number; path?: string });
  });
  return response;
}
