-- supabase/migrations/0007_biblio_covers.sql
-- T1: Bucket de portadas alojadas por nosotros (público en lectura, escritura restringida a service role)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'biblio-covers',
  'biblio-covers',
  true,
  5242880, -- 5MB límite
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set public = true;

-- Políticas en storage.objects
drop policy if exists "biblio_covers_public_read" on storage.objects;
create policy "biblio_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'biblio-covers');
