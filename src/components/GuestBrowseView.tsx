"use client";

/**
 * Read-only browse for guests on the landing page.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { CardGrid } from "@/components/CardGrid";
import { FiltersPanel } from "@/components/FiltersPanel";
import { Button } from "@/components/ui/button";
import { useCards } from "@/hooks/useCards";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useSyncStatus } from "@/hooks/useSyncStatus";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 48;

export function GuestBrowseView() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [episodeId, setEpisodeId] = useState<number | null>(null);
  const [rarity, setRarity] = useState("");
  const [color, setColor] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, episodeId, rarity, color]);

  const { data, isLoading, isError, error } = useCards({
    search: debouncedSearch,
    page,
    limit: PAGE_SIZE,
    episodeId,
    color: color || undefined,
    rarity: rarity || undefined,
  });
  const { data: episodes = [] } = useEpisodes();
  const { data: filterOptions } = useFilterOptions();
  const { data: syncStatus } = useSyncStatus();

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const hasMore = page * PAGE_SIZE < total;
  const rarities = filterOptions?.rarities ?? [];
  const colors = filterOptions?.colors ?? [];

  return (
    <div className="mt-12 w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Browse the card catalog</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sign up to add cards to your inventory and build decks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant={layout === "grid" ? "default" : "outline"} size="sm" onClick={() => setLayout("grid")}>
            Grid
          </Button>
          <Button type="button" variant={layout === "list" ? "default" : "outline"} size="sm" onClick={() => setLayout("list")}>
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
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
          {error instanceof Error ? error.message : "Failed to load cards."}
        </p>
      )}
      {isLoading && <p className="text-muted-foreground">Loading cards…</p>}
      {!isLoading && !isError && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {cards.length} of {total} cards
          </p>
          <CardGrid cards={cards} onAdd={() => {}} layout={layout} readOnly />
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {page > 1 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
            )}
            {hasMore && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                Load more
              </Button>
            )}
          </div>
        </>
      )}

      {syncStatus?.last_sync_at && (
        <p className="text-center text-xs text-muted-foreground">
          Catalog updated {new Date(syncStatus.last_sync_at).toLocaleString()}
          {syncStatus.cards_count > 0 && ` · ${syncStatus.cards_count.toLocaleString()} cards`}
        </p>
      )}

      <div className="flex justify-center gap-3 pt-4">
        <Button asChild>
          <Link href="/signup">Sign up free</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </div>
  );
}
