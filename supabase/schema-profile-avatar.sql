-- Profile avatar and storage. Run after schema-auth.sql.

alter table public.profiles add column if not exists avatar_url text;

-- Avatars bucket (create via SQL - run in Supabase SQL Editor if bucket doesn't exist)
-- Or create manually in Dashboard: Storage > New bucket > avatars, set Public
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Storage policies: users can upload/update/delete their own avatar (path: {user_id}/avatar.*)
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and name like auth.uid()::text || '/%');

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and name like auth.uid()::text || '/%');

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and name like auth.uid()::text || '/%');
