"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutGrid, Package, Layers } from "lucide-react";

const features = [
  {
    title: "Browse Cards",
    description: "Search and filter the full One Piece TCG card database. View by set, rarity, and color.",
    icon: LayoutGrid,
  },
  {
    title: "Track Inventory",
    description: "Add cards you own with quantity and condition. Your collection stays in sync across devices.",
    icon: Package,
  },
  {
    title: "Build Decks",
    description: "Create decks from your collection. See how many cards you already have for each list.",
    icon: Layers,
  },
];

export function Landing() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <h1 className="flex items-center gap-2 font-bold tracking-tight text-4xl sm:text-5xl">
          <span className="rounded bg-primary/10 px-2 py-1 font-bold text-primary">OP</span>
          <span>Tracker</span>
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground text-lg">
          A place to track your inventory and build decks with what you already own.
        </p>
      </div>

      <div className="mt-16 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {features.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-border/60 bg-card/50 text-left transition-colors hover:border-primary/30 hover:bg-card/80"
          >
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
