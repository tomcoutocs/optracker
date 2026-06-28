/**
 * GET /api/cards/batch?ids=1,2,3 - fetch multiple cards by id from Supabase.
 * POST { ids: string[] } - same, for large inventories (avoids URL length limits).
 */

import { getCardsByIdsFromDb } from "@/lib/db/cards";
import { NextRequest, NextResponse } from "next/server";

function parseIds(ids: string[]): string[] {
  return ids.map((s) => String(s).trim()).filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = parseIds(Array.isArray(body?.ids) ? body.ids : []);
    if (ids.length === 0) return NextResponse.json([]);
    if (ids.length > 2000) {
      return NextResponse.json({ error: "Max 2000 ids per request" }, { status: 400 });
    }
    const cards = await getCardsByIdsFromDb(ids);
    return NextResponse.json(cards);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV === "development") console.error("[api/cards/batch POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json([]);
  }
  // Allow up to 2000 ids per request to support large inventories
  if (ids.length > 2000) {
    return NextResponse.json({ error: "Max 2000 ids per request" }, { status: 400 });
  }
  try {
    const cards = await getCardsByIdsFromDb(ids);
    return NextResponse.json(cards);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV === "development") console.error("[api/cards/batch]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
