/**
 * Client-side fetchers for our Next.js API routes.
 * All card and episode data is read from our database (Supabase); only the daily sync calls external APIs.
 */

import type { ApiCard, ApiEpisode } from "@/types";

const API = "/api";

export async function apiCards(params: {
  search?: string;
  page?: number;
  limit?: number;
  episodeId?: number;
  color?: string;
  rarity?: string;
}): Promise<{ cards: ApiCard[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.episodeId != null) sp.set("episodeId", String(params.episodeId));
  if (params.color) sp.set("color", params.color);
  if (params.rarity) sp.set("rarity", params.rarity);
  const res = await fetch(`${API}/cards?${sp.toString()}`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || res.statusText);
  }
  return res.json();
}

export async function apiCardById(id: string): Promise<ApiCard | null> {
  const res = await fetch(`${API}/cards/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || res.statusText);
  }
  return res.json();
}

export async function apiEpisodes(): Promise<ApiEpisode[]> {
  const res = await fetch(`${API}/episodes`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || res.statusText);
  }
  return res.json();
}
