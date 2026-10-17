-- 0001_biblio_catalog.sql
-- Tabla biblio_catalog para el catálogo vivo compartido.
-- Definición según especificación F-B1 en docs/SISTEMA_BETA.md

create table if not exists public.biblio_catalog (
  id           text primary key,              -- slug: 'movie:el-hoyo-2019'
  type         text not null check (type in ('movie','series','book','artist','boardgame')),
  tmdb_id      integer,                       -- movie/series
  imdb_id      text,                          -- movie/series (tt…)
  ol_work      text,                          -- book (OL…W)
  isbn13       text[],                        -- book, para casar imports
  mbid         uuid,                          -- artist
  wikidata_id  text,
  data         jsonb not null,                -- el objeto Item completo (types.ts)
  source       text not null,                 -- 'seed' | 'tmdb' | 'openlibrary' | 'musicbrainz'
  enriched_at  timestamptz,                   -- null = sin ejes/vectores todavía
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists biblio_catalog_tmdb on public.biblio_catalog (type, tmdb_id) where tmdb_id is not null;
create unique index if not exists biblio_catalog_imdb on public.biblio_catalog (imdb_id) where imdb_id is not null;
create unique index if not exists biblio_catalog_olw  on public.biblio_catalog (ol_work) where ol_work is not null;
create unique index if not exists biblio_catalog_mbid on public.biblio_catalog (mbid) where mbid is not null;
create index if not exists biblio_catalog_isbn on public.biblio_catalog using gin (isbn13);

alter table public.biblio_catalog enable row level security;

create policy "catálogo legible por todos" on public.biblio_catalog for select using (true);
-- Sin políticas de insert/update/delete para anon/authenticated: solo escribe la función con service role.
