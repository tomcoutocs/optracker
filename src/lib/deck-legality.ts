/**
 * One Piece TCG deck legality checks (simplified).
 * Leader is separate; main deck is 50 cards; max 4 copies per card (leader max 1).
 */

import type { ApiCard } from "@/types";

export interface DeckCardEntry {
  card_id: string;
  quantity: number;
  card?: ApiCard | null;
}

export interface DeckLegalityResult {
  valid: boolean;
  totalCards: number;
  leaderCount: number;
  issues: string[];
}

const MAIN_DECK_SIZE = 50;
const MAX_COPIES = 4;
const MAX_LEADER = 1;

export function checkDeckLegality(entries: DeckCardEntry[]): DeckLegalityResult {
  const issues: string[] = [];
  let totalCards = 0;
  let leaderCount = 0;

  for (const entry of entries) {
    const qty = entry.quantity ?? 0;
    totalCards += qty;
    const type = entry.card?.type?.toLowerCase() ?? "";
    if (type === "leader") {
      leaderCount += qty;
      if (qty > MAX_LEADER) {
        issues.push(`Leader "${entry.card?.name ?? entry.card_id}" can only appear once.`);
      }
    } else if (qty > MAX_COPIES) {
      issues.push(
        `"${entry.card?.name ?? entry.card_id}" exceeds ${MAX_COPIES} copies (${qty}).`
      );
    }
  }

  if (leaderCount === 0) {
    issues.push("Deck should include exactly one Leader card.");
  } else if (leaderCount > MAX_LEADER) {
    issues.push(`Deck has ${leaderCount} leaders; only ${MAX_LEADER} allowed.`);
  }

  const mainDeckCount = totalCards - leaderCount;
  if (mainDeckCount > MAIN_DECK_SIZE) {
    issues.push(
      `Main deck has ${mainDeckCount} cards; maximum is ${MAIN_DECK_SIZE} (excluding leader).`
    );
  }

  return {
    valid: issues.length === 0,
    totalCards,
    leaderCount,
    issues,
  };
}
