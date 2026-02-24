/**
 * Sync One Piece API data into Supabase (cards + episodes).
 * This is the only module that calls external card APIs (RapidAPI / OPTCG).
 * All other app reads use the database via lib/db/cards and API routes.
 * Uses RapidAPI when RAPIDAPI_KEY is set and working; falls back to free OPTCG API on 403/429 or missing key.
 */

import { createServerClient } from "@/lib/supabase/server";
import { fetchCards, fetchEpisodes, fetchCardsByEpisode } from "@/lib/one-piece-api/server";
import { fetchOptcgEpisodes, fetchOptcgCards } from "@/lib/one-piece-api/optcg";
import type { ApiCard, ApiEpisode } from "@/types";

const PAGE_SIZE = 100;

function isRapidApiError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("403") || msg.includes("429") || msg.includes("401");
}

/** Try RapidAPI episodes; on 403/429 or missing key, use OPTCG */
async function getEpisodes(): Promise<{ episodes: ApiEpisode[]; source: "rapidapi" | "optcg" }> {
  const key = process.env.RAPIDAPI_KEY || process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  if (!key) {
    const episodes = await fetchOptcgEpisodes();
    return { episodes, source: "optcg" };
  }
  try {
    const episodes = await fetchEpisodes();
    if (episodes.length > 0) return { episodes, source: "rapidapi" };
  } catch (e) {
    if (isRapidApiError(e)) {
      console.warn("[sync-cards] RapidAPI episodes failed, using OPTCG:", e instanceof Error ? e.message : e);
      const episodes = await fetchOptcgEpisodes();
      return { episodes, source: "optcg" };
    }
    throw e;
  }
  const episodes = await fetchOptcgEpisodes();
  return { episodes, source: "optcg" };
}

/** Try RapidAPI cards (global or by episode); on failure use OPTCG */
async function getAllCards(episodes: ApiEpisode[], source: "rapidapi" | "optcg"): Promise<ApiCard[]> {
  if (source === "optcg") {
    return fetchOptcgCards();
  }
  try {
    const first = await fetchCards({ page: 1, limit: PAGE_SIZE });
    if (first.cards.length > 0) {
      const all: ApiCard[] = [...first.cards];
      let page = 2;
      while (page * PAGE_SIZE < first.total) {
        const next = await fetchCards({ page, limit: PAGE_SIZE });
        all.push(...next.cards);
        page += 1;
        await new Promise((r) => setTimeout(r, 200));
      }
      return all;
    }
    const all: ApiCard[] = [];
    for (const ep of episodes) {
      try {
        const cards = await fetchCardsByEpisode(ep.id);
        all.push(...cards);
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        // skip episode
      }
    }
    return all;
  } catch (e) {
    if (isRapidApiError(e)) {
      console.warn("[sync-cards] RapidAPI cards failed, using OPTCG:", e instanceof Error ? e.message : e);
      return fetchOptcgCards();
    }
    throw e;
  }
}

export async function syncEpisodes(): Promise<{ inserted: number; source: string }> {
  const { episodes, source } = await getEpisodes();
  const supabase = createServerClient();

  if (episodes.length === 0) return { inserted: 0, source };

  const rows = episodes.map((ep: ApiEpisode) => ({
    id: ep.id,
    code: ep.code,
    name: ep.name,
  }));

  const { error } = await supabase.from("episodes").upsert(rows, {
    onConflict: "id",
    ignoreDuplicates: false,
  });
  if (error) throw error;
  return { inserted: rows.length, source };
}

function cardToRow(c: ApiCard) {
  return {
    id: String(c.id),
    name: c.name,
    name_numbered: c.name_numbered ?? null,
    slug: c.slug ?? null,
    type: c.type ?? null,
    card_number: c.card_number,
    rarity: c.rarity,
    color: c.color,
    image: c.image ?? null,
    episode_id: c.episode?.id != null && c.episode.id !== 0 ? c.episode.id : null,
    episode_code: c.episode?.code ?? null,
    episode_name: c.episode?.name ?? null,
    market_price: c.market_price != null ? c.market_price : null,
    inventory_price: c.inventory_price != null ? c.inventory_price : null,
  };
}

export async function syncCards(episodes: ApiEpisode[], source: "rapidapi" | "optcg"): Promise<{ total: number }> {
  const supabase = createServerClient();
  const cards = await getAllCards(episodes, source);

  if (cards.length === 0) return { total: 0 };

  const batchSize = 200;
  for (let i = 0; i < cards.length; i += batchSize) {
    const chunk = cards.slice(i, i + batchSize);
    const rows = chunk.map(cardToRow);
    const { error } = await supabase.from("cards").upsert(rows, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) throw error;
    await new Promise((r) => setTimeout(r, 100));
  }

  return { total: cards.length };
}

export async function runSync(): Promise<{ episodes: number; cards: number; source: string }> {
  const episodesResult = await syncEpisodes();
  const { episodes } = await getEpisodes();
  const cardsResult = await syncCards(episodes, episodesResult.source as "rapidapi" | "optcg");
  return {
    episodes: episodesResult.inserted,
    cards: cardsResult.total,
    source: episodesResult.source,
  };
}
