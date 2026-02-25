"use client";

/**
 * useProfile: fetch and update user profile (username, avatar_url).
 * useUploadAvatar: upload avatar to storage and update profile.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchProfile(userId: string | undefined): Promise<Profile | null> {
  if (!userId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId),
    enabled: !!userId,
  });
}

export function useUpdateProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { username?: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

export interface UserProfileData {
  profile: { id: string; username: string; avatar_url: string | null };
  totalValue: number;
  recentCards: { card: unknown; inventory: unknown }[];
  decks: { id: string; name: string; card_count: number; owned_count: number; leader_image: string | null }[];
  inventoryItems: { card: unknown; inventory: unknown }[];
}

export function useUserProfileData(username: string | null) {
  return useQuery({
    queryKey: ["user-profile-data", username],
    queryFn: async (): Promise<UserProfileData> => {
      if (!username) throw new Error("Username required");
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/profile-data`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.status === 404) throw new Error("Profile not found");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!username,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useProfileByUsername(username: string | null) {
  return useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: async (): Promise<Profile | null> => {
      if (!username) return null;
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!username,
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["users-search", query],
    queryFn: async (): Promise<{ id: string; username: string; avatar_url: string | null }[]> => {
      const url = query.trim()
        ? `/api/users/search?q=${encodeURIComponent(query.trim())}`
        : "/api/users/search";
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useUploadAvatar(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Not authenticated");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) throw new Error("Cannot edit another user's profile");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);
      if (updateError) throw updateError;

      return avatarUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}
