"use client";

/**
 * useAddCard: add or increment card in inventory (optimistic update).
 * If card already exists, increment quantity; otherwise insert.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CardCondition } from "@/types";

export interface AddCardInput {
  card_id: string;
  quantity: number;
  condition?: CardCondition | null;
  notes?: string | null;
}

export function useAddCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddCardInput) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("card_id", input.card_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("inventory")
          .update({
            quantity: existing.quantity + input.quantity,
            condition: input.condition ?? undefined,
            notes: input.notes ?? undefined,
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("inventory")
        .insert({
          card_id: input.card_id,
          quantity: input.quantity,
          condition: input.condition ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["inventory"] });
      const prev = queryClient.getQueryData(["inventory"]) as unknown[] | undefined;
      queryClient.setQueryData(["inventory"], (old: unknown[] | undefined) => {
        const list = Array.isArray(old) ? [...old] : [];
        const idx = list.findIndex((r: unknown) => (r as { card_id?: string }).card_id === input.card_id);
        if (idx >= 0) {
          const next = [...list];
          const current = next[idx] as { quantity: number; [k: string]: unknown };
          next[idx] = { ...current, quantity: current.quantity + input.quantity };
          return next;
        }
        return [
          ...list,
          {
            id: "temp",
            card_id: input.card_id,
            quantity: input.quantity,
            condition: input.condition ?? null,
            notes: input.notes ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
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
