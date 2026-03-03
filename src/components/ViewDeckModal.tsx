"use client";

/**
 * ViewDeckModal: view another user's deck, with options to add to my decks or export.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Plus } from "lucide-react";
import type { DeckCardEntry } from "@/hooks/useDecks";

interface ViewDeckModalProps {
  deckId: string | null;
  deckName: string;
  ownerUsername: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchDeckView(deckId: string) {
  const res = await fetch(`/api/decks/${deckId}/view`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load deck");
  }
  return res.json() as Promise<{
    deck: { id: string; name: string };
    cards: (DeckCardEntry & { card?: { id: string; name: string; image?: string; card_number?: string } | null })[];
  }>;
}

export function ViewDeckModal({
  deckId,
  deckName,
  ownerUsername,
  open,
  onOpenChange,
}: ViewDeckModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [exportCopied, setExportCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deck-view", deckId],
    queryFn: () => fetchDeckView(deckId!),
    enabled: !!deckId && open,
  });

  // Always fetch card details client-side for image display (batch API is reliable)
  const cardIds = data?.cards?.map((c) => c.card_id) ?? [];
  const { data: batchCards } = useQuery({
    queryKey: ["cards-batch", cardIds.join(",")],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const idsParam = cardIds.join(",");
      const res = await fetch(`/api/cards/batch?ids=${encodeURIComponent(idsParam)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!data && cardIds.length > 0,
  });
  const batchMap = new Map<string, { id: string; name: string; image?: string; card_number?: string }>(
    (batchCards ?? []).map((c: { id: string; name?: string; image?: string; card_number?: string }) => [
      String(c.id),
      { id: String(c.id), name: c.name ?? "", image: c.image, card_number: c.card_number },
    ])
  );
  const cardsWithImages =
    data?.cards?.map((entry) => ({
      ...entry,
      card: entry.card?.image ? entry.card : batchMap.get(entry.card_id) ?? null,
    })) ?? [];

  const createDeck = useMutation({
    mutationFn: async (payload: { name: string; cards: DeckCardEntry[] }) => {
      const createRes = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name }),
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      const deck = await createRes.json();
      await fetch(`/api/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: payload.cards }),
      });
      return deck;
    },
    onSuccess: (deck) => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      onOpenChange(false);
      router.push(`/decks?deck=${deck.id}`);
    },
  });

  const handleAddToMyDecks = () => {
    if (!data?.cards) return;
    createDeck.mutate({
      name: `${data.deck.name} (from ${ownerUsername})`,
      cards: data.cards.map(({ card_id, quantity }) => ({ card_id, quantity })),
    });
  };

  const handleExport = async () => {
    if (!data?.cards) return;
    const text = data.cards.map((c) => `${c.quantity}x${c.card_id}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    } catch {
      setExportCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{deckName}</DialogTitle>
          <DialogDescription>
            {ownerUsername}&apos;s deck · {data?.cards?.length ?? "—"} cards
          </DialogDescription>
        </DialogHeader>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive py-4">
            {error instanceof Error ? error.message : "Failed to load deck"}
          </p>
        )}
        {data && !error && (
          <>
            <ul className="overflow-auto flex-1 min-h-0 space-y-2 pr-2 -mr-2">
              {cardsWithImages.map(({ card_id, quantity, card }) => (
                <li key={card_id} className="flex items-center gap-3 py-1.5">
                  <div className="relative w-10 h-14 rounded overflow-hidden bg-muted shrink-0">
                    {card?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image}
                        alt={card.name ?? card_id}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {card?.card_number ? `${card.name} - ${card.card_number}` : card?.name ?? card_id}
                    </p>
                    <p className="text-xs text-muted-foreground">{quantity}x</p>
                  </div>
                </li>
              ))}
            </ul>
            <DialogFooter className="flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={data.cards.length === 0}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                {exportCopied ? "Copied!" : "Export decklist"}
              </Button>
              <Button onClick={handleAddToMyDecks} disabled={createDeck.isPending} className="gap-2">
                {createDeck.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add to my decks
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
