/**
 * GET /api/filters - distinct colors and rarities from the cards table.
 * Used so filter dropdowns show all options, not just those on the current page.
 */

import { getDistinctFilters } from "@/lib/db/cards";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { colors, rarities } = await getDistinctFilters();
    return NextResponse.json({ colors, rarities });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV === "development") console.error("[api/filters]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
