"use client";

/**
 * useInventory: all inventory rows for the signed-in user.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "./useAuthUser";
import type { InventoryRow } from "@/types";

async function fetchInventory(): Promise<InventoryRow[]> {
  const res = await fetch("/api/inventory", { credentials: "include" });
  if (res.status === 401) return [];
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || res.statusText || "Failed to load inventory");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function useInventory() {
  const { user, isLoading: authLoading } = useAuthUser();

  const query = useQuery({
    queryKey: ["inventory", user?.id],
    enabled: !authLoading && !!user,
    queryFn: fetchInventory,
    staleTime: 30 * 1000,
  });

  return {
    ...query,
    isLoading: authLoading || (!!user && query.isLoading),
  };
}
