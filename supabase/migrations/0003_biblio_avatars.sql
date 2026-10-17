-- supabase/migrations/0003_biblio_avatars.sql
-- F-B6: Bucket de avatares con lectura pública y escritura restringida al propio usuario

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'biblio-avatars',
  'biblio-avatars',
  true,
  1048576, -- 1MB límite
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set public = true;

-- Políticas en storage.objects
drop policy if exists "biblio_avatars_public_read" on storage.objects;
create policy "biblio_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'biblio-avatars');

drop policy if exists "biblio_avatars_user_insert" on storage.objects;
create policy "biblio_avatars_user_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'biblio-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "biblio_avatars_user_update" on storage.objects;
create policy "biblio_avatars_user_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'biblio-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "biblio_avatars_user_delete" on storage.objects;
create policy "biblio_avatars_user_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'biblio-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
