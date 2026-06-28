"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchWishlistIds(): Promise<string[]> {
  const res = await fetch("/api/wishlist");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to load wishlist");
  }
  const data = await res.json();
  return data.card_ids ?? [];
}

export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: fetchWishlistIds,
    staleTime: 60 * 1000,
    enabled,
  });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, onWishlist }: { cardId: string; onWishlist: boolean }) => {
      if (onWishlist) {
        const res = await fetch(`/api/wishlist?card_id=${encodeURIComponent(cardId)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to remove from wishlist");
        }
        return { cardId, added: false };
      }
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add to wishlist");
      }
      return { cardId, added: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}
