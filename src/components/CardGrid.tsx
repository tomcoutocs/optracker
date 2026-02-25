"use client";

/**
 * CardGrid: responsive grid of card thumbnails (browse view).
 * Uses shadcn Card and Button; lazy-loads images.
 */

import Image from "next/image";
import type { ApiCard } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardRow } from "./CardRow";

interface CardGridProps {
  cards: ApiCard[];
  onAdd: (card: ApiCard) => void;
  layout?: "grid" | "list";
  quantityByCardId?: Record<string, number>;
}

export function CardGrid({ cards, onAdd, layout = "grid", quantityByCardId = {} }: CardGridProps) {
  if (layout === "list") {
    return (
      <ul className="space-y-2">
        {cards.map((card) => (
          <CardRow
            key={String(card.id)}
            card={card}
            onAdd={() => onAdd(card)}
            quantity={quantityByCardId[String(card.id)]}
          />
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const quantity = quantityByCardId[String(card.id)];
        return (
        <li key={String(card.id)} className="group">
          <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/40">
            <div className="aspect-[63/88] relative bg-muted">
              {card.image ? (
                <Image
                  src={card.image}
                  alt={card.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  No image
                </div>
              )}
              {quantity != null && quantity > 0 && (
                <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                  {quantity}
                </span>
              )}
            </div>
            <CardContent className="p-3">
              <p className="font-medium text-sm truncate" title={card.name}>
                {card.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.episode?.code ?? "—"} · {card.rarity}
                {quantity != null && quantity > 0 && (
                  <> · In inventory: {quantity}</>
                )}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{card.color}</p>
              {(card.market_price != null || card.inventory_price != null) && (
                <p className="text-xs font-medium mt-1">
                  ${(card.market_price ?? card.inventory_price ?? 0).toFixed(2)}
                </p>
              )}
              <Button
                type="button"
                size="sm"
                className="mt-2 w-full"
                onClick={() => onAdd(card)}
              >
                Add to inventory
              </Button>
            </CardContent>
          </Card>
        </li>
      );
      })}
    </ul>
  );
}
