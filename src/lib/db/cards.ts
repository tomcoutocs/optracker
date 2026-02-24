/**
 * Read cards and episodes from Supabase (synced data).
 * Used by API routes so the app doesn't ping the external API on every request.
 */

import { createServerClient } from "@/lib/supabase/server";
import type { ApiCard, ApiEpisode } from "@/types";

/** Row shape from public.cards */
interface CardRow {
  id: string;
  name: string;
  name_numbered: string | null;
  slug: string | null;
  type: string | null;
  card_number: string;
  rarity: string;
  color: string;
  image: string | null;
  episode_id: number | null;
  episode_code: string | null;
  episode_name: string | null;
  market_price: number | null;
  inventory_price: number | null;
}

function toApiCard(row: CardRow): ApiCard {
  const id = /^\d+$/.test(row.id) ? parseInt(row.id, 10) : row.id;
  return {
    id,
    name: row.name,
    name_numbered: row.name_numbered ?? undefined,
    slug: row.slug ?? "",
    type: row.type ?? undefined,
    card_number: row.card_number,
    rarity: row.rarity,
    color: row.color,
    image: row.image ?? "",
    episode: row.episode_id != null
      ? { id: row.episode_id, code: row.episode_code ?? "", name: row.episode_name ?? "" }
      : { id: 0, code: "", name: "" },
    market_price: row.market_price ?? undefined,
    inventory_price: row.inventory_price ?? undefined,
  };
}

export async function getCardsFromDb(params: {
  search?: string;
  page?: number;
  limit?: number;
  episodeId?: number | null;
  color?: string | null;
  rarity?: string | null;
}): Promise<{ cards: ApiCard[]; total: number }> {
  const supabase = createServerClient();
  const { search = "", page = 1, limit = 24, episodeId, color, rarity } = params;
  const from = (page - 1) * limit;

  let query = supabase.from("cards").select("id,name,name_numbered,slug,type,card_number,rarity,color,image,episode_id,episode_code,episode_name,market_price,inventory_price", { count: "exact" });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},card_number.ilike.${term}`);
  }
  if (episodeId != null) {
    query = query.eq("episode_id", episodeId);
  }
  if (color?.trim()) {
    query = query.eq("color", color.trim());
  }
  if (rarity?.trim()) {
    query = query.eq("rarity", rarity.trim());
  }

  query = query.order("card_number").range(from, from + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;

  const cards = (data as CardRow[] ?? []).map(toApiCard);
  return { cards, total: count ?? cards.length };
}

export async function getCardByIdFromDb(id: string): Promise<ApiCard | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toApiCard(data as CardRow) : null;
}

export async function getCardsByIdsFromDb(ids: string[]): Promise<ApiCard[]> {
  if (ids.length === 0) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return (data as CardRow[] ?? []).map(toApiCard);
}

export async function getEpisodesFromDb(): Promise<ApiEpisode[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("episodes")
    .select("id,code,name")
    .order("code");
  if (error) throw error;
  return (data ?? []).map((r: { id: number; code: string; name: string }) => ({
    id: r.id,
    code: r.code,
    name: r.name,
  }));
}

/** All distinct colors and rarities in the cards table (for filter dropdowns). Uses DB DISTINCT. */
export async function getDistinctFilters(): Promise<{ colors: string[]; rarities: string[] }> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("get_distinct_card_filters");
  if (error) throw error;
  const result = data as { colors: string[]; rarities: string[] } | null;
  return {
    colors: Array.isArray(result?.colors) ? result.colors : [],
    rarities: Array.isArray(result?.rarities) ? result.rarities : [],
  };
}

/** Card count per episode (for set completion progress). */
export async function getEpisodeCardCounts(): Promise<{ episode_id: number; count: number }[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("get_episode_card_counts");
  if (error) throw error;
  const rows = (data ?? []) as { episode_id: number; count: number }[];
  return rows.map((r) => ({ episode_id: r.episode_id, count: Number(r.count) }));
}
