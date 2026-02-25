"use client";

/**
 * Deck Builder: list decks, create/edit, add/remove cards, have vs need, total price.
 */

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDecks,
  useDeck,
  useCreateDeck,
  useUpdateDeck,
  useDeleteDeck,
  useSetDeckActive,
  type DeckCardEntry,
} from "@/hooks/useDecks";
import { useInventoryCards } from "@/hooks/useInventoryCards";
import { useCards } from "@/hooks/useCards";
import type { ApiCard } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, FileDown, FileUp, Star } from "lucide-react";

const DEBOUNCE_MS = 300;

/** Parse decklist text: lines like "3xEB01-012" or "4x OP12-027". Returns { card_id, quantity }[], deduped by card_id. */
function parseDecklistText(text: string): { card_id: string; quantity: number }[] {
  const lineRe = /^(\d+)\s*[xX]\s*(.+)$/;
  const byId = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(lineRe);
    if (!m) continue;
    const qty = Math.max(1, parseInt(m[1], 10));
    const cardId = m[2].trim();
    if (!cardId) continue;
    byId.set(cardId, (byId.get(cardId) ?? 0) + qty);
  }
  return Array.from(byId.entries()).map(([card_id, quantity]) => ({ card_id, quantity }));
}

async function fetchCardsBatch(ids: string[]): Promise<ApiCard[]> {
  if (ids.length === 0) return [];
  const chunkSize = 100;
  const all: ApiCard[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const res = await fetch(`/api/cards/batch?ids=${encodeURIComponent(chunk.join(","))}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    all.push(...(Array.isArray(data) ? data : []));
  }
  return all;
}

function AddCardRow({ card, onAdd }: { card: ApiCard; onAdd: (qty: number) => void }) {
  const [qty, setQty] = useState(1);
  const handleClick = () => {
    const n = Math.max(1, Math.min(99, qty));
    onAdd(n);
  };
  return (
    <li className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className="relative w-10 h-14 rounded overflow-hidden bg-muted shrink-0">
          {card.image ? (
            <Image src={card.image} alt={card.name} fill className="object-cover" sizes="40px" />
          ) : (
            <span className="text-xs flex items-center justify-center h-full">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{card.name}</p>
          <p className="text-xs text-muted-foreground">
            {card.episode?.code ?? "—"} · {card.rarity}
            {(card.market_price != null || card.inventory_price != null) && (
              <> · ${(card.market_price ?? card.inventory_price ?? 0).toFixed(2)}</>
            )}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-muted-foreground">Qty</span>
        <Input
          type="number"
          min={1}
          max={99}
          value={qty}
          className="w-14 h-8 text-center text-sm"
          onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
          onKeyDown={(e) => e.key === "Enter" && handleClick()}
        />
      </div>
    </li>
  );
}

function DecksPageContent() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deckCards, setDeckCards] = useState<DeckCardEntry[]>([]);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [addCardSearch, setAddCardSearch] = useState("");
  const [addCardDebounced, setAddCardDebounced] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);

  const { data: decks = [], isLoading: decksLoading } = useDecks();
  const { data: deckData, isLoading: deckLoading } = useDeck(selectedId);
  const { items: inventoryItems } = useInventoryCards();
  const createDeck = useCreateDeck();
  const updateDeck = useUpdateDeck(selectedId);
  const deleteDeck = useDeleteDeck();
  const setDeckActive = useSetDeckActive();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const deckId = searchParams.get("deck");
    if (deckId && decks.some((d) => d.id === deckId)) {
      setSelectedId(deckId);
    }
  }, [searchParams, decks]);

  useEffect(() => {
    const t = setTimeout(() => setAddCardDebounced(addCardSearch), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [addCardSearch]);

  const { data: searchCardsData } = useCards({
    search: addCardDebounced,
    page: 1,
    limit: 30,
  });
  const searchCards = searchCardsData?.cards ?? [];

  useEffect(() => {
    if (deckData) {
      setDeckName(deckData.deck.name);
      setDeckCards(deckData.cards);
    }
  }, [deckData]);

  const inventoryByCardId = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of inventoryItems) {
      const id = String(x.card.id);
      m.set(id, (m.get(id) ?? 0) + x.inventory.quantity);
    }
    return m;
  }, [inventoryItems]);

  const cardIds = useMemo(() => deckCards.map((c) => c.card_id), [deckCards]);
  const [cardsMap, setCardsMap] = useState<Map<string, ApiCard>>(new Map());
  useEffect(() => {
    if (cardIds.length === 0) {
      setCardsMap(new Map());
      return;
    }
    let cancelled = false;
    fetchCardsBatch(cardIds).then((cards) => {
      if (cancelled) return;
      const m = new Map<string, ApiCard>();
      for (const c of cards) m.set(String(c.id), c);
      setCardsMap(m);
    });
    return () => { cancelled = true; };
  }, [cardIds.join(",")]);

  const deckTotalPrice = useMemo(() => {
    let sum = 0;
    for (const entry of deckCards) {
      const card = cardsMap.get(entry.card_id);
      const unitPrice = Number(card?.market_price ?? card?.inventory_price ?? 0) || 0;
      sum += unitPrice * entry.quantity;
    }
    return sum;
  }, [deckCards, cardsMap]);

  const handleNewDeck = () => {
    createDeck.mutate(undefined, {
      onSuccess: (deck) => {
        setSelectedId(deck.id);
        setDeckName(deck.name);
        setDeckCards([]);
      },
    });
  };

  const handleSave = () => {
    if (!selectedId) return;
    updateDeck.mutate({ name: deckName.trim() || "Untitled Deck", cards: deckCards });
  };

  const handleDelete = () => {
    if (!selectedId) return;
    if (!confirm("Delete this deck?")) return;
    deleteDeck.mutate(selectedId, { onSuccess: () => setSelectedId(null) });
  };

  const handleAddCard = (card: ApiCard, qty: number = 1) => {
    const id = String(card.id);
    setDeckCards((prev) => {
      const i = prev.findIndex((c) => c.card_id === id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [...prev, { card_id: id, quantity: qty }];
    });
    setAddCardOpen(false);
    setAddCardSearch("");
  };

  const setCardQuantity = (cardId: string, quantity: number) => {
    if (quantity < 1) {
      setDeckCards((prev) => prev.filter((c) => c.card_id !== cardId));
      return;
    }
    setDeckCards((prev) =>
      prev.map((c) => (c.card_id === cardId ? { ...c, quantity } : c))
    );
  };

  const removeCard = (cardId: string) => {
    setDeckCards((prev) => prev.filter((c) => c.card_id !== cardId));
  };

  const handleExportDecklist = async () => {
    const text = deckCards.map((e) => `${e.quantity}x${e.card_id}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    } catch {
      setExportCopied(false);
    }
  };

  const handleImportDecklist = async () => {
    setImportError(null);
    const entries = parseDecklistText(importText);
    if (entries.length === 0) {
      setImportError("No valid lines found. Use format: 3xEB01-012 (quantity, x, card id).");
      return;
    }
    setImporting(true);
    try {
      const allIds = entries.map((e) => e.card_id);
      const foundCards = await fetchCardsBatch(allIds);
      const foundIds = new Set(foundCards.map((c) => String(c.id)));
      const notFound = allIds.filter((id) => !foundIds.has(id));
      const cardsToAdd: DeckCardEntry[] = entries
        .filter((e) => foundIds.has(e.card_id))
        .map((e) => ({ card_id: e.card_id, quantity: e.quantity }));
      if (cardsToAdd.length === 0) {
        setImportError(`None of the card IDs were found in the database. Check format (e.g. OP12-020, EB01-012). Not found: ${notFound.slice(0, 5).join(", ")}${notFound.length > 5 ? "…" : ""}`);
        return;
      }
      const name = `Imported Deck (${new Date().toLocaleDateString()})`;
      const createRes = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      const deck = await createRes.json();
      await fetch(`/api/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: cardsToAdd }),
      });
      setImportOpen(false);
      setImportText("");
      setSelectedId(deck.id);
      setDeckName(deck.name);
      setDeckCards(cardsToAdd);
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      if (notFound.length > 0) {
        setImportError(null);
        console.warn("Import: cards not in DB:", notFound);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Deck Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deck list */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-semibold">Your decks</h2>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1">
                  <FileDown className="h-4 w-4" />
                  Import
                </Button>
                <Button size="sm" onClick={handleNewDeck} disabled={createDeck.isPending} className="gap-1">
                  <Plus className="h-4 w-4" />
                  New deck
                </Button>
              </div>
            </div>
            {decksLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!decksLoading && decks.length === 0 && (
              <p className="text-sm text-muted-foreground">No decks yet. Create one to get started.</p>
            )}
            <ul className="space-y-2">
              {decks.map((d) => (
                <li key={d.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    className="flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors flex flex-col gap-1.5 hover:bg-muted min-w-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`relative w-9 h-12 shrink-0 rounded overflow-hidden bg-muted ${
                          selectedId === d.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                        }`}
                      >
                        {d.leader_image ? (
                          <Image
                            src={d.leader_image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="36px"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
                        )}
                      </div>
                      <span className="min-w-0 truncate flex-1">
                        {d.name}
                        {typeof d.card_count === "number" && (
                          <span className="opacity-80 ml-1">({d.card_count})</span>
                        )}
                      </span>
                    </div>
                    {typeof d.card_count === "number" && d.card_count > 0 && (
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.round(((d.owned_count ?? 0) / d.card_count) * 100)}
                          className="h-1.5 flex-1"
                        />
                        <span className="text-xs opacity-80 shrink-0">
                          {d.owned_count ?? 0}/{d.card_count}
                        </span>
                      </div>
                    )}
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeckActive.mutate({ id: d.id, isActive: !(d.is_active ?? false) });
                    }}
                    disabled={setDeckActive.isPending}
                    title={d.is_active ? "Active – cards show in inventory" : "Mark as active"}
                  >
                    <Star
                      className={`h-4 w-4 ${d.is_active ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`}
                    />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Deck editor */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedId && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a deck or create a new one.
              </CardContent>
            </Card>
          )}

          {selectedId && (
            <>
              {deckLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading deck…
                </div>
              )}
              {!deckLoading && (
                <>
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={deckName}
                          onChange={(e) => setDeckName(e.target.value)}
                          placeholder="Deck name"
                          className="max-w-xs font-medium"
                        />
                        <Button size="sm" onClick={handleSave} disabled={updateDeck.isPending}>
                          {updateDeck.isPending ? "Saving…" : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddCardOpen(true)} className="gap-1">
                          <Plus className="h-4 w-4" />
                          Add card
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleExportDecklist}
                          disabled={deckCards.length === 0}
                          className="gap-1"
                          title="Copy decklist (same format as import)"
                        >
                          <FileUp className="h-4 w-4" />
                          {exportCopied ? "Copied!" : "Export"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={deleteDeck.isPending}
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete deck
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total deck value: <span className="font-semibold text-foreground">${deckTotalPrice.toFixed(2)}</span>
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-0">
                      {deckCards.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground text-sm">No cards in deck. Click &quot;Add card&quot; to search.</p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {deckCards.map((entry) => {
                            const card = cardsMap.get(entry.card_id);
                            const have = inventoryByCardId.get(entry.card_id) ?? 0;
                            const need = entry.quantity;
                            const unitPrice = Number(card?.market_price ?? card?.inventory_price ?? 0) || 0;
                            const lineTotal = unitPrice * need;
                            return (
                              <li key={entry.card_id} className="flex items-center gap-3 p-3">
                                <div className="relative w-10 h-14 rounded overflow-hidden bg-muted shrink-0">
                                  {card?.image ? (
                                    <Image src={card.image} alt={card.name ?? ""} fill className="object-cover" sizes="40px" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{card?.name ?? entry.card_id}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {have >= need ? (
                                      <span className="text-green-600 dark:text-green-400">{have}/{need}</span>
                                    ) : (
                                      <span className="text-amber-600 dark:text-amber-400">{have}/{need}</span>
                                    )}
                                    {" · "}
                                    ${lineTotal.toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={need}
                                    className="w-14 h-8 text-center text-sm"
                                    onChange={(e) => setCardQuantity(entry.card_id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => removeCard(entry.card_id)}
                                    title="Remove from deck"
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add card modal */}
      <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add card to deck</DialogTitle>
            <DialogDescription>Search for a card, choose quantity, then click to add.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Card name..."
            value={addCardSearch}
            onChange={(e) => setAddCardSearch(e.target.value)}
            className="mb-2"
          />
          <ul className="overflow-auto flex-1 space-y-1 pr-2 -mr-2">
            {searchCards.length === 0 && addCardDebounced && (
              <li className="text-sm text-muted-foreground py-4">No cards found.</li>
            )}
            {searchCards.map((card) => (
              <AddCardRow
                key={String(card.id)}
                card={card}
                onAdd={(qty) => handleAddCard(card, qty)}
              />
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Import decklist modal */}
      <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportText(""); setImportError(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import decklist</DialogTitle>
            <DialogDescription>
              Paste one line per card: quantity, then &quot;x&quot;, then card ID (e.g. 4xOP12-027, 1xEB01-012).
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"3xEB01-012\n4xOP12-027\n1xOP12-020\n..."}
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={10}
          />
          {importError && (
            <p className="text-sm text-destructive">{importError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportText(""); setImportError(null); }}>
              Cancel
            </Button>
            <Button onClick={handleImportDecklist} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                "Import as new deck"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DecksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <DecksPageContent />
    </Suspense>
  );
}
