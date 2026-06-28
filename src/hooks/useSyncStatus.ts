"use client";

import { useQuery } from "@tanstack/react-query";

export interface SyncStatus {
  last_sync_at: string | null;
  cards_count: number;
  episodes_count: number;
  source: string | null;
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync-status"],
    queryFn: async (): Promise<SyncStatus> => {
      const res = await fetch("/api/sync-status");
      if (!res.ok) throw new Error("Failed to load sync status");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
