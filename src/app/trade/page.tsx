"use client";

/**
 * Trade page: Steam-like user-to-user trade UI.
 * Split view: left = my inventory + my offer, right = their inventory + their offer.
 * Click card images to add to trade sections; total price shown at top of each side.
 */

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useInventoryCards } from "@/hooks/useInventoryCards";
import { useUserProfileData, useSearchUsers } from "@/hooks/useProfile";
import { useCreateTrade, useTrades, useRespondToTrade, type Trade } from "@/hooks/useTrades";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Check, Loader2, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiCard } from "@/types";

type OfferMap = Map<string, number>;

function getPrice(card: ApiCard): number {
  return Number(card.market_price ?? card.inventory_price ?? 0);
}

function TradeSideCard({
  card,
  quantity,
  onRemove,
}: {
  card: ApiCard;
  quantity: number;
  onRemove: () => void;
}) {
  const price = getPrice(card);
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onRemove}
        className="block w-full text-left rounded-lg border bg-card hover:bg-muted/50 transition-colors overflow-hidden"
      >
        <div className="relative w-[80px] h-[107px] mx-auto shrink-0">
          {card.image ? (
            <Image
              src={card.image}
              alt={card.name}
              fill
              sizes="80px"
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
              —
            </div>
          )}
          {quantity > 1 && (
            <span className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-1.5 rounded-tl">
              ×{quantity}
            </span>
          )}
        </div>
        <p className="text-xs truncate px-1 py-0.5" title={card.name}>
          {card.name}
        </p>
        <p className="text-[10px] text-muted-foreground px-1 pb-1">${(price * quantity).toFixed(2)}</p>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function InventoryCardThumb({
  card,
  available,
  onAdd,
}: {
  card: ApiCard;
  available: number;
  onAdd: () => void;
}) {
  const price = getPrice(card);
  if (available <= 0) return null;
  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full rounded border bg-card hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all overflow-hidden text-left"
    >
      <div className="relative w-full aspect-[3/4]">
        {card.image ? (
          <Image
            src={card.image}
            alt={card.name}
            fill
            sizes="120px"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            —
          </div>
        )}
        <span className="absolute bottom-0 right-0 bg-background/90 text-xs font-medium px-1.5 rounded-tl">
          ×{available}
        </span>
      </div>
      <p className="text-xs truncate px-0.5 py-0.5" title={card.name}>
        {card.name}
      </p>
      <p className="text-[10px] text-muted-foreground px-0.5 pb-0.5">${price.toFixed(2)}</p>
    </button>
  );
}

