-- 0009_biblio_duels.sql
-- Historial de duelos de ranking (docs/TAREA_T16_COMPARAR.md).
-- Registra cada enfrentamiento directo entre dos obras para evitar repeticiones y alimentar el cerebro de afinidad (T11).
-- Idempotente: se puede ejecutar en el SQL Editor de Supabase.

create table if not exists public.biblio_duels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shelf text not null,
  a text not null,
  b text not null,
  winner text not null,
  at timestamptz not null default now(),
  unique (user_id, shelf, a, b)
);

create index if not exists biblio_duels_user_shelf_idx on public.biblio_duels (user_id, shelf);

alter table public.biblio_duels enable row level security;

drop policy if exists "biblio_duels_select_own" on public.biblio_duels;
create policy "biblio_duels_select_own"
  on public.biblio_duels for select
  using (auth.uid() = user_id);

drop policy if exists "biblio_duels_insert_own" on public.biblio_duels;
create policy "biblio_duels_insert_own"
  on public.biblio_duels for insert
  with check (auth.uid() = user_id);

drop policy if exists "biblio_duels_update_own" on public.biblio_duels;
create policy "biblio_duels_update_own"
  on public.biblio_duels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "biblio_duels_delete_own" on public.biblio_duels;
create policy "biblio_duels_delete_own"
  on public.biblio_duels for delete
  using (auth.uid() = user_id);
