"use client";

/**
 * useActiveDeckCards: map of card_id -> decks that contain it (active decks only).
 * Used by inventory to show "in deck" badges with links.
 */

import { useQuery } from "@tanstack/react-query";

export interface ActiveDeckInfo {
  id: string;
  name: string;
}

async function fetchActiveDeckCards(): Promise<Record<string, ActiveDeckInfo[]>> {
  const res = await fetch("/api/decks/active-cards");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useActiveDeckCards() {
  return useQuery({
    queryKey: ["active-deck-cards"],
    queryFn: fetchActiveDeckCards,
  });
}
