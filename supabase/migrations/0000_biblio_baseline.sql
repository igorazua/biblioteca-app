-- 0000_biblio_baseline.sql
-- Baseline DDL de las 5 tablas existentes de Biblioteca en Supabase (proyecto compartido).
-- Extraído directamente de la base de datos de producción (information_schema, pg_constraint, pg_policies, pg_indexes).

-- 1. biblio_profiles
create table if not exists public.biblio_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  handle text unique,
  avatar_url text,
  country text default 'ES'::text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.biblio_profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.biblio_profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.biblio_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.biblio_profiles for update
  using (auth.uid() = id);


-- 2. biblio_entries
create table if not exists public.biblio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  shelf text not null,
  status text not null check (status = any (array['completed'::text, 'queued'::text, 'dropped'::text])),
  score numeric,
  comment text,
  rank_position integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint biblio_entries_user_id_item_id_key unique (user_id, item_id)
);

alter table public.biblio_entries enable row level security;

create policy "Entries viewable by everyone or friends"
  on public.biblio_entries for select
  using (true);

create policy "Users manage own entries"
  on public.biblio_entries for all
  using (auth.uid() = user_id);


-- 3. biblio_friends
create table if not exists public.biblio_friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted'::text check (status = any (array['pending'::text, 'accepted'::text, 'blocked'::text])),
  created_at timestamptz default now(),
  constraint biblio_friends_user_id_friend_id_key unique (user_id, friend_id)
);

alter table public.biblio_friends enable row level security;

create policy "Friends viewable by participants"
  on public.biblio_friends for select
  using ((auth.uid() = user_id) or (auth.uid() = friend_id));

create policy "Users manage own friendships"
  on public.biblio_friends for all
  using (auth.uid() = user_id);


-- 4. biblio_invites
create table if not exists public.biblio_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  creator_id uuid not null references auth.users(id) on delete cascade,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + '30 days'::interval)
);

alter table public.biblio_invites enable row level security;

create policy "Invites viewable by all"
  on public.biblio_invites for select
  using (true);

create policy "Creators insert invites"
  on public.biblio_invites for insert
  with check (auth.uid() = creator_id);

create policy "Update invites on accept"
  on public.biblio_invites for update
  using ((auth.uid() = creator_id) or (auth.uid() = used_by));


-- 5. biblio_events
create table if not exists public.biblio_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  sid text not null,
  v text not null,
  t bigint not null,
  type text not null,
  shelf text,
  item_id text,
  data jsonb,
  created_at timestamptz default now()
);

alter table public.biblio_events enable row level security;

create policy "Anyone can insert events"
  on public.biblio_events for insert
  with check (true);

create policy "Events viewable by owner"
  on public.biblio_events for select
  using (auth.uid() = user_id);
