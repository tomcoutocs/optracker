"use client";

/**
 * AddCardModal: quantity, condition, notes; save to inventory.
 * Uses shadcn Dialog, Input, Select, Button.
 */

import { useState, useEffect } from "react";
import type { ApiCard } from "@/types";
import { CARD_CONDITIONS } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AddCardModalProps {
  card: ApiCard | null;
  onClose: () => void;
  onSave: (params: { card_id: string; quantity: number; condition: string | null; notes: string | null }) => void;
  isPending: boolean;
}

export function AddCardModal({ card, onClose, onSave, isPending }: AddCardModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<string>(CARD_CONDITIONS[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (card) {
      setQuantity(1);
      setCondition(CARD_CONDITIONS[0]);
      setNotes("");
    }
  }, [card]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    onSave({
      card_id: String(card.id),
      quantity,
      condition: condition || null,
      notes: notes.trim() || null,
    });
    onClose();
  };

  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Add to inventory</DialogTitle>
          <DialogDescription className="truncate">{card?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="modal-quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input
              id="modal-quantity"
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Condition</label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="modal-notes" className="text-sm font-medium">
              Notes (optional)
            </label>
            <Input
              id="modal-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. foil, signed"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
