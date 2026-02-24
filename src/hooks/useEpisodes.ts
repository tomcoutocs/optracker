"use client";

/**
 * useEpisodes: list of sets/episodes for filter dropdown.
 */

import { useQuery } from "@tanstack/react-query";
import { apiEpisodes } from "@/lib/api/client";

export function useEpisodes() {
  return useQuery({
    queryKey: ["episodes"],
    queryFn: apiEpisodes,
    staleTime: 60 * 60 * 1000,
  });
}
