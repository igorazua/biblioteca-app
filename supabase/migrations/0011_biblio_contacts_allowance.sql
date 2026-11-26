-- 0011_biblio_contacts_allowance.sql
-- Cuota de primera vez de 10.000 números por cuenta (vida de la cuenta).
-- Se mantiene el límite de 500 números por llamada y 2.000 al día.
-- La cuota de primera vez se gasta antes que la diaria, permitiendo la sincronización
-- inicial de agendas grandes sin guardar ningún número de terceros en el servidor.
-- Idempotente: se puede ejecutar varias veces sin error.

-- 1. Tabla de cuota inicial por cuenta (10.000 números de por vida)
create table if not exists public.biblio_contact_allowance (
  user_id uuid primary key references auth.users(id) on delete cascade,
  remaining integer not null default 10000 check (remaining >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.biblio_contact_allowance enable row level security;
revoke all on public.biblio_contact_allowance from anon, authenticated;

-- 2. Función de cruce de contactos con cuota de primera vez y límite diario
create or replace function public.biblio_match_contacts(p_phones text[])
returns table (idx integer, user_id uuid, display_name text, avatar_url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  n integer := coalesce(array_length(p_phones, 1), 0);
  v_allowance integer;
  v_from_allowance integer := 0;
  v_from_daily integer := 0;
  used integer;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if n = 0 then return; end if;
  if n > 500 then raise exception 'Demasiados contactos de una vez (máximo 500)'; end if;

  -- Asegurar registro de cuota inicial para la cuenta
  insert into public.biblio_contact_allowance (user_id, remaining)
  values (auth.uid(), 10000)
  on conflict (user_id) do nothing;

  -- Bloqueo de fila para concurrencia segura
  select remaining into v_allowance
  from public.biblio_contact_allowance
  where user_id = auth.uid()
  for update;

  -- La cuota de primera vez se gasta antes que la diaria
  if v_allowance > 0 then
    v_from_allowance := least(n, v_allowance);
    update public.biblio_contact_allowance
    set remaining = remaining - v_from_allowance,
        updated_at = now()
    where user_id = auth.uid();
  end if;

  v_from_daily := n - v_from_allowance;

  -- Lo que no cubra la cuota de primera vez se imputa a la cuota diaria (2.000 al día)
  if v_from_daily > 0 then
    insert into public.biblio_contact_lookups as l (user_id, day, count)
    values (auth.uid(), current_date, v_from_daily)
    on conflict (user_id, day) do update set count = l.count + excluded.count
    returning l.count into used;
    if used > 2000 then raise exception 'Has llegado al límite de búsquedas de hoy'; end if;
  end if;

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

revoke all on function public.biblio_match_contacts(text[]) from public, anon;
grant execute on function public.biblio_match_contacts(text[]) to authenticated;
