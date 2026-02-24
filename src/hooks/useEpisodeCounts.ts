"use client";

/**
 * useEpisodeCounts: card count per episode (for set completion progress).
 */

import { useQuery } from "@tanstack/react-query";

export function useEpisodeCounts() {
  return useQuery({
    queryKey: ["episode-counts"],
    queryFn: async (): Promise<{ episode_id: number; count: number }[]> => {
      const res = await fetch("/api/episodes/counts");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
