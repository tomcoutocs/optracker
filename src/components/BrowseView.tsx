"use client";

/**
 * Browse Cards view: all cards with search and filters, grid/list toggle.
 * Shown on "/" when user is logged in.
 */

import { useState, useEffect } from "react";
import { CardGrid } from "@/components/CardGrid";
import { FiltersPanel } from "@/components/FiltersPanel";
import { AddCardModal } from "@/components/AddCardModal";
import { Button } from "@/components/ui/button";
import { useCards } from "@/hooks/useCards";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useAddCard } from "@/hooks/useAddCard";
import { useInventory } from "@/hooks/useInventory";
import type { ApiCard } from "@/types";

const DEBOUNCE_MS = 300;
const CARDS_LIMIT = 10000;

export function BrowseView() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [episodeId, setEpisodeId] = useState<number | null>(null);
  const [rarity, setRarity] = useState("");
  const [color, setColor] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [addCard, setAddCard] = useState<ApiCard | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error } = useCards({
    search: debouncedSearch,
    page: 1,
    limit: CARDS_LIMIT,
    episodeId,
    color: color || undefined,
    rarity: rarity || undefined,
  });
  const { data: episodes = [] } = useEpisodes();
  const { data: filterOptions } = useFilterOptions();
  const addCardMutation = useAddCard();
  const { data: inventory = [] } = useInventory();

  const quantityByCardId = inventory.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.card_id] = (acc[inv.card_id] ?? 0) + inv.quantity;
    return acc;
  }, {});

  const rarities = filterOptions?.rarities ?? [];
  const colors = filterOptions?.colors ?? [];
  const filteredCards = data?.cards ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Browse Cards</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">View</span>
          <Button
            type="button"
            variant={layout === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setLayout("grid")}
          >
            Grid
          </Button>
          <Button
            type="button"
            variant={layout === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setLayout("list")}
          >
            List
          </Button>
        </div>
      </div>

      <FiltersPanel
        search={search}
        onSearchChange={setSearch}
        episodeId={episodeId}
        onEpisodeIdChange={setEpisodeId}
        rarity={rarity}
        onRarityChange={setRarity}
        color={color}
        onColorChange={setColor}
        episodes={episodes}
        rarities={rarities}
        colors={colors}
      />

      {isError && (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Failed to load cards."}
        </p>
      )}
      {isLoading && <p className="text-muted-foreground">Loading cards…</p>}
      {!isLoading && !isError && (
        <CardGrid
          cards={filteredCards}
          onAdd={setAddCard}
          layout={layout}
          quantityByCardId={quantityByCardId}
        />
      )}

      {addCard && (
        <AddCardModal
          card={addCard}
          onClose={() => setAddCard(null)}
          onSave={(params) =>
            addCardMutation.mutate(
              {
                card_id: params.card_id,
                quantity: params.quantity,
                condition: params.condition as import("@/types").CardCondition | null,
                notes: params.notes,
              },
              { onSuccess: () => setAddCard(null) }
            )
          }
          isPending={addCardMutation.isPending}
        />
      )}
    </div>
  );
}
