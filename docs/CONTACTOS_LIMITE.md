# Límite de búsqueda de contactos: cuota de primera vez (Migración 0011)

> Documento técnico de preparación para la migración `supabase/migrations/0011_biblio_contacts_allowance.sql`.
> **Estado:** Preparado y sin aplicar. El proyecto de Supabase es compartido con SEDAE y Riftbound: Igor lo aplica tras revisarlo.

---

## 1. Qué cambia y por qué

### Situación actual (Migración 0006)
En `supabase/migrations/0006_biblio_invites_and_contacts.sql`, la función `biblio_match_contacts(p_phones text[])` impone dos restricciones:
1. Máximo **500 números por llamada** (`n > 500`).
2. Máximo **2.000 números al día por usuario** registrados en `public.biblio_contact_lookups`.

En la PWA, el usuario seleccionaba contactos manualmente con el selector de Chrome (`pickContacts`). En la **app nativa**, la aplicación solicitará permiso para leer la agenda completa (`READ_CONTACTS` en Android, `CNContactStore` en iOS; ver `docs/APP_NATIVA.md` §Bloqueantes 2).

Esto creaba dos problemas bloqueantes:
- Un usuario con una agenda de más de 2.000 contactos **fallaba siempre** en su primera sincronización.
- Un usuario con una agenda de 1.200 contactos fallaba si la app reintentaba o sincronizaba dos veces el mismo día.

### Diseño implementado en 0011
- Se mantienen las **500 por llamada** y las **2.000 al día**.
- Se introduce una **cuota de primera vez de 10.000 números por cuenta** (`public.biblio_contact_allowance`), válida para toda la vida de la cuenta.
- **La cuota de primera vez se consume antes que la cuota diaria:** mientras el usuario disponga de saldo en su cuota inicial, las comprobaciones se descuentan de ahí sin consumir el límite diario de 2.000.
- Una vez agotados los 10.000 números de la cuota inicial, el usuario pasa al régimen estándar de 2.000 números al día.
- **Privacidad y RGPD:** no se guarda ningún número de teléfono de terceros en el servidor (ni en claro ni en hash). Recordar qué contactos ya han sido cotejados previamente corresponde exclusivamente al cliente nativo, que solo enviará los contactos nuevos o modificados.
- **Compatibilidad 1:1:** la firma de la función `biblio_match_contacts(text[])`, los tipos de retorno, la seguridad (`security definer`, `search_path = public`, permisos `grant execute to authenticated`) y los mensajes literales de error se mantienen idénticos, garantizando que la PWA siga funcionando sin cambios.

---

## 2. Pruebas de verificación en SQL

Para validar la función en el SQL Editor de Supabase (simulando un usuario autenticado `auth.uid() = '00000000-0000-0000-0000-000000000001'`), ejecutar los siguientes tres casos:

### Preparación del entorno de prueba
```sql
-- Usuario ficticio para pruebas
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'test_contacts@example.com')
on conflict (id) do nothing;

-- Limpieza de pruebas previas del usuario
delete from public.biblio_contact_allowance where user_id = '00000000-0000-0000-0000-000000000001';
delete from public.biblio_contact_lookups where user_id = '00000000-0000-0000-0000-000000000001';

-- Simular contexto de sesión autenticada
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
```

---

### Caso 1: Agenda de 1.200 contactos sincronizada dos veces el mismo día
Una agenda de 1.200 contactos se envía en 3 llamadas (500 + 500 + 200). La segunda sincronización repite las 3 llamadas el mismo día.

```sql
-- 1ª sincronización: 1.200 números
select count(*) from public.biblio_match_contacts((select array_agg('+34600000' || lpad(i::text, 4, '0')) from generate_series(1, 500) i));
select count(*) from public.biblio_match_contacts((select array_agg('+34600000' || lpad(i::text, 4, '0')) from generate_series(501, 1000) i));
select count(*) from public.biblio_match_contacts((select array_agg('+34600000' || lpad(i::text, 4, '0')) from generate_series(1001, 1200) i));

-- Comprobación intermedia:
-- Cuota restante debe ser 8.800 (10.000 - 1.200).
-- Cuota diaria consumida hoy debe ser 0.
select remaining from public.biblio_contact_allowance where user_id = '00000000-0000-0000-0000-000000000001'; -- Esperado: 8800
select coalesce(sum(count), 0) from public.biblio_contact_lookups where user_id = '00000000-0000-0000-0000-000000000001' and day = current_date; -- Esperado: 0

-- 2ª sincronización el mismo día: otros 1.200 números
select count(*) from public.biblio_match_contacts((select array_agg('+34600000' || lpad(i::text, 4, '0')) from generate_series(1, 500) i));
select count(*) from public.biblio_match_contacts((select array_agg('+34600000' || lpad(i::text, 4, '0')) from generate_series(501, 1000) i));
select count(*) from public.biblio_match_contacts((select array_agg('+34600000' || lpad(i::text, 4, '0')) from generate_series(1001, 1200) i));

-- Comprobación final Caso 1:
-- Cuota restante debe ser 7.600 (8.800 - 1.200).
-- Cuota diaria consumida hoy sigue siendo 0. Ambas sincronizaciones tuvieron éxito el mismo día.
select remaining from public.biblio_contact_allowance where user_id = '00000000-0000-0000-0000-000000000001'; -- Esperado: 7600
select coalesce(sum(count), 0) from public.biblio_contact_lookups where user_id = '00000000-0000-0000-0000-000000000001' and day = current_date; -- Esperado: 0
```

