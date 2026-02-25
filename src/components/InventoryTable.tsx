"use client";

/**
 * InventoryTable: TanStack Table for inventory with filtering/sorting.
 * Uses shadcn Table and Button.
 */

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import Image from "next/image";
import type { InventoryCard } from "@/types";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActiveDeckInfo } from "@/hooks/useActiveDeckCards";

interface InventoryTableProps {
  items: InventoryCard[];
  onIncrement: (cardId: string) => void;
  onDecrement: (cardId: string) => void;
  onRemove: (cardId: string) => void;
  /** Map of card_id -> decks containing this card (active decks only) */
  decksByCard?: Record<string, ActiveDeckInfo[]>;
}

export function InventoryTable({ items, onIncrement, onDecrement, onRemove, decksByCard }: InventoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<InventoryCard>[]>(
    () => [
      {
        id: "image",
        header: "",
        cell: ({ row }) => (
          <div className="relative w-10 h-14 rounded-md overflow-hidden bg-muted shrink-0">
            {row.original.card.image ? (
              <Image
                src={row.original.card.image}
                alt={row.original.card.name}
                fill
                sizes="40px"
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
            )}
          </div>
        ),
      },
      {
        accessorFn: (row) => row.card.name,
        id: "name",
        header: "Name",
        cell: ({ row, getValue }) => {
          const cardId = row.original.inventory.card_id;
          const decks = decksByCard?.[cardId] ?? [];
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{getValue() as string}</span>
              {decks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {decks.map((deck) => (
                    <Link
                      key={deck.id}
                      href={`/decks?deck=${deck.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      In deck: {deck.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorFn: (row) => row.card.episode?.code ?? "—",
        id: "set",
        header: "Set",
      },
      {
        accessorFn: (row) => row.card.rarity,
        id: "rarity",
        header: "Rarity",
      },
      {
        accessorFn: (row) => row.card.color,
        id: "color",
        header: "Color",
      },
      {
        accessorFn: (row) =>
          row.card.market_price != null || row.card.inventory_price != null
            ? (row.card.market_price ?? row.card.inventory_price ?? 0).toFixed(2)
            : null,
        id: "price",
        header: "Price",
        cell: ({ row }) => {
          const c = row.original.card;
          if (c.market_price == null && c.inventory_price == null) return "—";
          const v = c.market_price ?? c.inventory_price ?? 0;
          return <span className="text-sm">${Number(v).toFixed(2)}</span>;
        },
      },
      {
        accessorFn: (row) => row.inventory.quantity,
        id: "quantity",
        header: "Qty",
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as number}</span>
        ),
      },
      {
        accessorFn: (row) => row.inventory.condition,
        id: "condition",
        header: "Condition",
        cell: ({ getValue }) => (getValue() as string | null) ?? "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-1 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onIncrement(row.original.inventory.card_id)}
              title="Add 1 copy"
            >
              +1
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onDecrement(row.original.inventory.card_id)}
              title="Remove 1 copy"
            >
              −1
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => onRemove(row.original.inventory.card_id)}
            >
              Remove
            </Button>
          </div>
        ),
      },
    ],
    [onIncrement, onDecrement, onRemove, decksByCard]
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className="cursor-pointer select-none"
                    onClick={h.column.getCanSort() ? h.column.getToggleSortingHandler() : undefined}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() ? (h.column.getIsSorted() === "asc" ? " ↑" : " ↓") : null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {table.getRowModel().rows.length === 0 && (
          <p className="p-8 text-center text-muted-foreground">No cards in inventory.</p>
        )}
      </CardContent>
    </Card>
  );
}
