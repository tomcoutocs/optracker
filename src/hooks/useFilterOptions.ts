"use client";

/**
 * useFilterOptions: all distinct colors and rarities from the DB.
 * Use for filter dropdowns so they show every option, not just the current page.
 */

import { useQuery } from "@tanstack/react-query";

async function fetchFilters(): Promise<{ colors: string[]; rarities: string[] }> {
  const res = await fetch("/api/filters");
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || res.statusText);
  }
  return res.json();
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: fetchFilters,
    staleTime: 5 * 60 * 1000,
  });
}
