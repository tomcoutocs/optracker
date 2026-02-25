"use client";

/**
 * Users page: search for users and browse to their profiles.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSearchUsers } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users } from "lucide-react";

const DEBOUNCE_MS = 300;

export default function UsersPage() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setUserId(user?.id));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [], isLoading } = useSearchUsers(debouncedSearch);

  if (!userId) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-7 w-7" />
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {search.length >= 2 ? "Filtering by username…" : "All users • Type to search"}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {search.length >= 2
            ? `No users found matching "${debouncedSearch}"`
            : "No users yet"}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {users.map((u) => (
            <li key={u.id}>
              <Link href={`/profile/${encodeURIComponent(u.username)}`}>
                <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/40">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0">
                      {u.avatar_url ? (
                        <Image
                          src={u.avatar_url}
                          alt={u.username}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                          {u.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{u.username}</p>
                      <p className="text-xs text-muted-foreground">View profile</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
