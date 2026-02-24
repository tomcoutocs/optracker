"use client";

/**
 * useInventory: all inventory rows from Supabase.
 * Join with API card data in the component or a selector.
 */

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { InventoryRow } from "@/types";

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async (): Promise<InventoryRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