function TradeProposalCard({
  trade,
  cardMap,
  onAccept,
  onReject,
}: {
  trade: Trade;
  cardMap: Map<string, ApiCard>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const isIncoming = trade.to_username && trade.is_pending_for_me;
  const statusColor =
    trade.status === "accepted"
      ? "bg-green-500/20 text-green-600 dark:text-green-400"
      : trade.status === "rejected"
        ? "bg-red-500/20 text-red-600 dark:text-red-400"
        : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {isIncoming ? trade.from_username : trade.to_username}
            </span>
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColor}`}>
              {trade.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(trade.created_at).toLocaleDateString()}
            </span>
          </div>
          {isIncoming && trade.status === "pending" && (
            <div className="flex gap-1">
              <Button size="sm" variant="default" className="gap-1" onClick={() => onAccept(trade.id)}>
                <Check className="h-3.5 w-3.5" />
                Accept
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onReject(trade.id)}>
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {isIncoming ? "They offer" : "You offer"}
            </p>
            <div className="flex flex-wrap gap-1">
              {(trade.from_items ?? []).map((item: { card_id: string; quantity: number }) => {
                const card = cardMap.get(item.card_id);
                return (
                  <div
                    key={item.card_id}
                    className="flex items-center gap-1 rounded border px-1.5 py-0.5 bg-muted/50"
                  >
                    {card?.image && (
                      <div className="relative w-6 h-8 shrink-0">
                        <Image src={card.image} alt={card.name} fill sizes="24px" className="object-cover rounded-sm" />
                      </div>
                    )}
                    <span className="truncate max-w-[80px]">{card?.name ?? item.card_id}</span>
                    <span className="text-muted-foreground">×{item.quantity}</span>
                  </div>
                );
              })}
              {(!trade.from_items || trade.from_items.length === 0) && (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {isIncoming ? "They want" : "You want"}
            </p>
            <div className="flex flex-wrap gap-1">
              {(trade.to_items ?? []).map((item: { card_id: string; quantity: number }) => {
                const card = cardMap.get(item.card_id);
                return (
                  <div
                    key={item.card_id}
                    className="flex items-center gap-1 rounded border px-1.5 py-0.5 bg-muted/50"
                  >
                    {card?.image && (
                      <div className="relative w-6 h-8 shrink-0">
                        <Image src={card.image} alt={card.name} fill sizes="24px" className="object-cover rounded-sm" />
                      </div>
                    )}
                    <span className="truncate max-w-[80px]">{card?.name ?? item.card_id}</span>
                    <span className="text-muted-foreground">×{item.quantity}</span>
                  </div>
                );
              })}
              {(!trade.to_items || trade.to_items.length === 0) && (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TradeColumn({
  title,
  totalValue,
  offerItems,
  offerMap,
  onRemoveFromOffer,
  inventorySection,
  inventorySearch,
  onInventorySearchChange,
  headerAction,
}: {
  title: string;
  totalValue: number;
  offerItems: { card: ApiCard; quantity: number }[];
  offerMap: OfferMap;
  onRemoveFromOffer: (cardId: string) => void;
  inventorySection: React.ReactNode;
  inventorySearch?: string;
  onInventorySearchChange?: (value: string) => void;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full min-h-[500px]">
      <div className="shrink-0 flex items-center justify-between gap-2 py-2 px-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{title}</span>
          {headerAction}
        </div>
        <span className="text-sm font-semibold shrink-0">${totalValue.toFixed(2)}</span>
      </div>
      <div className="shrink-0 p-3 border-b bg-muted/10">
        <p className="text-xs text-muted-foreground mb-2">Trade section — click cards below to add</p>
        {offerItems.length === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-lg border border-dashed text-muted-foreground text-sm">
            Empty
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {offerItems.map(({ card, quantity }) => (
              <TradeSideCard
                key={card.id}
                card={card}
                quantity={quantity}
                onRemove={() => onRemoveFromOffer(String(card.id))}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs text-muted-foreground shrink-0">Inventory</p>
          {onInventorySearchChange != null && (
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                type="search"
                placeholder="Search cards..."
                value={inventorySearch ?? ""}
                onChange={(e) => onInventorySearchChange(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          )}
        </div>
        {inventorySection}
      </div>
    </div>
  );
}

type TradeView = "proposals" | "new-trade";

export default function TradePage() {
  const [view, setView] = useState<TradeView>("proposals");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [myOffer, setMyOffer] = useState<OfferMap>(new Map());
  const [theirOffer, setTheirOffer] = useState<OfferMap>(new Map());
  const [myCardSearch, setMyCardSearch] = useState("");
  const [theirCardSearch, setTheirCardSearch] = useState("");

  const { items: myItems, isLoading: myLoading } = useInventoryCards();
  const { data: trades = [], isLoading: tradesLoading, refetch: refetchTrades } = useTrades();
  const respondToTrade = useRespondToTrade();
  const { data: theirData, isLoading: theirLoading } = useUserProfileData(selectedUsername);
  const { data: searchUsers = [] } = useSearchUsers(debouncedSearch);
  const createTrade = useCreateTrade();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const proposalCardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of trades) {
      for (const item of t.from_items ?? []) ids.add(item.card_id);
      for (const item of t.to_items ?? []) ids.add(item.card_id);
    }
    return Array.from(ids);
  }, [trades]);

  const { data: proposalCards = [] } = useQuery({
    queryKey: ["cards-batch", proposalCardIds.join(",")],
    queryFn: async (): Promise<ApiCard[]> => {
      if (proposalCardIds.length === 0) return [];
      const res = await fetch(`/api/cards/batch?ids=${encodeURIComponent(proposalCardIds.join(","))}`);
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: proposalCardIds.length > 0 && view === "proposals",
    staleTime: 5 * 60 * 1000,
  });

  const proposalCardMap = useMemo(() => {
    const m = new Map<string, ApiCard>();
    for (const c of proposalCards) m.set(String(c.id), c);
    return m;
  }, [proposalCards]);

  const pendingIncoming = trades.filter((t) => t.is_pending_for_me);
  const incomingTrades = trades.filter((t) => t.to_username && !t.is_mine_outgoing);
  const outgoingTrades = trades.filter((t) => t.is_mine_outgoing);

  const theirItems: { card: ApiCard; inventory: { quantity: number } }[] = useMemo(() => {
    if (!theirData?.inventoryItems) return [];
    return (theirData.inventoryItems as { card: ApiCard; inventory: { quantity: number } }[]).filter(
      (x) => x.card && x.inventory && x.inventory.quantity > 0
    );
  }, [theirData]);

  const filteredMyItems = useMemo(() => {
    if (!myCardSearch.trim()) return myItems;
    const q = myCardSearch.trim().toLowerCase();
    return myItems.filter(
      (x) =>
        x.card.name.toLowerCase().includes(q) ||
        (x.card.card_number ?? "").toLowerCase().includes(q) ||
        (x.card.rarity ?? "").toLowerCase().includes(q) ||
        (x.card.color ?? "").toLowerCase().includes(q)
    );
  }, [myItems, myCardSearch]);

  const filteredTheirItems = useMemo(() => {
    if (!theirCardSearch.trim()) return theirItems;
    const q = theirCardSearch.trim().toLowerCase();
    return theirItems.filter(
      (x) =>
        x.card.name.toLowerCase().includes(q) ||
        (x.card.card_number ?? "").toLowerCase().includes(q) ||
        (x.card.rarity ?? "").toLowerCase().includes(q) ||
        (x.card.color ?? "").toLowerCase().includes(q)
    );
  }, [theirItems, theirCardSearch]);

  const myOfferList = useMemo(() => {
    return myItems
      .map((item) => ({ card: item.card, quantity: myOffer.get(String(item.card.id)) ?? 0 }))
      .filter((x) => x.quantity > 0);
  }, [myItems, myOffer]);

  const theirOfferList = useMemo(() => {
    return theirItems
      .map((item) => ({ card: item.card, quantity: theirOffer.get(String(item.card.id)) ?? 0 }))
      .filter((x) => x.quantity > 0);
  }, [theirItems, theirOffer]);

  const myOfferTotal = useMemo(() => {
    return myOfferList.reduce((s, { card, quantity }) => s + getPrice(card) * quantity, 0);
  }, [myOfferList]);

  const theirOfferTotal = useMemo(() => {
    return theirOfferList.reduce((s, { card, quantity }) => s + getPrice(card) * quantity, 0);
  }, [theirOfferList]);

  const addToMyOffer = (cardId: string) => {
    const item = myItems.find((i) => String(i.card.id) === cardId);
    if (!item) return;
    const offered = myOffer.get(cardId) ?? 0;
    if (offered >= item.inventory.quantity) return;
    setMyOffer((m) => new Map(m).set(cardId, offered + 1));
  };

  const removeFromMyOffer = (cardId: string) => {
    setMyOffer((m) => {
      const next = new Map(m);
      const v = (next.get(cardId) ?? 1) - 1;
      if (v <= 0) next.delete(cardId);
      else next.set(cardId, v);
      return next;
    });
  };

  const addToTheirOffer = (cardId: string) => {
    const item = theirItems.find((i) => String(i.card.id) === cardId);
    if (!item) return;
    const inv = item.inventory as { quantity: number };
    const offered = theirOffer.get(cardId) ?? 0;
    if (offered >= inv.quantity) return;
    setTheirOffer((m) => new Map(m).set(cardId, offered + 1));
  };

  const removeFromTheirOffer = (cardId: string) => {
    setTheirOffer((m) => {
      const next = new Map(m);
      const v = (next.get(cardId) ?? 1) - 1;
      if (v <= 0) next.delete(cardId);
      else next.set(cardId, v);
      return next;
    });
  };

  const canSendProposal =
    selectedUsername &&
    theirData?.profile?.id &&
    (myOfferList.length > 0 || theirOfferList.length > 0);

  const handleSendProposal = () => {
    if (!canSendProposal || !theirData?.profile?.id) return;
    const fromItems = myOfferList.map(({ card, quantity }) => ({ card_id: String(card.id), quantity }));
    const toItems = theirOfferList.map(({ card, quantity }) => ({ card_id: String(card.id), quantity }));
    createTrade.mutate(
      { toUserId: theirData.profile.id, fromItems, toItems },
      {
        onSuccess: () => {
          setMyOffer(new Map());
          setTheirOffer(new Map());
          setView("proposals");
          refetchTrades();
        },
      }
    );
  };

  const handleAccept = (id: string) => respondToTrade.mutate({ tradeId: id, action: "accept" });
  const handleReject = (id: string) => respondToTrade.mutate({ tradeId: id, action: "reject" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-7 w-7" />
          <h1 className="text-2xl font-bold tracking-tight">Trade</h1>
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === "proposals" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("proposals")}
          >
            Proposals
            {pendingIncoming.length > 0 && (
              <span className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                view === "proposals" ? "bg-primary-foreground/25" : "bg-primary/20"
              )}>
                {pendingIncoming.length}
              </span>
            )}
          </Button>
          <Button
            variant={view === "new-trade" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("new-trade")}
          >
            New trade
          </Button>
          {view === "new-trade" && canSendProposal && (
            <Button onClick={handleSendProposal} disabled={createTrade.isPending} size="sm">
              {createTrade.isPending ? "Sending…" : "Send proposal"}
            </Button>
          )}
        </div>
      </div>

      {view === "proposals" ? (
        <>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchTrades()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          {tradesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : trades.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No trade proposals yet.</p>
                <Button variant="link" className="mt-2" onClick={() => setView("new-trade")}>
                  Create a trade
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {incomingTrades.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-3">Incoming</h2>
                  <ul className="space-y-3">
                    {incomingTrades.map((t) => (
                      <li key={t.id}>
                        <TradeProposalCard
                          trade={t}
                          cardMap={proposalCardMap}
                          onAccept={handleAccept}
                          onReject={handleReject}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {outgoingTrades.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-3">Outgoing</h2>
                  <ul className="space-y-3">
                    {outgoingTrades.map((t) => (
                      <li key={t.id}>
                        <TradeProposalCard
                          trade={t}
                          cardMap={proposalCardMap}
                          onAccept={handleAccept}
                          onReject={handleReject}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      ) : (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0 h-full">
            <TradeColumn
              title="Your offer"
              totalValue={myOfferTotal}
              offerItems={myOfferList}
              offerMap={myOffer}
              onRemoveFromOffer={removeFromMyOffer}
              inventorySearch={myCardSearch}
              onInventorySearchChange={setMyCardSearch}
              inventorySection={
                myLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : myItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Your inventory is empty.</p>
                ) : filteredMyItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No cards match your search.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-0.5">
                    {filteredMyItems.map((item) => (
                      <InventoryCardThumb
                        key={item.card.id}
                        card={item.card}
                        available={item.inventory.quantity - (myOffer.get(String(item.card.id)) ?? 0)}
                        onAdd={() => addToMyOffer(String(item.card.id))}
                      />
                    ))}
                  </div>
                )
              }
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0 h-full">
            <div className="flex flex-col h-full">
              {!selectedUsername && (
                <div className="shrink-0 p-3 border-b bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-2">Select user to trade with</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search username..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {searchUsers.slice(0, 8).map((u) => (
                      <Button
                        key={u.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUsername(u.username)}
                      >
                        {u.username}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0">
              <TradeColumn
                title={selectedUsername ? `${selectedUsername}'s offer` : "Their offer"}
                totalValue={theirOfferTotal}
                offerItems={theirOfferList}
                offerMap={theirOffer}
                onRemoveFromOffer={removeFromTheirOffer}
                inventorySearch={selectedUsername ? theirCardSearch : undefined}
                onInventorySearchChange={selectedUsername ? setTheirCardSearch : undefined}
                headerAction={selectedUsername ? (
                  <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setSelectedUsername(null)}>
                    Change user
                  </Button>
                ) : undefined}
                inventorySection={
                  !selectedUsername ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Search and select a user above to view their inventory.
                    </p>
                  ) : theirLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : theirItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">Their inventory is empty.</p>
                  ) : filteredTheirItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No cards match your search.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-0.5">
                      {filteredTheirItems.map((item) => {
                        const invQty = (item.inventory as { quantity: number }).quantity;
                        return (
                          <InventoryCardThumb
                            key={item.card.id}
                            card={item.card}
                            available={invQty - (theirOffer.get(String(item.card.id)) ?? 0)}
                            onAdd={() => addToTheirOffer(String(item.card.id))}
                          />
                        );
                      })}
                    </div>
                  )
                }
              />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
