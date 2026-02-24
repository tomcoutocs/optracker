/**
 * One Piece API integration.
 * Uses Next.js Route Handlers to proxy requests so API keys stay server-side.
 * Base: one-piece-api.com via RapidAPI (host: one-piece-tcg-prices.p.rapidapi.com).
 */

import type { ApiCard, ApiCardsResponse, ApiEpisode, ApiEpisodesResponse } from "@/types";

const RAPIDAPI_HOST = "one-piece-tcg-prices.p.rapidapi.com";
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;

function getHeaders(): HeadersInit {
  const key = process.env.RAPIDAPI_KEY || process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  if (!key) {
    console.warn("RAPIDAPI_KEY not set; One Piece API calls will fail.");
  }
  return {
    "x-rapidapi-host": RAPIDAPI_HOST,
    "x-rapidapi-key": key || "",
  };
}

/** Fetch cards with optional search and pagination (proxy from client to avoid exposing key) */
export async function fetchCards(params: {
  search?: string;
  page?: number;
  limit?: number;
  episodeId?: number;
}): Promise<{ cards: ApiCard[]; total: number }> {
  const { search, page = 1, limit = 24, episodeId } = params;
  const searchParams = new URLSearchParams();
  if (search) searchParams.set("search", search);
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  if (episodeId != null) searchParams.set("episode_id", String(episodeId));

  const url = `${RAPIDAPI_BASE}/cards?${searchParams.toString()}`;
  const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 300 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`One Piece API error: ${res.status} ${text}`);
  }
  const json: ApiCardsResponse = await res.json();
  const cards = normalizeCardsList(json);
  const total = typeof json.total === "number" ? json.total : cards.length;
  return { cards, total };
}

/** Fetch a single card by id */
export async function fetchCardById(id: string | number): Promise<ApiCard | null> {
  const res = await fetch(`${RAPIDAPI_BASE}/cards/${id}`, {
    headers: getHeaders(),
    next: { revalidate: 300 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`One Piece API error: ${res.status}`);
  const data = await res.json();
  return data as ApiCard;
}

/** Fetch multiple cards by id (for inventory join) */
export async function fetchCardsByIds(ids: string[]): Promise<ApiCard[]> {
  const unique = [...new Set(ids)];
  const results = await Promise.all(unique.map((id) => fetchCardById(id)));
  return results.filter((c): c is ApiCard => c != null);
}

/** Fetch episodes/sets for filter dropdown */
export async function fetchEpisodes(): Promise<ApiEpisode[]> {
  const res = await fetch(`${RAPIDAPI_BASE}/episodes`, {
    headers: getHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`One Piece API error: ${res.status} ${text}`);
  }
  const json: ApiEpisodesResponse = await res.json();
  const list = json.data ?? json.episodes ?? json.results ?? json.items;
  return Array.isArray(list) ? list : [];
}

/** Fetch cards for a single episode/set (e.g. GET /episodes/1/cards) */
export async function fetchCardsByEpisode(episodeId: number, params?: { sort?: string }): Promise<ApiCard[]> {
  const searchParams = new URLSearchParams();
  if (params?.sort) searchParams.set("sort", params.sort);
  const qs = searchParams.toString();
  const url = `${RAPIDAPI_BASE}/episodes/${episodeId}/cards${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 300 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`One Piece API episodes/${episodeId}/cards error: ${res.status} ${text}`);
  }
  const json: ApiCardsResponse = await res.json();
  const cards = normalizeCardsList(json);
  return cards;
}

/** Normalize different API response shapes into a single cards array */
function normalizeCardsList(json: ApiCardsResponse): ApiCard[] {
  if (Array.isArray(json.data)) return json.data as ApiCard[];
  if (Array.isArray(json.cards)) return json.cards;
  if (Array.isArray(json.results)) return json.results;
  if (Array.isArray(json.items)) return json.items;
  if (Array.isArray(json)) return json as ApiCard[];
  return [];
}
