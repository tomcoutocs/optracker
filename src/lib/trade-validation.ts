/**
 * Shared trade item validation against inventory quantities.
 */

export interface TradeItemInput {
  card_id: string;
  quantity: number;
}

export function normalizeTradeItems(
  items: TradeItemInput[]
): TradeItemInput[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    if (!item?.card_id || typeof item.quantity !== "number" || item.quantity <= 0) continue;
    merged.set(item.card_id, (merged.get(item.card_id) ?? 0) + Math.floor(item.quantity));
  }
  return Array.from(merged.entries()).map(([card_id, quantity]) => ({
    card_id,
    quantity,
  }));
}

export function inventoryMapFromRows(
  rows: { card_id: string; quantity: number }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.card_id, (map.get(r.card_id) ?? 0) + r.quantity);
  }
  return map;
}

export function validateInventoryForItems(
  inventory: Map<string, number>,
  items: TradeItemInput[],
  label: string
): string | null {
  for (const { card_id, quantity } of items) {
    const have = inventory.get(card_id) ?? 0;
    if (have < quantity) {
      return `${label} insufficient quantity for card ${card_id} (need ${quantity}, have ${have})`;
    }
  }
  return null;
}
