-- 0006_biblio_invites_and_contacts.sql
-- Invitaciones individuales (de un solo uso) y sugerencias de amigos a partir de los contactos.
-- Idempotente: se puede pegar entero en el SQL Editor.
--
-- Privacidad:
-- - Los números de los contactos llegan a una función, se comparan y NO se guardan.
-- - El número propio (opcional, para que te encuentren) se guarda solo como HMAC-SHA256 con una clave secreta que
--   vive en la base de datos (tabla sin acceso desde el navegador); sin la clave no se puede recuperar el número.
-- - Solo aparecen en sugerencias quienes lo han activado. No se verifica el número por SMS: la conexión real sigue
--   siendo una invitación de un solo uso enviada al WhatsApp de ese contacto.

create extension if not exists pgcrypto with schema extensions;

-- 0. biblio_entries: la app guarda seen/pending/dismissed y el baseline solo admitía completed/queued/dropped,
--    así que la sincronización fallaba al entrar con cuenta. Se admiten los dos juegos de valores.
alter table public.biblio_entries drop constraint if exists biblio_entries_status_check;
alter table public.biblio_entries add constraint biblio_entries_status_check
  check (status = any (array['seen', 'pending', 'dismissed', 'completed', 'queued', 'dropped']));

-- 1. Clave secreta para el HMAC de los teléfonos (se genera aquí; nunca está en el repositorio)
create table if not exists public.biblio_secrets (
  name text primary key,
  value text not null
);
alter table public.biblio_secrets enable row level security;
revoke all on public.biblio_secrets from anon, authenticated;
insert into public.biblio_secrets (name, value)
select 'phone_hmac', encode(extensions.gen_random_bytes(32), 'hex')
where not exists (select 1 from public.biblio_secrets where name = 'phone_hmac');

create or replace function public.biblio_phone_hmac(p_phone text) returns text
language sql stable security definer set search_path = public as $$
  select encode(extensions.hmac(p_phone, (select value from public.biblio_secrets where name = 'phone_hmac'), 'sha256'), 'hex')
$$;
revoke all on function public.biblio_phone_hmac(text) from public, anon, authenticated;

-- 2. Teléfono propio para que tus amigos te encuentren (opcional). Sin índice único: sin verificación por SMS,
--    el primero que reclamase un número bloquearía al dueño real.
create table if not exists public.biblio_phone_index (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_hmac text not null,
  updated_at timestamptz not null default now()
);
create index if not exists biblio_phone_index_hmac on public.biblio_phone_index (phone_hmac);
alter table public.biblio_phone_index enable row level security;
revoke all on public.biblio_phone_index from anon, authenticated;

-- Activa (con un número E.164, «+34600111222») o quita (null) que te encuentren por tu teléfono
create or replace function public.biblio_set_phone(p_phone text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if p_phone is null or p_phone = '' then
    delete from public.biblio_phone_index where user_id = auth.uid();
    return;
  end if;
  if p_phone !~ '^\+[0-9]{8,15}$' then raise exception 'Número no válido'; end if;
  insert into public.biblio_phone_index (user_id, phone_hmac)
  values (auth.uid(), public.biblio_phone_hmac(p_phone))
  on conflict (user_id) do update set phone_hmac = excluded.phone_hmac, updated_at = now();
end;
$$;

create or replace function public.biblio_phone_status() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.biblio_phone_index where user_id = auth.uid())
$$;

-- 3. Cruce de contactos: devuelve la posición en la lista enviada de quienes ya usan la app (y no son ya amigos).
--    Máximo 500 números por llamada y 2000 al día por usuario, para que no sirva para rastrear números.
create table if not exists public.biblio_contact_lookups (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, day)
);
alter table public.biblio_contact_lookups enable row level security;
revoke all on public.biblio_contact_lookups from anon, authenticated;

