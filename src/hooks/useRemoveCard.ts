"use client";

/**
 * useRemoveCard: decrement quantity or delete row (optimistic update).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface RemoveCardInput {
  card_id: string;
  /** If true, remove one; if number, remove that many. Otherwise delete row. */
  decrement?: boolean | number;
}

export function useRemoveCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RemoveCardInput) => {
      const supabase = createClient();
      const { data: row } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("card_id", input.card_id)
        .maybeSingle();

      if (!row) return null;

      const removeQty =
        input.decrement === true ? 1 : typeof input.decrement === "number" ? input.decrement : row.quantity;
      const newQty = Math.max(0, row.quantity - removeQty);

      if (newQty <= 0) {
        const { error } = await supabase.from("inventory").delete().eq("id", row.id);
        if (error) throw error;
        return null;
      }

      const { data, error } = await supabase
        .from("inventory")
        .update({ quantity: newQty })
        .eq("id", row.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["inventory"] });
      const prev = queryClient.getQueryData(["inventory"]) as unknown[] | undefined;
      const decrement = input.decrement === true ? 1 : typeof input.decrement === "number" ? input.decrement : undefined;
      queryClient.setQueryData(["inventory"], (old: unknown[] | undefined) => {
        const list = (Array.isArray(old) ? [...old] : []) as { card_id?: string; quantity?: number; id?: string }[];
        return list
          .map((r) => {
            if (r.card_id !== input.card_id) return r;
            const q = r.quantity ?? 0;
            const sub = decrement ?? q;
            const nextQ = q - sub;
            if (nextQ <= 0) return null;
            return { ...r, quantity: nextQ };
          })
          .filter(Boolean);
      });
      return { previousInventory: prev };
    },
    onError: (_err, _input, context) => {
      if (context?.previousInventory != null) {
        queryClient.setQueryData(["inventory"], context.previousInventory);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
