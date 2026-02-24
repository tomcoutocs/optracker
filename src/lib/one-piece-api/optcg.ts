/**
 * OPTCG API (optcgapi.com) - free, no API key.
 * Used when RapidAPI key is missing or returns 403/429.
 */

import type { ApiCard, ApiEpisode } from "@/types";

const OPTCG_BASE = "https://optcgapi.com/api";

interface OptcgSet {
  set_id: string;
  set_name: string;
}

interface OptcgCard {
  card_set_id?: string | null;
  card_image_id?: string | null;
  card_name?: string | null;
  set_id?: string | null;
  set_name?: string | null;
  rarity?: string | null;
  card_color?: string | null;
  card_type?: string | null;
  card_image?: string | null;
  inventory_price?: number | null;
  market_price?: number | null;
}

/** Fetch all sets from OPTCG -> map to ApiEpisode (assign sequential id) */
export async function fetchOptcgEpisodes(): Promise<ApiEpisode[]> {
  const res = await fetch(`${OPTCG_BASE}/allSets/?format=json`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`OPTCG API error: ${res.status} ${await res.text()}`);
  const sets: OptcgSet[] = await res.json();
  return sets.map((s, i) => ({
    id: i + 1,
    code: s.set_id,
    name: s.set_name,
  }));
}

/** Fetch all set cards from OPTCG -> map to ApiCard[] */
export async function fetchOptcgCards(): Promise<ApiCard[]> {
  const res = await fetch(`${OPTCG_BASE}/allSetCards/?format=json`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`OPTCG API error: ${res.status} ${await res.text()}`);
  const raw: OptcgCard[] = await res.json();
  const episodes = await fetchOptcgEpisodes();
  const setIdToEpisode = new Map(episodes.map((e) => [e.code, e]));
  const normalizeSetId = (setId: string): string => {
    if (setId.includes("-")) return setId;
    const m = setId.match(/^OP(\d+)$/i);
    if (m) return `OP-${m[1]}`;
    const m2 = setId.match(/^EB(\d+)$/i);
    if (m2) return `EB-${m2[1]}`;
    const m3 = setId.match(/^PRB(\d+)$/i);
    if (m3) return `PRB-${m3[1]}`;
    return setId;
  };

  const cards = raw
    .filter((c) => c.card_image_id || c.card_set_id)
    .map((c) => {
      const id = String(c.card_image_id ?? c.card_set_id ?? "");
      const setId = c.set_id ?? "";
      const code = normalizeSetId(setId);
      const episode = setIdToEpisode.get(code) ?? setIdToEpisode.get(setId) ?? { id: 0, code: setId, name: c.set_name ?? "" };
      return {
        id,
        name: c.card_name ?? "",
        name_numbered: `${c.card_name ?? ""} ${c.card_set_id ?? ""}`.trim(),
        slug: (c.card_image_id ?? c.card_set_id ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase(),
        type: c.card_type ?? undefined,
        card_number: c.card_set_id ?? "",
        rarity: c.rarity ?? "",
        color: c.card_color ?? "",
        image: c.card_image?.startsWith("http") ? c.card_image : c.card_image ? `https://optcgapi.com${c.card_image}` : "",
        episode,
        market_price: c.market_price != null ? Number(c.market_price) : null,
        inventory_price: c.inventory_price != null ? Number(c.inventory_price) : null,
      } as ApiCard;
    });
  const byId = new Map<string, ApiCard>();
  for (const card of cards) {
    const id = String(card.id);
    if (!byId.has(id)) byId.set(id, card);
  }
  return Array.from(byId.values());
}
