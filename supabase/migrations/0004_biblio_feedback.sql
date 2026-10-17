-- supabase/migrations/0004_biblio_feedback.sql
-- F-B9: Tabla de feedback para recibir comentarios de los usuarios de la beta

create table if not exists public.biblio_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  contact text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.biblio_feedback enable row level security;

-- Inserción permitida a cualquier usuario
drop policy if exists "biblio_feedback_insert" on public.biblio_feedback;
create policy "biblio_feedback_insert"
  on public.biblio_feedback
  for insert
  with check (true);

-- Lectura restringida a service_role
drop policy if exists "biblio_feedback_service_read" on public.biblio_feedback;
create policy "biblio_feedback_service_read"
  on public.biblio_feedback
  for select
  using (auth.role() = 'service_role');
