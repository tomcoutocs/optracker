"use client";

/**
 * Profile page for viewing a user (by username).
 * Shows same content as own profile: avatar, inventory value, recent cards, decks, inventory search.
 * When viewing own profile, uses same data sources as /profile (useDecks, etc.) for consistency.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProfileByUsername, useUserProfileData, useUploadAvatar } from "@/hooks/useProfile";
import { useDecks } from "@/hooks/useDecks";
import { useInventoryCards } from "@/hooks/useInventoryCards";
import { useInventoryRecent } from "@/hooks/useInventoryRecent";
import { ProfileInventoryGrid } from "@/components/ProfileInventoryGrid";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ViewDeckModal } from "@/components/ViewDeckModal";
import { Loader2, ArrowLeft, Camera, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InventoryCard } from "@/types";

export default function UserProfilePage() {
  const params = useParams();
  const username = typeof params.username === "string" ? params.username : null;
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [episodeId, setEpisodeId] = useState<number | null>(null);
  const [rarity, setRarity] = useState("");
  const [color, setColor] = useState("");
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [viewDeckId, setViewDeckId] = useState<string | null>(null);
  const [viewDeckOpen, setViewDeckOpen] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setCurrentUserId(user?.id));
  }, []);

  const { data: profileData, isLoading: profileLoading, isError: profileError, error: profileErr } = useProfileByUsername(username);
  const { data: otherUserData, isLoading: otherUserLoading, isError: otherUserError, error: otherUserErr } = useUserProfileData(username);
  const { data: decksData = [], isLoading: decksLoading } = useDecks();
  const { items: inventoryItemsData, isLoading: inventoryLoading } = useInventoryCards();
  const { data: recentCardsData = [], isLoading: recentLoading } = useInventoryRecent(5);
  const uploadAvatar = useUploadAvatar(currentUserId);

  const isOwnProfile = !!profileData && !!currentUserId && profileData.id === currentUserId;
  const waitingForAuth = profileData && currentUserId === undefined;

  const data = isOwnProfile && profileData
    ? {
        profile: { id: profileData.id, username: profileData.username, avatar_url: profileData.avatar_url },
        totalValue: inventoryItemsData.reduce((s, x) => s + x.inventory.quantity * Number(x.card.market_price ?? x.card.inventory_price ?? 0), 0),
        recentCards: recentCardsData.map((item) => ({ card: item.card, inventory: item.inventory })),
        decks: decksData,
        inventoryItems: inventoryItemsData,
      }
    : otherUserData;

  const isLoading = profileLoading || waitingForAuth || (isOwnProfile ? (inventoryLoading || decksLoading || recentLoading) : otherUserLoading);
  const isError = profileError || (!isOwnProfile && otherUserError);
  const error = profileError ? profileErr : otherUserErr;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    uploadAvatar.mutate(file, {
      onSuccess: () => setAvatarInputKey((k) => k + 1),
    });
  };

  if (!username) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/users" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Link>
        </Button>
        <p className="text-muted-foreground">Invalid profile</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/users" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Profile not found"}
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/users">Search users</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, totalValue, recentCards, decks, inventoryItems } = data;
  const items = inventoryItems as InventoryCard[];

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/users" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </Button>

      <h1 className="text-2xl font-bold tracking-tight">{profile.username}&apos;s Profile</h1>

      {/* Avatar + stats row */}
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted ring-2 ring-border">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground bg-muted">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <input
                  key={avatarInputKey}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                  disabled={uploadAvatar.isPending}
                />
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </label>
            )}
          </div>
          <p className="font-medium text-sm">{profile.username}</p>
          {isOwnProfile && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/profile">Edit my profile</Link>
            </Button>
          )}
        </div>

        <div className="flex-1 min-w-[200px] space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Inventory value</p>
              <p className="text-2xl font-bold mt-1">${totalValue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recently added</h2>
          {isOwnProfile && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory">View all</Link>
            </Button>
          )}
        </div>
        {recentCards.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">No cards yet.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recentCards.map((item) => (
              <li key={(item.inventory as { card_id: string }).card_id} className="min-w-0">
                {isOwnProfile ? (
                  <Link href="/inventory">
                    <div className="relative w-full aspect-[63/88] rounded-lg overflow-hidden bg-muted group hover:ring-2 hover:ring-primary/50 transition-all">
                      {(item.card as { image?: string }).image ? (
                        <Image
                          src={(item.card as { image: string }).image}
                          alt={(item.card as { name: string }).name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </div>
                    <p className="text-xs font-medium mt-1 truncate w-full" title={(item.card as { name: string }).name}>
                      {(item.card as { name: string }).name}
                    </p>
                  </Link>
                ) : (
                  <>
                    <div className="relative w-full aspect-[63/88] rounded-lg overflow-hidden bg-muted">
                      {(item.card as { image?: string }).image ? (
                        <Image
                          src={(item.card as { image: string }).image}
                          alt={(item.card as { name: string }).name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </div>
                    <p className="text-xs font-medium mt-1 truncate w-full" title={(item.card as { name: string }).name}>
                      {(item.card as { name: string }).name}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Decks */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{isOwnProfile ? "Your decks" : "Decks"}</h2>
            {isOwnProfile && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/decks">View all</Link>
              </Button>
            )}
          </div>
          {decks.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No decks yet.</p>
          ) : (
            <ul className="space-y-2">
              {decks.slice(0, 5).map((d) => (
                <li key={d.id}>
                  {isOwnProfile ? (
                    <Link
                      href={`/decks?deck=${d.id}`}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="relative w-9 h-12 rounded overflow-hidden bg-muted shrink-0">
                        {d.leader_image ? (
                          <Image src={d.leader_image} alt="" fill className="object-cover" sizes="36px" />
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
                        )}
                      </div>
                      <span className="font-medium text-sm truncate flex-1">{d.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {d.owned_count ?? 0}/{d.card_count ?? 0}
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setViewDeckId(d.id);
                        setViewDeckOpen(true);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <div className="relative w-9 h-12 rounded overflow-hidden bg-muted shrink-0">
                        {d.leader_image ? (
                          <Image src={d.leader_image} alt="" fill className="object-cover" sizes="36px" />
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
                        )}
                      </div>
                      <span className="font-medium text-sm truncate flex-1">{d.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {d.owned_count ?? 0}/{d.card_count ?? 0}
                      </span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Inventory search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="h-5 w-5" />
            <h2 className="font-semibold">
              {isOwnProfile ? "Search your inventory" : `${profile.username}'s inventory`}
            </h2>
          </div>
          <ProfileInventoryGrid
            search={search}
            onSearchChange={setSearch}
            episodeId={episodeId}
            onEpisodeIdChange={setEpisodeId}
            rarity={rarity}
            onRarityChange={setRarity}
            color={color}
            onColorChange={setColor}
            items={items}
            readOnly={!isOwnProfile}
          />
        </CardContent>
      </Card>

      {!isOwnProfile && (
        <ViewDeckModal
          deckId={viewDeckId}
          deckName={decks.find((d) => d.id === viewDeckId)?.name ?? ""}
          ownerUsername={profile.username}
          open={viewDeckOpen}
          onOpenChange={(open) => {
            setViewDeckOpen(open);
            if (!open) setViewDeckId(null);
          }}
        />
      )}
    </div>
  );
}
