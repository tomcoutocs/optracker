"use client";

/**
 * FiltersPanel: search + set/rarity/color filters for browse page.
 * Uses shadcn Input and Select.
 */

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface FiltersPanelProps {
  search: string;
  onSearchChange: (v: string) => void;
  episodeId: number | null;
  onEpisodeIdChange: (v: number | null) => void;
  rarity: string;
  onRarityChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
  episodes: { id: number; code: string; name: string }[];
  rarities: string[];
  colors: string[];
}

export function FiltersPanel({
  search,
  onSearchChange,
  episodeId,
  onEpisodeIdChange,
  rarity,
  onRarityChange,
  color,
  onColorChange,
  episodes,
  rarities,
  colors,
}: FiltersPanelProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px] space-y-2">
            <label htmlFor="search" className="text-xs font-medium text-muted-foreground">
              Search
            </label>
            <Input
              id="search"
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Card name or number..."
            />
          </div>
          <div className="min-w-[160px] space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Set</label>
            <Select
              value={episodeId != null ? String(episodeId) : "all"}
              onValueChange={(v) => onEpisodeIdChange(v === "all" ? null : Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sets</SelectItem>
                {episodes.map((ep) => (
                  <SelectItem key={ep.id} value={String(ep.id)}>
                    {ep.code} – {ep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px] space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Rarity</label>
            <Select value={rarity || "all"} onValueChange={(v) => onRarityChange(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {rarities.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[110px] space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <Select value={color || "all"} onValueChange={(v) => onColorChange(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {colors.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