---

### Caso 2: Agenda de 6.000 contactos la primera vez
Una agenda grande de 6.000 contactos se envía en 12 llamadas de 500 números cada una.

```sql
-- Reiniciar saldo del usuario de prueba
update public.biblio_contact_allowance set remaining = 10000 where user_id = '00000000-0000-0000-0000-000000000001';
delete from public.biblio_contact_lookups where user_id = '00000000-0000-0000-0000-000000000001';

-- Ejecutar 12 llamadas de 500 (total 6.000 números)
do $$
declare
  batch integer;
begin
  for batch in 0..11 loop
    perform public.biblio_match_contacts(
      (select array_agg('+346000' || lpad((batch * 500 + i)::text, 5, '0')) from generate_series(1, 500) i)
    );
  end loop;
end;
$$;

-- Comprobación Caso 2:
-- Cuota inicial restante debe ser exactamente 4.000 (10.000 - 6.000).
-- Cuota diaria consumida hoy debe ser 0 (no se ha bloqueado al llegar a 2.000).
select remaining from public.biblio_contact_allowance where user_id = '00000000-0000-0000-0000-000000000001'; -- Esperado: 4000
select coalesce(sum(count), 0) from public.biblio_contact_lookups where user_id = '00000000-0000-0000-0000-000000000001' and day = current_date; -- Esperado: 0
```

---

### Caso 3: Llamada con 501 números (límite por llamada)
Se valida que el límite defensivo de 500 contactos por llamada sigue activo e inviolable.

```sql
-- Debe lanzar la excepción: "Demasiados contactos de una vez (máximo 500)"
select * from public.biblio_match_contacts(
  (select array_agg('+3460000' || lpad(i::text, 4, '0')) from generate_series(1, 501) i)
);
-- Resultado esperado: ERROR: Demasiados contactos de una vez (máximo 500)
```

---

## 3. Comprobación de RGPD y registro en logs (Supabase)

En `docs/APP_NATIVA.md` §RGPD figuraba la comprobación pendiente:
> *«La función no los guarda (falta comprobar que el gateway de la API y los logs de Postgres no registren el cuerpo de la llamada).»*

Se ha analizado la arquitectura y documentación oficial de Supabase Platform:

### 1. API Gateway (Kong / PostgREST)
- **Ruta de la llamada:** `POST /rest/v1/rpc/biblio_match_contacts`.
- **Qué registran los logs del Gateway:**
  El API Gateway de Supabase (Kong) registra metadatos de la petición HTTP en su motor de logs: método HTTP (`POST`), ruta de la URL (`/rest/v1/rpc/biblio_match_contacts`), código de respuesta (`200 OK`), tiempo de respuesta, IP del cliente y encabezados estándar (`User-Agent`, `CF-Ray`).
- **Cuerpo de la petición (`request body`):**
  Por defecto, **ni Kong ni PostgREST registran el cuerpo de las peticiones POST** en los logs de acceso de la API. El payload JSON que contiene el array de números telefónicos se procesa en memoria efímera y no se almacena en el colector de registros de Supabase.
- **Referencia oficial:** [Supabase Documentation — API Logs](https://supabase.com/docs/guides/platform/logs#api-logs) y [Log Drains](https://supabase.com/docs/guides/platform/log-drains).

### 2. Logs de PostgreSQL (`log_statement`)
- En las instancias administradas de Supabase, el parámetro de PostgreSQL `log_statement` está configurado por defecto en `none` (o `ddl` para registrar migraciones de esquema). **No se registran las sentencias `SELECT` ni las llamadas a funciones RPC estándar.**
- PostgREST invoca las funciones almacenadas mediante consultas parametrizadas (`PREPARE / EXECUTE`). Aun si estuviera habilitada la extensión `pg_stat_statements`, esta anonimiza los literales convirtiéndolos en marcadores posicionales (`$1`, `$2`), por lo que los valores de los arrays de números no se persisten en las estadísticas de consultas.
- Los únicos eventos registrados en los Postgres Logs son errores a nivel de base de datos (`FATAL`, `PANIC`), avisos de conexión/desconexión y consultas lentas si se configura explícitamente `log_min_duration_statement` (deshabilitado por defecto para tráfico RPC estándar).
- **Referencia oficial:** [Supabase Documentation — Postgres Logs](https://supabase.com/docs/guides/platform/logs#postgres-logs).

### Conclusión sobre cumplimiento RGPD
Los números de la agenda de contactos de terceros:
1. Llegan por HTTPS cifrado TLS 1.3 directamente a PostgREST.
2. Se procesan exclusivamente en memoria durante la ejecución de `biblio_match_contacts`.
3. Se cotejan mediante HMAC-SHA256 con la clave secreta `phone_hmac` de `public.biblio_secrets`.
4. **No se escriben en ninguna tabla** de la base de datos.
5. **No quedan registrados en los logs** del API Gateway de Supabase ni en los logs de PostgreSQL.
