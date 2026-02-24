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
  if (ids.length > 100) {
    return NextResponse.json({ error: "Max 100 ids" }, { status: 400 });
  }
  try {
    const cards = await getCardsByIdsFromDb(ids);
    return NextResponse.json(cards);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
