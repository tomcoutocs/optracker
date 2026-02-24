/**
 * Shared types for One Piece API responses and app domain.
 * Card metadata comes from API; we only persist inventory overlay in Supabase.
 */

/** Episode/set from One Piece API */
export interface ApiEpisode {
  id: number;
  name: string;
  code: string;
}

/** Single card from One Piece API (RapidAPI or OPTCG) */
export interface ApiCard {
  id: number | string;
  name: string;
  name_numbered?: string;
  slug: string;
  type?: string;
  card_number: string;
  rarity: string;
  color: string;
  image: string;
  episode: ApiEpisode;
  /** Market price (e.g. TCGPlayer), optional */
  market_price?: number | null;
  /** Inventory/list price, optional */
  inventory_price?: number | null;
  prices?: Record<string, unknown>;
}

/** Paginated list from API - support multiple response shapes */
export interface ApiCardsResponse {
  data?: ApiCard[];
  cards?: ApiCard[];
  results?: ApiCard[];
  items?: ApiCard[];
  total?: number;
  count?: number;
  [key: string]: unknown;
}

/** Episodes/sets list */
export interface ApiEpisodesResponse {
  data?: ApiEpisode[];
  episodes?: ApiEpisode[];
  [key: string]: unknown;
}

/** We use string card_id (API id) in inventory */
export type CardId = string;

/** Inventory row in Supabase - only overlay data */
export interface InventoryRow {
  id: string;
  card_id: CardId;
  quantity: number;
  condition: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

/** Card + inventory for inventory page (join in app layer) */
export interface InventoryCard {
  card: ApiCard;
  inventory: InventoryRow;
}

/** Condition options for Add Card modal */
export const CARD_CONDITIONS = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;

export type CardCondition = (typeof CARD_CONDITIONS)[number];
