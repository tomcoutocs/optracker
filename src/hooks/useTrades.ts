"use client";

/**
 * useTrades: fetch trade proposals (incoming/outgoing).
 * useCreateTrade: send a trade proposal.
 * useRespondToTrade: accept or reject a trade.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface TradeItem {
  card_id: string;
  quantity: number;
}

export interface Trade {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected";
  from_items: TradeItem[];
  to_items: TradeItem[];
  created_at: string;
  updated_at: string;
  from_username?: string | null;
  to_username?: string | null;
  is_mine_outgoing?: boolean;
  is_pending_for_me?: boolean;
}

async function fetchTrades(): Promise<Trade[]> {
  const res = await fetch("/api/trades");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch trades");
  }
  return res.json();
}

export function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: fetchTrades,
    staleTime: 15 * 1000,
  });
}

export function useCreateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { toUserId: string; fromItems: TradeItem[]; toItems: TradeItem[] }) => {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create trade");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}

export function useRespondToTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tradeId, action }: { tradeId: string; action: "accept" | "reject" }) => {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to respond");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["user-profile-data"] });
    },
  });
}
