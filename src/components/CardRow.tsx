"use client";

/**
 * CardRow: single row for list view (browse).
 * Uses shadcn Card and Button.
 */

import Image from "next/image";
import type { ApiCard } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CardRowProps {
  card: ApiCard;
  onAdd: () => void;
  quantity?: number;
}

export function CardRow({ card, onAdd, quantity }: CardRowProps) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-3 flex flex-row items-center gap-3">
        <div className="relative w-12 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
          {card.image ? (
            <Image
              src={card.image}
              alt={card.name}
              fill
              sizes="48px"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
              —
            </div>
          )}
          {quantity != null && quantity > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {quantity}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{card.name}</p>
          <p className="text-xs text-muted-foreground">
            {card.episode?.code ?? "—"} · {card.rarity} · {card.color}
            {quantity != null && quantity > 0 && (
              <> · In inventory: {quantity}</>
            )}
            {(card.market_price != null || card.inventory_price != null) && (
              <> · ${(card.market_price ?? card.inventory_price ?? 0).toFixed(2)}</>
            )}
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onAdd} className="shrink-0">
          {quantity != null && quantity > 0 ? "Add more" : "Add"}
        </Button>
      </CardContent>
    </Card>
  );
}
