"use client";

/**
 * useInventoryCards: join inventory rows with card catalog data.
 */

import { useQuery } from "@tanstack/react-query";
import { useInventory } from "./useInventory";
import type { ApiCard } from "@/types";
import type { InventoryCard } from "@/types";

function placeholderCard(cardId: string): ApiCard {
  return {
    id: cardId,
    name: cardId,
    slug: "",
    card_number: cardId,
    rarity: "",
    color: "",
    image: "",
    episode: { id: 0, code: "", name: "" },
  };
}

async function fetchCardsBatch(ids: string[]): Promise<ApiCard[]> {
  const res = await fetch("/api/cards/batch", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function useInventoryCards() {
  const { data: inventory = [], ...rest } = useInventory();
  const cardIds = inventory.map((r) => r.card_id);

  const cardsQuery = useQuery({
    queryKey: ["cards-batch", userKey(cardIds)],
    queryFn: () => fetchCardsBatch(cardIds),
    enabled: cardIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const cardMap = new Map<string, ApiCard>();
  if (Array.isArray(cardsQuery.data)) {
    for (const c of cardsQuery.data) cardMap.set(String(c.id), c);
  }

  const items: InventoryCard[] = inventory.map((inv) => {
    const card = cardMap.get(String(inv.card_id)) ?? placeholderCard(inv.card_id);
    return { card, inventory: inv };
  });

  const cardsLoading = cardIds.length > 0 && cardsQuery.isLoading && !cardsQuery.data;

  return {
    items,
    inventory,
    isLoading: rest.isLoading || cardsLoading,
    isError: rest.isError || cardsQuery.isError,
    error: rest.error || cardsQuery.error,
    refetch: () => {
      rest.refetch();
      cardsQuery.refetch();
    },
  };
}

/** Stable query key from sorted ids (order-independent). */
function userKey(ids: string[]): string {
  if (ids.length === 0) return "";
  return [...ids].sort().join(",");
}
