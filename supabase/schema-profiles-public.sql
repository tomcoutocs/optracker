-- Allow authenticated users to read any profile (for viewing other users).
-- Run after schema-auth.sql.
-- Replaces "Users can read own profile" with broader read for discovery.

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can read any profile" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select using (auth.role() = 'authenticated');
