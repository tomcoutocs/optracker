-- Ensure users can only update their own profile (username, avatar_url).
-- Run after schema-auth.sql and schema-profiles-public.sql.
-- This reinforces the update policy with explicit WITH CHECK.

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
