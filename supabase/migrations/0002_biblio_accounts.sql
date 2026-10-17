-- 0002_biblio_accounts.sql
-- F-B2: Normalización de handle y restricción única case-insensitive para @usuario

-- 1. Normalizar existentes que no cumplan el formato
update public.biblio_profiles
set handle = null
where handle is not null and handle !~ '^[a-z0-9_.]{3,20}$';

-- 2. Eliminar índice o constraint anterior si existe
alter table public.biblio_profiles drop constraint if exists biblio_profiles_handle_key;
drop index if exists public.biblio_profiles_handle;

-- 3. Crear índice único case-insensitive
create unique index if not exists biblio_profiles_handle on public.biblio_profiles (lower(handle)) where handle is not null;

-- 4. Añadir check constraint
alter table public.biblio_profiles drop constraint if exists biblio_profiles_handle_check;
alter table public.biblio_profiles add constraint biblio_profiles_handle_check check (handle is null or handle ~ '^[a-z0-9_.]{3,20}$');
