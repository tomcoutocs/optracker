"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DeckListItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  card_count?: number;
  owned_count?: number;
  leader_image?: string | null;
}

export interface DeckCardEntry {
  card_id: string;
  quantity: number;
}

export interface DeckWithCards {
  deck: DeckListItem;
  cards: DeckCardEntry[];
}

async function fetchDecks(): Promise<DeckListItem[]> {
  const res = await fetch("/api/decks");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchDeck(id: string): Promise<DeckWithCards> {
  const res = await fetch(`/api/decks/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useDecks() {
  return useQuery({
    queryKey: ["decks"],
    queryFn: fetchDecks,
  });
}

export function useDeck(id: string | null) {
  return useQuery({
    queryKey: ["deck", id],
    queryFn: () => fetchDeck(id!),
    enabled: !!id,
  });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name?: string) => {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Untitled Deck" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decks"] }),
  });
}

export function useUpdateDeck(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string; cards?: DeckCardEntry[] }) => {
      const res = await fetch(`/api/decks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      if (id) qc.invalidateQueries({ queryKey: ["deck", id] });
    },
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deckId: string) => {
      const res = await fetch(`/api/decks/${deckId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decks"] }),
  });
}
