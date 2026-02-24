/**
 * Supabase server client that uses request cookies so RLS sees the current user.
 * Use in API route handlers; call applyCookies(response) before returning.
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createServerClientFromRequest(request: NextRequest) {
  const cookieStore: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        toSet.forEach((c) => cookieStore.push({ name: c.name, value: c.value, options: c.options }));
      },
    },
  });

  function applyCookies<T extends NextResponse>(response: T): T {
    cookieStore.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<NextResponse["cookies"]["set"]>[2]);
    });
    return response;
  }

  return { supabase, applyCookies };
}
