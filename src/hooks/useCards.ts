"use client";

/**
 * useCards: paginated card list with search and filters.
 * Debounced search is applied in the component that uses this hook.
 */

import { useQuery } from "@tanstack/react-query";
import { apiCards } from "@/lib/api/client";

export interface UseCardsParams {
  search?: string;
  page?: number;
  limit?: number;
  episodeId?: number | null;
  color?: string | null;
  rarity?: string | null;
}

export function useCards(params: UseCardsParams = {}) {
  const { search = "", page = 1, limit = 24, episodeId, color, rarity } = params;
  return useQuery({
    queryKey: ["cards", search, page, limit, episodeId ?? "all", color ?? "all", rarity ?? "all"],
    queryFn: () =>
      apiCards({
        search: search || undefined,
        page,
        limit,
        episodeId: episodeId ?? undefined,
        color: color ?? undefined,
        rarity: rarity ?? undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });
}
