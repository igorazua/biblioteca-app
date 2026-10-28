-- 0010_biblio_events_guard.sql
-- Protege la tabla de eventos de analítica (Igor, 28/10/2026). Antes cualquiera con la clave pública podía:
--   1) escribir eventos en nombre de OTRO usuario (no se comprobaba user_id);
--   2) meter filas sin límite de tamaño ni de ritmo (spam que llena la tabla y ensucia las métricas).
-- Ahora: sin usuario o con el propio; tipo, tamaños y estantería acotados; como mucho 300 eventos por minuto y sesión.
-- Idempotente: se puede ejecutar en el SQL Editor de Supabase.

drop policy if exists "Anyone can insert events" on public.biblio_events;
drop policy if exists "biblio_events_insert_guarded" on public.biblio_events;
create policy "biblio_events_insert_guarded"
  on public.biblio_events for insert
  with check (
    (user_id is null or user_id = auth.uid())
    and type ~ '^[a-z_]{2,40}$'
    and char_length(sid) between 1 and 64
    and char_length(v) between 1 and 32
    and (shelf is null or shelf in ('movie', 'series', 'book', 'artist', 'boardgame', 'song'))
    and (item_id is null or char_length(item_id) <= 200)
    and (data is null or pg_column_size(data) <= 4096)
  );

-- Ritmo: una sesión no puede mandar más de 300 eventos en un minuto (una persona real no llega ni a 100)
create index if not exists biblio_events_sid_created_idx on public.biblio_events (sid, created_at desc);

create or replace function public.biblio_events_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.biblio_events
      where sid = new.sid and created_at > now() - interval '1 minute') >= 300 then
    raise exception 'demasiados eventos para esta sesión' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists biblio_events_rate_limit on public.biblio_events;
create trigger biblio_events_rate_limit
  before insert on public.biblio_events
  for each row execute function public.biblio_events_rate_limit();