create or replace function public.biblio_match_contacts(p_phones text[])
returns table (idx integer, user_id uuid, display_name text, avatar_url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  n integer := coalesce(array_length(p_phones, 1), 0);
  used integer;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if n = 0 then return; end if;
  if n > 500 then raise exception 'Demasiados contactos de una vez (máximo 500)'; end if;

  insert into public.biblio_contact_lookups as l (user_id, day, count)
  values (auth.uid(), current_date, n)
  on conflict (user_id, day) do update set count = l.count + excluded.count
  returning l.count into used;
  if used > 2000 then raise exception 'Has llegado al límite de búsquedas de hoy'; end if;

  return query
  select distinct on (p.idx, pi.user_id) p.idx::integer, pi.user_id, pr.display_name, pr.avatar_url
  from unnest(p_phones) with ordinality as p(phone, idx)
  join public.biblio_phone_index pi on pi.phone_hmac = public.biblio_phone_hmac(p.phone)
  join public.biblio_profiles pr on pr.id = pi.user_id
  where p.phone ~ '^\+[0-9]{8,15}$'
    and pi.user_id <> auth.uid()
    and not exists (select 1 from public.biblio_friends f where f.user_id = auth.uid() and f.friend_id = pi.user_id);
end;
$$;

-- 4. Invitaciones individuales de un solo uso. El código se crea en el servidor y ya no se puede listar ni
--    aceptar desde el navegador: todo pasa por estas funciones.
create or replace function public.biblio_create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  loop
    v_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
    exit when not exists (select 1 from public.biblio_invites where code = v_code);
  end loop;
  insert into public.biblio_invites (code, creator_id) values (v_code, auth.uid());
  return v_code;
end;
$$;

-- Lo que ve quien abre el enlace antes de aceptar: solo el nombre y la foto de quien invita
create or replace function public.biblio_invite_preview(p_code text)
returns table (creator_name text, creator_avatar text, status text)
language sql stable security definer set search_path = public as $$
  select pr.display_name, pr.avatar_url,
    case when i.used_by is not null then 'used'
         when i.expires_at < now() then 'expired'
         else 'ok' end
  from public.biblio_invites i
  join public.biblio_profiles pr on pr.id = i.creator_id
  where i.code = upper(p_code)
$$;

create or replace function public.biblio_accept_invite(p_code text)
returns table (creator_id uuid, creator_name text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  inv public.biblio_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para unirte'; end if;
  select * into inv from public.biblio_invites where code = upper(p_code) for update;
  if not found then raise exception 'Invitación no válida'; end if;
  if inv.creator_id = auth.uid() then raise exception 'Es tu propio enlace de invitación'; end if;
  if inv.used_by is not null and inv.used_by <> auth.uid() then raise exception 'Esta invitación ya se ha usado'; end if;
  if inv.expires_at < now() then raise exception 'La invitación ha caducado'; end if;

  insert into public.biblio_friends (user_id, friend_id, status) values
    (auth.uid(), inv.creator_id, 'accepted'),
    (inv.creator_id, auth.uid(), 'accepted')
  on conflict (user_id, friend_id) do update set status = 'accepted';
  update public.biblio_invites set used_by = auth.uid() where id = inv.id;

  return query select inv.creator_id, (select display_name from public.biblio_profiles where id = inv.creator_id);
end;
$$;

-- Las invitaciones ya no se leen ni se escriben directamente
drop policy if exists "Invites viewable by all" on public.biblio_invites;
drop policy if exists "Creators insert invites" on public.biblio_invites;
drop policy if exists "Update invites on accept" on public.biblio_invites;
drop policy if exists "Creators see own invites" on public.biblio_invites;
create policy "Creators see own invites" on public.biblio_invites for select using (auth.uid() = creator_id);

revoke all on function public.biblio_set_phone(text) from public, anon;
revoke all on function public.biblio_phone_status() from public, anon;
revoke all on function public.biblio_match_contacts(text[]) from public, anon;
revoke all on function public.biblio_create_invite() from public, anon;
revoke all on function public.biblio_accept_invite(text) from public, anon;
revoke all on function public.biblio_invite_preview(text) from public;
grant execute on function public.biblio_set_phone(text) to authenticated;
grant execute on function public.biblio_phone_status() to authenticated;
grant execute on function public.biblio_match_contacts(text[]) to authenticated;
grant execute on function public.biblio_create_invite() to authenticated;
grant execute on function public.biblio_accept_invite(text) to authenticated;
grant execute on function public.biblio_invite_preview(text) to anon, authenticated;
