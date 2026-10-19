-- 0005_biblio_wikidata_and_nudges.sql
-- Catálogo vivo sin TMDB: índice único wikidata_id y tabla para notificaciones push

create unique index if not exists biblio_catalog_wikidata
  on public.biblio_catalog (type, wikidata_id)
  where wikidata_id is not null;

-- Tabla de suscripciones Push para recordatorios
create table if not exists public.biblio_push_subs (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  device_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  nudge_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.biblio_push_subs enable row level security;

create policy "push subs accesibles"
  on public.biblio_push_subs
  for all
  using (true)
  with check (true);
