-- 0008_biblio_connections.sql
-- «Conectar» (docs/CONECTAR.md §3.3): las plataformas que cada persona ha conectado y su última sincronización.
-- Idempotente: se puede pegar entero en el SQL Editor. Cada usuario solo ve y toca las suyas.
--
-- Nunca se guarda una contraseña de otra app. `handle` es el usuario público (o el id numérico en Goodreads);
-- `token_enc` solo se usa con OAuth (p. ej. el token de refresco de Spotify) y debe guardarse ya cifrado.

create table if not exists public.biblio_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  handle text,
  token_enc text,
  last_sync timestamptz,
  status text not null default 'active' check (status in ('active', 'error', 'paused')),
  created_at timestamptz not null default now(),
  unique (user_id, service)
);

create index if not exists biblio_connections_user_idx on public.biblio_connections (user_id);

alter table public.biblio_connections enable row level security;

drop policy if exists "biblio_connections_select_own" on public.biblio_connections;
create policy "biblio_connections_select_own"
  on public.biblio_connections for select
  using (auth.uid() = user_id);

drop policy if exists "biblio_connections_insert_own" on public.biblio_connections;
create policy "biblio_connections_insert_own"
  on public.biblio_connections for insert
  with check (auth.uid() = user_id);

drop policy if exists "biblio_connections_update_own" on public.biblio_connections;
create policy "biblio_connections_update_own"
  on public.biblio_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "biblio_connections_delete_own" on public.biblio_connections;
create policy "biblio_connections_delete_own"
  on public.biblio_connections for delete
  using (auth.uid() = user_id);
