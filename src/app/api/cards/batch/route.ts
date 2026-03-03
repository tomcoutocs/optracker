/**
 * GET /api/cards/batch?ids=1,2,3 - fetch multiple cards by id from Supabase.
 */

import { getCardsByIdsFromDb } from "@/lib/db/cards";
import { NextRequest, NextResponse } from "next/server";

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
