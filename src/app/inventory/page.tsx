"use client";

/**
 * Inventory page: two views – Collections (by set + completion) or Search (flat table).
 * User can switch between them; filters apply in both.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { InventoryTable } from "@/components/InventoryTable";
import { FiltersPanel } from "@/components/FiltersPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInventoryCards } from "@/hooks/useInventoryCards";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useActiveDeckCards } from "@/hooks/useActiveDeckCards";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useEpisodeCounts } from "@/hooks/useEpisodeCounts";
import { useAddCard } from "@/hooks/useAddCard";
import { useRemoveCard } from "@/hooks/useRemoveCard";
import { ChevronRight, LayoutGrid, Search } from "lucide-react";

export default function InventoryPage() {
  const [view, setView] = useState<"collections" | "search">("search");
  const [search, setSearch] = useState("");
  const [episodeId, setEpisodeId] = useState<number | null>(null);
  const [rarity, setRarity] = useState("");
  const [color, setColor] = useState("");
  const { user, isLoading: authLoading } = useAuthUser();
  const { items, inventory, isLoading, isError, error } = useInventoryCards();
  const { data: decksByCard = {} } = useActiveDeckCards();
  const { data: episodes = [] } = useEpisodes();
  const { data: episodeCounts = [] } = useEpisodeCounts();
  const { data: filterOptions } = useFilterOptions();
  const addCard = useAddCard();
  const removeCard = useRemoveCard();

  const rarities = filterOptions?.rarities ?? [];
  const colors = filterOptions?.colors ?? [];

  const totalInSetByEpisode = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of episodeCounts) m.set(c.episode_id, c.count);
    return m;
  }, [episodeCounts]);

  const ownedUniqueByEpisode = useMemo(() => {
    const m = new Map<number, Set<string>>();
    for (const x of items) {
      const id = x.card.episode?.id;
      if (id == null || id === 0) continue;
      if (!m.has(id)) m.set(id, new Set());
      m.get(id)!.add(String(x.card.id));
    }
    const out = new Map<number, number>();
    m.forEach((set, episodeId) => out.set(episodeId, set.size));
    return out;
  }, [items]);

  const ownedEpisodeIds = useMemo(
    () => episodes.filter((ep) => (ownedUniqueByEpisode.get(ep.id) ?? 0) > 0),
    [episodes, ownedUniqueByEpisode]
  );

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
    if (rarity) {
      list = list.filter((x) => x.card.rarity === rarity);
    }
    if (color) {
      list = list.filter((x) => x.card.color === color);
    }
    return list;
  }, [items, search, episodeId, rarity, color]);

  const filteredByEpisode = useMemo(() => {
    const m = new Map<number, typeof filteredItems>();
    for (const x of filteredItems) {
      const id = x.card.episode?.id;
      if (id == null) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(x);
    }
    return m;
  }, [filteredItems]);

  const totalValue = useMemo(() => {
    return items.reduce((sum, x) => {
      const price = x.card.market_price ?? x.card.inventory_price ?? 0;
      return sum + x.inventory.quantity * Number(price);
    }, 0);
  }, [items]);

  const handleDecrement = (cardId: string) => {
    removeCard.mutate({ card_id: cardId, decrement: true });
  };
  const handleRemove = (cardId: string) => {
    removeCard.mutate({ card_id: cardId, decrement: false });
  };
  const handleIncrement = (cardId: string) => {
    addCard.mutate({ card_id: cardId, quantity: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          {!isLoading && !isError && (
            <p className="text-sm text-muted-foreground mt-1">
              {inventory.length} cards · Total value:{" "}
              <span className="font-semibold text-foreground">${totalValue.toFixed(2)}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">View</span>
          <Button
            type="button"
            variant={view === "collections" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("collections")}
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            Collections
          </Button>
          <Button
            type="button"
            variant={view === "search" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("search")}
            className="gap-1.5"
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      {view === "search" && (
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
      )}

      {isError && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
          {error instanceof Error ? error.message : "Failed to load inventory."}
        </p>
      )}
      {!authLoading && !user && (
        <p className="text-sm text-foreground">
          Sign in to view your inventory.{" "}
          <Link href="/login" className="font-medium underline underline-offset-4">
            Log in
          </Link>
        </p>
      )}
      {user && isLoading && <p className="text-muted-foreground">Loading inventory…</p>}
      {!authLoading && user && !isLoading && !isError && view === "search" && (
        <InventoryTable
          items={filteredItems}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
        />
      )}
      {!authLoading && user && !isLoading && !isError && view === "collections" && ownedEpisodeIds.length === 0 && items.length > 0 && (
        <p className="text-sm text-foreground/80">
          No sets matched your cards for grouping. Use Search view to see your full inventory.
        </p>
      )}
      {!authLoading && user && !isLoading && !isError && view === "collections" && (
        <div className="space-y-3">
          {ownedEpisodeIds.map((ep) => {
            const totalInSet = totalInSetByEpisode.get(ep.id) ?? 0;
            const ownedUnique = ownedUniqueByEpisode.get(ep.id) ?? 0;
            const progressPct = totalInSet > 0 ? Math.round((ownedUnique / totalInSet) * 100) : 0;
            const sectionItems = filteredByEpisode.get(ep.id) ?? [];
            return (
              <Collapsible key={ep.id} defaultOpen={false} className="group">
                <Card>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full text-left p-4 flex flex-wrap items-center gap-3 hover:bg-muted/50 transition-colors rounded-t-lg"
                    >
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                      <span className="font-medium">
                        {ep.code} – {ep.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {ownedUnique} / {totalInSet} cards
                      </span>
                      <div className="flex-1 min-w-[120px] max-w-[200px] ml-auto">
                        <Progress value={progressPct} className="h-2" />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {sectionItems.length > 0 ? (
                        <InventoryTable
                          items={sectionItems}
                          onIncrement={handleIncrement}
                          onDecrement={handleDecrement}
                          onRemove={handleRemove}
                          decksByCard={decksByCard}
                        />
                      ) : (
                        <p className="py-6 text-center text-muted-foreground text-sm">
                          No cards in this set
                          {(search || episodeId != null || rarity || color) && " match the current filters."}
                        </p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
          {items.length === 0 && episodes.length > 0 && (
            <p className="text-muted-foreground text-sm">
              No cards in your inventory yet. Browse cards and add them to get started.
            </p>
          )}
          {items.length > 0 && ownedEpisodeIds.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Your inventory cards could not be grouped by set. Switch to Search view to see them.
            </p>
          )}
          {episodes.length === 0 && (
            <p className="text-muted-foreground text-sm">No sets loaded. Run a card sync.</p>
          )}
        </div>
      )}
    </div>
  );
}
