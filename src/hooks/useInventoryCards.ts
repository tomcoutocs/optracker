"use client";

/**
 * useInventoryCards: join inventory rows with API card data.
 * Fetches cards in batch when inventory has items.
 */

import { useQuery } from "@tanstack/react-query";
import { useInventory } from "./useInventory";
import type { ApiCard } from "@/types";
import type { InventoryCard } from "@/types";

export function useInventoryCards() {
  const { data: inventory = [], ...rest } = useInventory();
  const cardIds = inventory.map((r) => r.card_id);

  const CHUNK_SIZE = 500;
  const cardsQuery = useQuery({
    queryKey: ["cards-batch", cardIds.join(",")],
    queryFn: async (): Promise<ApiCard[]> => {
      if (cardIds.length === 0) return [];
      const all: ApiCard[] = [];
      for (let i = 0; i < cardIds.length; i += CHUNK_SIZE) {
        const chunk = cardIds.slice(i, i + CHUNK_SIZE);
        const res = await fetch(`/api/cards/batch?ids=${encodeURIComponent(chunk.join(","))}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        all.push(...(Array.isArray(data) ? data : []));
      }
      return all;
    },
    enabled: cardIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const cardMap = new Map<string, ApiCard>();
  if (Array.isArray(cardsQuery.data)) {
    for (const c of cardsQuery.data) cardMap.set(String(c.id), c);
  }
  const items: InventoryCard[] = inventory
    .map((inv) => {
      const card = cardMap.get(inv.card_id);
      return card ? { card, inventory: inv } : null;
    })
    .filter((x): x is InventoryCard => x != null);

  return {
    items,
    inventory,
    isLoading: rest.isLoading || cardsQuery.isLoading,
    isError: rest.isError || cardsQuery.isError,
    error: rest.error || cardsQuery.error,
    refetch: () => {
      rest.refetch();
      cardsQuery.refetch();
    },
  };
}
