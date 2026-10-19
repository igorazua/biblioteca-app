-- 0005_biblio_wikidata_and_nudges.sql
-- Catálogo vivo sin TMDB: índice único (type, wikidata_id) y tabla para notificaciones push.
-- Idempotente: se puede pegar entero en el SQL Editor aunque se haya aplicado a medias.

-- 1. Gemelas del seed (misma obra con título en español y en inglés, mismo Wikidata ID).
--    No se borran (puede haber entradas de usuarios apuntando a cualquiera de las dos): solo se les quita
--    wikidata_id/tmdb_id a la gemela que sobra, para que el índice único se pueda crear.
--    Se conserva la primera en el orden del seed (la del título en español).
update public.biblio_catalog c
set wikidata_id = null, tmdb_id = null, updated_at = now()
from (values
    ('movie:the-shawshank-redemption-1994'),
    ('movie:the-godfather-1972'),
    ('movie:the-dark-knight-2008'),
    ('movie:12-angry-men-1957'),
    ('movie:inception-2010'),
    ('movie:the-lord-of-the-rings-the-fellowship-of-the-ring-2001'),
    ('movie:il-buono-il-brutto-il-cattivo-1966'),
    ('movie:the-matrix-1999'),
    ('movie:goodfellas-1990'),
    ('movie:star-wars-episode-v-the-empire-strikes-back-1980'),
    ('movie:gisaengchung-2019'),
    ('movie:sen-to-chihiro-no-kamikakushi-2001'),
    ('movie:saving-private-ryan-1998'),
    ('movie:the-departed-2006'),
    ('movie:the-pianist-2002'),
    ('movie:terminator-2-judgment-day-1991'),
    ('movie:nuovo-cinema-paradiso-1988'),
    ('movie:psycho-1960'),
    ('movie:spider-man-into-the-spider-verse-2018'),
    ('movie:avengers-endgame-2019'),
    ('movie:django-unchained-2012'),
    ('movie:the-dark-knight-rises-2012'),
    ('movie:oldeuboi-2003'),
    ('movie:mononoke-hime-1997'),
    ('movie:raiders-of-the-lost-ark-1981'),
    ('movie:the-shining-1980'),
    ('movie:alien-1979'),
    ('movie:the-great-dictator-1940'),
    ('movie:inglourious-basterds-2009'),
    ('movie:eternal-sunshine-of-the-spotless-mind-2004'),
    ('movie:snatch-2000'),
    ('movie:requiem-for-a-dream-2000'),
    ('movie:2001-a-space-odyssey-1968'),
    ('movie:citizen-kane-1941'),
    ('movie:the-wolf-of-wall-street-2013'),
    ('movie:there-will-be-blood-2007'),
    ('movie:pan-s-labyrinth-2006'),
    ('movie:hauru-no-ugoku-shiro-2004'),
    ('movie:unforgiven-1992'),
    ('movie:indiana-jones-and-the-last-crusade-1989'),
    ('movie:tonari-no-totoro-1988'),
    ('movie:raging-bull-1980'),
    ('movie:some-like-it-hot-1959'),
    ('movie:ah-ga-ssi-2016'),
    ('movie:no-country-for-old-men-2007'),
    ('movie:kill-bill-vol-1-2003'),
    ('movie:catch-me-if-you-can-2002'),
    ('movie:the-truman-show-1998'),
    ('movie:the-big-lebowski-1998'),
    ('movie:jurassic-park-1993'),
    ('movie:dead-poets-society-1989'),
    ('movie:life-of-brian-1979'),
    ('movie:the-revenant-2015'),
    ('movie:black-swan-2010'),
    ('movie:twelve-monkeys-1995'),
    ('movie:the-princess-bride-1987'),
    ('movie:jaws-1975'),
    ('movie:arrival-2016'),
    ('movie:la-grande-bellezza-2013'),
    ('movie:the-curious-case-of-benjamin-button-2008'),
    ('movie:e-t-the-extra-terrestrial-1982'),
    ('movie:the-social-network-2010'),
    ('series:game-of-thrones-2011'),
    ('series:rick-and-morty-2013'),
    ('series:six-feet-under-2001'),
    ('series:the-x-files-1993'),
    ('series:girlfriends-2000'),
    ('book:frankenstein-or-the-modern-prometheus-1818'),
    ('boardgame:libertalia-2012')
) as twins(id)
where c.id = twins.id;

-- Red de seguridad: si quedara algún duplicado que no esté en la lista, se conserva el de id menor.
update public.biblio_catalog c
set wikidata_id = null, updated_at = now()
where c.wikidata_id is not null
  and exists (
    select 1 from public.biblio_catalog o
    where o.type = c.type and o.wikidata_id = c.wikidata_id and o.id < c.id
  );

create unique index if not exists biblio_catalog_wikidata
  on public.biblio_catalog (type, wikidata_id)
  where wikidata_id is not null;

-- 2. Suscripciones Web Push para recordatorios.
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

-- Sin acceso directo desde el navegador: las claves push de otros dispositivos no deben poder leerse
-- ni pisarse con la clave anon. El alta pasa por la función de abajo; el envío, por service role.
alter table public.biblio_push_subs enable row level security;
drop policy if exists "push subs accesibles" on public.biblio_push_subs;
revoke all on public.biblio_push_subs from anon, authenticated;

create or replace function public.biblio_push_subscribe(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_device_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(p_endpoint, '') = '' or coalesce(p_device_id, '') = '' then
    raise exception 'endpoint y device_id son obligatorios';
  end if;
  insert into public.biblio_push_subs (endpoint, p256dh, auth, device_id, user_id)
  values (p_endpoint, p_p256dh, p_auth, p_device_id, auth.uid())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_id = coalesce(excluded.user_id, biblio_push_subs.user_id),
        updated_at = now()
    -- solo el mismo dispositivo puede actualizar su suscripción
    where biblio_push_subs.device_id = excluded.device_id;
end;
$$;

revoke all on function public.biblio_push_subscribe(text, text, text, text) from public;
grant execute on function public.biblio_push_subscribe(text, text, text, text) to anon, authenticated;
