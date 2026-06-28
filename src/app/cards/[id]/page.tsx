"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiCardById } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { useAddCard } from "@/hooks/useAddCard";
import { useWishlist, useToggleWishlist } from "@/hooks/useWishlist";
import { AddCardModal } from "@/components/AddCardModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";

export default function CardDetailPage() {
  const params = useParams();
  const cardId = typeof params.id === "string" ? params.id : "";
  const [userId, setUserId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  const { data: card, isLoading, isError } = useQuery({
    queryKey: ["card", cardId],
    queryFn: () => apiCardById(cardId),
    enabled: !!cardId,
  });

  const { data: wishlistIds = [] } = useWishlist(!!userId);
  const toggleWishlist = useToggleWishlist();
  const addCardMutation = useAddCard();

  const onWishlist = wishlistIds.includes(cardId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !card) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Card not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/">Back to browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap gap-8">
        <div className="w-full max-w-[280px] mx-auto sm:mx-0">
          <div className="aspect-[63/88] relative rounded-xl overflow-hidden bg-muted border border-border">
            {card.image ? (
              <Image src={card.image} alt={card.name} fill className="object-cover" sizes="280px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No image</div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{card.name}</h1>
            <p className="text-muted-foreground mt-1">{card.name_numbered ?? card.card_number}</p>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Set:</span> {card.episode?.code ?? "—"} — {card.episode?.name ?? "—"}</p>
              <p><span className="text-muted-foreground">Rarity:</span> {card.rarity}</p>
              <p><span className="text-muted-foreground">Color:</span> {card.color}</p>
              <p><span className="text-muted-foreground">Type:</span> {card.type ?? "—"}</p>
              {(card.market_price != null || card.inventory_price != null) && (
                <p>
                  <span className="text-muted-foreground">Price:</span> $
                  {(card.market_price ?? card.inventory_price ?? 0).toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            {userId ? (
              <>
                <Button onClick={() => setShowAdd(true)}>Add to inventory</Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => toggleWishlist.mutate({ cardId, onWishlist })}
                  disabled={toggleWishlist.isPending}
                >
                  <Heart className={`h-4 w-4 ${onWishlist ? "fill-current" : ""}`} />
                  {onWishlist ? "On wishlist" : "Add to wishlist"}
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/login">Log in to add cards</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/">Browse all cards</Link>
            </Button>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddCardModal
          card={card}
          onClose={() => setShowAdd(false)}
          onSave={(params) =>
            addCardMutation.mutate(
              {
                card_id: params.card_id,
                quantity: params.quantity,
                condition: params.condition as import("@/types").CardCondition | null,
                notes: params.notes,
              },
              { onSuccess: () => setShowAdd(false) }
            )
          }
          isPending={addCardMutation.isPending}
        />
      )}
    </div>
  );
}
