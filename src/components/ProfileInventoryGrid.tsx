"use client";

/**
 * ProfileInventoryGrid: searchable/filterable grid of user's inventory cards.
 * Similar to BrowseView but data source is inventory.
 */

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { InventoryCard } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { FiltersPanel } from "@/components/FiltersPanel";
import { useInventoryCards } from "@/hooks/useInventoryCards";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useFilterOptions } from "@/hooks/useFilterOptions";

const DEBOUNCE_MS = 300;

interface ProfileInventoryGridProps {
  search: string;
  onSearchChange: (v: string) => void;
  episodeId: number | null;
  onEpisodeIdChange: (v: number | null) => void;
  rarity: string;
  onRarityChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
  /** When provided, use these items instead of fetching (e.g. when viewing another user's profile) */
  items?: InventoryCard[];
  /** When true, cards are not clickable (viewing another user) */
  readOnly?: boolean;
}

export function ProfileInventoryGrid({
  search,
  onSearchChange,
  episodeId,
  onEpisodeIdChange,
  rarity,
  onRarityChange,
  color,
  onColorChange,
  items: itemsProp,
  readOnly = false,
}: ProfileInventoryGridProps) {
  const { items: fetchedItems, isLoading, isError, error } = useInventoryCards();
  const items = itemsProp ?? fetchedItems;
  const showFetchState = !itemsProp;
  const { data: episodes = [] } = useEpisodes();
  const { data: filterOptions } = useFilterOptions();

  const rarities = filterOptions?.rarities ?? [];
  const colors = filterOptions?.colors ?? [];

  const filteredItems = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (x) =>
          x.card.name.toLowerCase().includes(q) ||
          (x.card.card_number ?? "").toLowerCase().includes(q) ||
          (x.card.episode?.code ?? "").toLowerCase().includes(q) ||
          x.card.rarity.toLowerCase().includes(q) ||
          x.card.color.toLowerCase().includes(q)
      );
    }
    if (episodeId != null) {
      list = list.filter((x) => x.card.episode?.id === episodeId);
    }
    if (rarity) list = list.filter((x) => x.card.rarity === rarity);
    if (color) list = list.filter((x) => x.card.color === color);
    return list;
  }, [items, search, episodeId, rarity, color]);

  return (
    <div className="space-y-4">
      <FiltersPanel
        search={search}
        onSearchChange={onSearchChange}
        episodeId={episodeId}
        onEpisodeIdChange={onEpisodeIdChange}
        rarity={rarity}
        onRarityChange={onRarityChange}
        color={color}
        onColorChange={onColorChange}
        episodes={episodes}
        rarities={rarities}
        colors={colors}
      />
      {showFetchState && isError && (
        <p className="text-destructive text-sm">{error instanceof Error ? error.message : "Failed to load."}</p>
      )}
      {showFetchState && isLoading && <p className="text-muted-foreground">Loading inventory…</p>}
      {(!showFetchState || (!isLoading && !isError)) && (
        <>
          {filteredItems.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No cards match. {items.length === 0 ? "Add cards to your inventory first." : "Try different filters."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredItems.map((item) => {
                const cardEl = (
                  <Card className={`overflow-hidden transition-all group ${!readOnly ? "hover:shadow-lg hover:border-primary/40" : ""}`}>
                    <div className="aspect-[63/88] relative bg-muted">
                      {item.card.image ? (
                        <Image
                          src={item.card.image}
                          alt={item.card.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 20vw"
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                          No image
                        </div>
                      )}
                      <div className="absolute top-2 right-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">
                        ×{item.inventory.quantity}
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate" title={item.card.name}>
                        {item.card.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.card.episode?.code ?? "—"} · {item.card.rarity}
                      </p>
                      {(item.card.market_price != null || item.card.inventory_price != null) && (
                        <p className="text-xs font-medium mt-1">
                          ${(item.card.market_price ?? item.card.inventory_price ?? 0).toFixed(2)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
                return (
                  <li key={item.inventory.card_id}>
                    {readOnly ? cardEl : <Link href="/inventory">{cardEl}</Link>}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
