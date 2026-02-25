"use client";

/**
 * useInventoryRecent: top N most recently added inventory items (by created_at).
 * Returns InventoryCard[] with card data joined.
 */

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { InventoryRow } from "@/types";
import type { ApiCard } from "@/types";
import type { InventoryCard } from "@/types";

async function fetchRecentInventory(limit: number): Promise<InventoryCard[]> {
  const supabase = createClient();
  const { data: inventory, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (inventory ?? []) as InventoryRow[];

  if (rows.length === 0) return [];

  const cardIds = rows.map((r) => r.card_id);
  const res = await fetch(`/api/cards/batch?ids=${encodeURIComponent(cardIds.join(","))}`);
  if (!res.ok) throw new Error(await res.text());
  const cards: ApiCard[] = await res.json();
  const cardMap = new Map(cards.map((c) => [String(c.id), c]));

  return rows
    .map((inv) => {
      const card = cardMap.get(inv.card_id);
      return card ? { card, inventory: inv } : null;
    })
    .filter((x): x is InventoryCard => x != null);
}

export function useInventoryRecent(limit = 5) {
  return useQuery({
    queryKey: ["inventory-recent", limit],
    queryFn: () => fetchRecentInventory(limit),
  });
}
