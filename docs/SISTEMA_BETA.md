# SISTEMA_BETA — Diseño técnico de la beta con amigos (v1, 17/10/2026)

> ⚠️ **19/10/2026: NO hay API de TMDB.** Todo lo que este documento dice de TMDB queda sustituido por Wikidata + TVmaze (ver `docs/PLAN_MEJORAS.md` §0 y §1.1).

> Documento para quien construya (probablemente Gemini en Antigravity). Autocontenido: rutas, tablas, contratos y criterios de aceptación.
> Qué y por qué: `docs/ROADMAP_BETA.md`. Producto: `docs/IDEA.md`. Motor: `docs/MOTOR.md`.

## 0. Reglas del repositorio (no negociables)
- Claves **solo** en `app/.env.local` (local) o en los *secrets* de Supabase (funciones). Nunca en el repo ni en el navegador. La clave de TMDB **no** puede llegar al cliente.
- Catálogo solo de fuentes abiertas o con licencia (TMDB, Open Library, MusicBrainz, Wikidata). **Nada de raspar webs.**
- **No desplegar** (Vercel ni funciones de Supabase) sin confirmación de Igor.
- Supabase: proyecto compartido `pvewnpemlwmvaduzhjso`. Todo lo nuevo lleva prefijo `biblio_` (tablas, funciones, buckets). No tocar tablas de otros proyectos (`posts`, `scrape_targets`…).
- **Tests, con moderación** (Igor prueba a mano y avisa de fallos):
  - Cambios sencillos (UI, textos, estilos, pantallas): **sin tests nuevos**; basta `npm run build` en verde antes del commit.
  - Tests nuevos **solo** donde un fallo pierde o corrompe datos o no se ve a mano: sync local↔nube, catálogo vivo e IDs, arranque en frío, imports, borrado de cuenta, migraciones y lógica del motor. Los criterios de «Aceptación» de abajo que piden tests de UI (p. ej. `Avatar`) pasan a ser comprobación manual.
  - `npm test` completo al tocar esas zonas, antes de cada despliegue y cada varias tandas de cambios; no en cada commit.
  - Tras cada cambio, indicar en una línea qué conviene probar a mano.
- Commits en español, estilo `feat(catalog): …`.

## 1. Estado de partida (lo que hay hoy)
- **App**: `app/` — Vite + React 19 + TS + Tailwind v4 + framer-motion + zustand + vite-plugin-pwa.
- **Catálogo**: `app/src/data/seed.json` (4 MB, 4.276 obras) cargado entero al arrancar por `src/data/catalog.ts`. `getItem(id)` es **síncrono** y lo usan ~20 módulos (pantallas, componentes, `lib/sync.ts`, `lib/engine/decide.ts`, `store/useStore.ts`, `store/useFriends.ts`).
- **IDs de obra**: slugs estables `tipo:titulo-año` (`movie:el-padrino-1972`). Las entradas de usuarios en `biblio_entries.item_id` ya guardan estos slugs → **deben seguir siendo válidos**.
- **Identificadores externos en la semilla**: pelis 812/1000 con `tmdbId`, series 715/1000, libros 971/1000 con `olid` (work), artistas 260/261 con `mbid`, juegos 0 (solo Wikidata en 706).
- **Plataformas**: nombres normalizados de `config.PLATFORMS` (`Netflix`, `Prime Video`, `HBO Max`, `Disney+`, `Movistar+`, `Filmin`, `Apple TV+`). `scripts/build-seed.mjs` convierte los nombres de TMDB a estos; la función del servidor debe usar **el mismo mapa**.
- **Cuentas** (`src/store/useAuth.ts`): login con Google y código por email, perfil creado al vuelo en `biblio_profiles` (toma nombre y foto de Google), `updateProfile`, subida local→nube en `lib/sync.ts`. Carencias en F-B2.
- **Esquema**: tablas `biblio_profiles`, `biblio_entries`, `biblio_friends`, `biblio_invites`, `biblio_events` con RLS, **sin migraciones en el repo**.
- **PWA**: `registerType: 'autoUpdate'` → se actualiza en silencio.
- **Motor**: `lib/engine/features.ts` carga `data/engine/<shelf>.json` y degrada a géneros si una obra no está.

## 2. Orden de las fases
```
F-B0 esquema base ─► F-B1 catálogo vivo ─► F-B5 imports
                 └► F-B2 cuentas ──────► F-B6 foto de perfil
F-B3 aviso de versión · F-B4 botón «Todas» · F-B7 visual   (independientes)
F-B8 tarjetas para compartir · F-B9 secundarios           (al final)
```

---

## F-B0. Esquema base versionado
**Objetivo**: que el esquema actual viva en el repo antes de cambiarlo.
- Crear `supabase/migrations/0000_biblio_baseline.sql` con el DDL actual de las 5 tablas, índices y políticas RLS. Fuente preferida: volcado del panel de Supabase que pase Igor (`pg_dump --schema-only -t 'public.biblio_*'`); si no, reconstruido del código (`useAuth.ts`, `sync.ts`, `useFriends.ts`, `JoinInvite.tsx`) y **marcado como reconstruido** en un comentario de cabecera.
- Las migraciones siguientes: `0001_…`, `0002_…`. Se aplican solo con OK de Igor.

**Aceptación**: el SQL de la baseline aplicado a una base vacía crea las 5 tablas y las políticas; ninguna migración posterior edita la baseline.

---

## F-B1. Catálogo vivo (sin IA, en el servidor)

### Principio
**Nunca se crea una obra a partir de texto libre.** Toda obra nueva entra resuelta a un identificador externo (`tmdb`, `olwork`, `mbid`) y se guarda **una sola vez** por (tipo, identificador). Así no hay duplicados ni títulos mal escritos.

### Tabla `biblio_catalog` (migración `0001_biblio_catalog.sql`)
```sql
create table public.biblio_catalog (
  id           text primary key,              -- slug: 'movie:el-hoyo-2019'
  type         text not null check (type in ('movie','series','book','artist','boardgame')),
  tmdb_id      integer,                       -- movie/series
  imdb_id      text,                          -- movie/series (tt…)
  ol_work      text,                          -- book (OL…W)
  isbn13       text[],                        -- book, para casar imports
  mbid         uuid,                          -- artist
  wikidata_id  text,
  data         jsonb not null,                -- el objeto Item completo (types.ts)
  source       text not null,                 -- 'seed' | 'tmdb' | 'openlibrary' | 'musicbrainz'
  enriched_at  timestamptz,                   -- null = sin ejes/vectores todavía
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index biblio_catalog_tmdb on public.biblio_catalog (type, tmdb_id) where tmdb_id is not null;
create unique index biblio_catalog_imdb on public.biblio_catalog (imdb_id) where imdb_id is not null;
create unique index biblio_catalog_olw  on public.biblio_catalog (ol_work) where ol_work is not null;
create unique index biblio_catalog_mbid on public.biblio_catalog (mbid) where mbid is not null;
create index biblio_catalog_isbn on public.biblio_catalog using gin (isbn13);

alter table public.biblio_catalog enable row level security;
create policy "catálogo legible por todos" on public.biblio_catalog for select using (true);
-- Sin políticas de insert/update/delete: solo escribe la función con service role.
```

### Carga inicial de la semilla
- Script `app/scripts/catalog-upload.mjs` (`npm run catalog:upload`), con `SUPABASE_SERVICE_ROLE_KEY` de `.env.local`: sube las 4.276 obras de `seed.json` con `source='seed'` y `enriched_at=now()` si están en `data/engine/<shelf>.json`.
- **Antes**, completar identificadores que faltan (≈470 pelis/series sin `tmdbId`): primero Wikidata (P4947 película, P4983 serie, P648 Open Library), luego búsqueda TMDB por título + año con coincidencia exacta normalizada. Lo que no case con seguridad se queda sin id y se lista en `scripts/cache/catalog-sin-id.json` para revisión.
- Idempotente: volver a ejecutarlo no duplica (upsert por `id`).

### Función `biblio-catalog` (`supabase/functions/biblio-catalog/index.ts`)
Secrets: `TMDB_API_KEY`, `MB_USER_AGENT` (formato `Biblioteca/0.1 (<contacto que elija Igor>)`; pedírselo, no inventarlo). Acepta la anon key (los usuarios de la demo sin login también buscan). Límite básico: 60 peticiones/minuto por IP en memoria.

Todas las llamadas son `POST` con JSON `{ action, … }`:

**`search`** — buscar fuera
```ts
// req
{ action: 'search', type: ShelfType, q: string, lang?: 'es' }
// res
{ results: Array<{
    ref: { source: 'tmdb' | 'openlibrary' | 'musicbrainz', id: string },
    title: string, year: number | null, creator: string | null, posterUrl: string | null,
    catalogId: string | null      // si ya existe en biblio_catalog
  }> }                            // máx. 20, por relevancia de la fuente
```
- movie/series → TMDB `/search/movie|tv?language=es-ES`. book → Open Library `/search.json` (works). artist → MusicBrainz `/ws/2/artist` (1 petición/s, `User-Agent` obligatorio). boardgame → **no disponible** (ver no-objetivos): devuelve `{ results: [] }`.

**`resolve`** — convertir refs en obras del catálogo (crea si no existe)
```ts
// req
{ action: 'resolve', refs: Array<{ type: ShelfType, source: string, id: string }> }  // máx. 50
// res
{ items: Item[] }   // en el mismo orden; cada Item con su `id` definitivo
```
Pasos por ref:
1. Buscar en `biblio_catalog` por identificador externo → si existe, devolverla.
2. Pedir el detalle a la fuente (TMDB: `append_to_response=watch/providers,external_ids,credits`; OL: work + autor; MB: artista).
3. **Anti-duplicado con la semilla**: buscar obra del mismo tipo **sin** identificador externo y con título normalizado + año iguales (±1 en series) → si hay una, **completarle** el identificador en vez de crear otra.
4. Si no, crear: `id = tipo:slug(título)-año`; si choca con otra obra distinta, añadir sufijo de la fuente (`movie:el-hoyo-2019-t12345`). `slugify` idéntico al de `scripts/build-seed.mjs`.
5. Mapear al tipo `Item` (`types.ts`): plataformas desde `watch/providers.results.ES.flatrate` con el **mismo mapa** que `build-seed.mjs`; `posterUrl` de TMDB (`w342`) o Open Library covers; `popularity` 0-100 como en la semilla.

**`match`** — casar filas de un import (lo usa F-B5)
```ts
// req
{ action: 'match', type: ShelfType, rows: Array<{ title: string, year?: number, creator?: string, imdbId?: string, isbn13?: string }> } // máx. 50
// res
{ matches: Array<{
    status: 'sure' | 'doubt' | 'none',
    item?: Item,                       // si 'sure' (ya resuelta y guardada)
    candidates?: SearchResult[]        // si 'doubt' (máx. 3, sin guardar)
  }> }
```
Reglas de «seguro»: `imdbId` → TMDB `/find?external_source=imdb_id`; `isbn13` → OL `/isbn/{isbn}.json` → `works[0]`; título normalizado igual **y** año igual (±1) **y** un único candidato → seguro; si no, duda con hasta 3 candidatos.

### Cliente
- **`src/store/useCatalog.ts`** (nuevo, zustand + persist en IndexedDB vía `idb-keyval`; localStorage se queda corto): `items: Record<id, Item>`, `version: number`, `ensureItems(ids: string[]): Promise<void>` (pide a `biblio_catalog` con `select data where id in (…)` las que no estén ni en la semilla ni en la caché, en lotes de 100), `addItems(items: Item[])`.
- **`src/data/catalog.ts`**: `getItem(id)` = semilla → caché viva → `undefined`. `itemsOfType(t)` incluye las vivas. Mantener la API síncrona; nada de `await` en los componentes.
- **Re-render**: los componentes que listan obras leen `useCatalog((s) => s.version)` para refrescarse cuando llegan obras nuevas.
- **Llamar a `ensureItems` antes de pintar** en: `pullCloudEntries` (`lib/sync.ts`), `loadFriends` (`store/useFriends.ts`), apertura de listas públicas (`screens/Public.tsx`) e imports.
- **`lib/sync.ts`**: `shelfOf` deja de caer a `'movie'` por defecto: usa `entry.shelf` de la fila de la nube o `getItem(id)?.type`; si no se conoce, no sube la fila y la reintenta tras `ensureItems`.
- **Obras desconocidas**: `Poster`, `ItemRow` y `ItemDetail` muestran un esqueleto en vez de romper si `getItem` devuelve `undefined`.
- **`components/AddFlow.tsx`**: resultados locales primero; debajo, sección «Más en el catálogo» con `search` (debounce 300 ms, mínimo 2 letras, `AbortController`). Al tocar uno: `resolve` → `addItems` → el flujo actual de vista/pendiente. Si no hay red: solo locales, sin error.
- **Atribución** en Perfil → «Fuentes»: «Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB» + logo, Open Library, MusicBrainz y Wikidata.

### Arranque en frío: nunca perder entradas de obras vivas
- La caché viva se rehidrata de IndexedDB **de forma asíncrona**; `useStore` (localStorage) puede rehidratarse antes. Por eso:
  - El primer render de `App.tsx`, la sincronización y el `migrate` de `useStore` esperan a `useCatalog.persist.hasHydrated()` (pantalla de carga breve).
  - **Regla dura**: ninguna ruta (migrate, rankings, limpieza, sync) borra ni descarta entradas o puestos cuyo id no se conozca. Se ocultan o se pintan como esqueleto y se piden con `ensureItems`.
  - `store/useStore.ts` tiene **su propio** `shelfOf` con caída a `'movie'` (línea ~62), usado para los rankings: aplicarle el mismo arreglo que a `lib/sync.ts` (guardar `shelf` en `UserEntry` al crearla y usarlo primero).
- **Aceptación**: test que simula arranque con la caché viva vacía, rehidrata `useStore` con una entrada y un puesto de una obra viva (serie), rehidrata después la caché, y comprueba que la entrada sigue, está en el ranking de `series` y no en el de `movie`.

### Enriquecimiento posterior
- Las obras vivas nacen con `enriched_at = null`. Script `npm run engine:pull-live` descarga las no enriquecidas a `scripts/cache/` para que las procese la cadena `engine:*` existente; `engine:merge` marca `enriched_at`.
- Mientras tanto, mazo, Decidir y limpieza tratan la obra solo con géneros, año y popularidad (modo degradado de `features.ts`).

### Aceptación (vitest salvo indicación)
- `getItem` devuelve obras de la caché viva y `itemsOfType` las incluye.
- `shelfOf` no devuelve `'movie'` para una serie viva.
- `deck`, `decide` y `cleanup` no lanzan error con una obra ausente de `data/engine/*.json` (test nuevo en cada `*.test.ts`).
- Función (test con Deno o manual documentado): `resolve` dos veces la misma ref → una sola fila; `resolve` de «El padrino» (TMDB 238) → devuelve `movie:el-padrino-1972`, no una nueva.
- Manual: buscar «Past Lives» (no está en la semilla) → aparece en «Más en el catálogo» → se guarda como vista → recargar la app → sigue ahí con póster.

---

## F-B2. Cuentas básicas
1. **Borrar cuenta de verdad** — función `biblio-delete-account` (service role, exige JWT del usuario): borra `biblio_entries`, `biblio_friends` (en **ambas** direcciones), `biblio_invites` creadas por el usuario, `biblio_events` (o pone `user_id = null`), su carpeta del bucket de avatares, `biblio_profiles` y por último `auth.admin.deleteUser`. `useAuth.deleteAccount` llama a la función y después limpia el estado local.
2. **@usuario único** — migración: primero normalizar los existentes (`update biblio_profiles set handle = null where handle !~ '^[a-z0-9_.]{3,20}$';`), después `create unique index biblio_profiles_handle on biblio_profiles (lower(handle)) where handle is not null;` + `check (handle ~ '^[a-z0-9_.]{3,20}$')`. En Perfil: campo editable con sugerencia a partir del nombre y comprobación de disponibilidad (consulta `select` por `lower(handle)`).
3. **Una sola identidad visible** — hoy conviven el perfil local (`useStore.profile`: nombre, color) y el de la nube (`useAuth.profile`). Con sesión iniciada, la nube manda: nombre, `avatarUrl` y país se copian al perfil local al entrar; los cambios en Perfil se guardan en los dos.
4. **Primera entrada** — al iniciar sesión por primera vez en un dispositivo: subir lo local (`pushLocalEntriesToCloud`) y luego bajar (`pullCloudEntries`); gana el `updatedAt` más reciente. Mostrar «Hemos guardado tus N obras en tu cuenta».
5. **Registro libre** — cualquiera con el enlace puede crear cuenta; `/unirse/:code` solo crea la amistad.

**Aceptación**: tras borrar la cuenta, no quedan filas del usuario en ninguna tabla `biblio_*` ni en `auth.users`; un @usuario repetido (en mayúsculas o minúsculas) se rechaza; test de fusión local/nube por `updatedAt`.

---

## F-B3. Aviso de nueva versión
- `vite.config.ts`: `registerType: 'prompt'`.
- Nuevo `src/components/UpdatePrompt.tsx` con `useRegisterSW` de `virtual:pwa-register/react`: cuando `needRefresh` es `true`, Toast fijo «Hay una versión nueva · **Actualizar**» → `updateServiceWorker(true)`. Comprobar actualización cada 30 min (`registration.update()`) y al volver a la pestaña (`visibilitychange`).
- Montarlo en `App.tsx`.

**Aceptación**: manual en `npm run build-preview`: cambiar un texto, recompilar, la pestaña abierta muestra el aviso y al pulsar carga la versión nueva.

---

## F-B4. Botón «Todas» en plataformas
- Chip «Todas» al principio de los selectores de `screens/Onboarding.tsx`, `screens/Profile.tsx` y `screens/WhatToWatch.tsx`. Pulsarlo marca todas las de `PLATFORMS`; si ya estaban todas, las desmarca. Queda activo cuando están todas marcadas.
- **Significado**: «todas marcadas» = **sin filtro**. En `lib/engine/decide.ts` (`passesFilters`) y `lib/recommend.ts` (`passes`), si la selección cubre todo `PLATFORMS`, no se filtra por plataforma (así no se pierden obras de plataformas fuera de la lista, como SkyShowtime). Lista vacía sigue siendo «sin filtro».
- Extraer el chip a un componente compartido `PlatformPicker` en `components/ui.tsx` para no triplicar la lógica.

**Aceptación**: test en `decide.test.ts` y `recommend.test.ts`: con todas marcadas, una obra solo en «SkyShowtime» pasa el filtro.

---

## F-B5. Importar listas
**Privacidad**: el archivo se lee **en el móvil**; al servidor solo viajan título, año, autor e identificadores. No se guarda el archivo.

### Pantalla
`screens/Import.tsx` (ruta `/importar`, enlazada desde Perfil y desde las estanterías vacías):
1. Elegir fuente → instrucciones de 2-3 pasos para descargar el archivo de esa web.
2. Subir el archivo (CSV o ZIP de Letterboxd; descomprimir con `fflate`).
3. Progreso por lotes de 50 (`match`).
4. **Revisión**: «Hemos encontrado 312 · 14 dudosas». Las dudosas se resuelven eligiendo candidato o «ninguna».
5. Confirmar → se crean las entradas.

### Analizadores (funciones puras con tests y CSV de ejemplo anonimizados en `src/lib/import/__fixtures__/`)
| Archivo | Fuente | Columnas | Resultado |
|---|---|---|---|
| `lib/import/letterboxd.ts` | ZIP: `watched.csv`, `ratings.csv`, `watchlist.csv` | Name, Year, Rating (0,5-5) | movie; vista con estrellas = redondeo de Rating; watchlist → pendiente |
| `lib/import/imdb.ts` | `ratings.csv`, `watchlist.csv` | Const (tt…), Title, Year, Your Rating (1-10), Title Type | movie o series según Title Type; estrellas = `ceil(nota/2)`; `imdbId` para casar |
| `lib/import/goodreads.ts` | `goodreads_library_export.csv` (y StoryGraph) | Title, Author, ISBN13 (viene como `="978…"`), My Rating (0 = sin nota), Exclusive Shelf | book; `read` → vista, `to-read` → pendiente, `currently-reading` → pendiente |
| `lib/import/netflix.ts` | `NetflixViewingHistory.csv` | Title, Date | Agrupar episodios: lo anterior a `: Temporada`, `: Season`, `: Parte`, `: Miniserie`, `: Capítulo`, `: Episodio` → serie; el resto → película. Vista sin estrellas |

Salida común: `ImportRow { type, title, year?, creator?, imdbId?, isbn13?, status: 'seen'|'pending', stars?: Stars, at?: number }`.

### Reglas al crear entradas
- **No pisar** una entrada que ya exista, salvo que no tenga estrellas y el import sí.
- Con estrellas → colocación provisional como hoy (`provisional: true`); sin estrellas → `ranked: false`. Ambas aparecerán en Comparar para colocarse con duelos.
- `origin: 'import:letterboxd'` (etc.).
- Eventos: `import_started`, `import_done` con `{ source, total, sure, doubt, none }`.

**Aceptación**: tests de cada analizador con su CSV de ejemplo (incluidas notas vacías, comas dentro de comillas, ISBN con `="…"`, episodios de Netflix en español e inglés); test de la regla «no pisar».

**Fuera de esta fase**: Last.fm (artistas) y Spotify (acceso limitado por Spotify desde 2025).

---

## F-B6. Foto de perfil
- Bucket `biblio-avatars` (lectura pública). Políticas de `storage.objects`: insertar, actualizar y borrar solo si `(storage.foldername(name))[1] = auth.uid()::text`.
- Ruta `{uid}/avatar.webp`. El cliente recorta en cuadrado y reduce a 256×256 WebP (calidad 0,85, < 100 KB) con `canvas` **antes** de subir.
- `biblio_profiles.avatar_url` = URL pública + `?v=<timestamp>` para saltar la caché.
- Por defecto, la foto de Google (ya se guarda al crear el perfil).
- `components/ui.tsx` → `Avatar` acepta `url?`: si hay, `<img>` con `loading="lazy"`; si falla o no hay, las iniciales con color actuales. Añadir `avatarUrl?` a `Friend` (`types.ts`) y rellenarlo en `useFriends.loadFriends`.

**Aceptación**: test de `Avatar` (url → img; error → iniciales); manual: subir foto desde el móvil, verla en Perfil y en las burbujas de amigos de otra cuenta.

---

## F-B7. Mejora visual
Paleta elegida en `ROADMAP_BETA.md` §B7 (por defecto, la 1 «Biblioteca de noche» con un color por estantería). Igor confirma antes de aplicar.
- **Tokens** en `src/index.css` (`@theme`): `bg`, `surface`, `surface2`, `line`, `ink`, `mute`, `accent`, `accent-ink`, sellos, y `--color-shelf-{movie,series,book,artist,boardgame}`. Prohibido usar hex sueltos en componentes.
- **Formas**: radio 20 px en tarjetas, 14 px en hojas y botones, 999 px en chips. Sombra de profundidad para la pila del mazo.
- **Movimiento** (framer-motion), todo respetando `prefers-reduced-motion`:
  - Swipe: inclinación proporcional al arrastre, sello con opacidad según distancia, vuelta con muelle (`stiffness ~400, damping ~30`).
  - Póster compartido de tarjeta a ficha (`layoutId`).
  - Esqueletos de carga en listas y pósteres.
  - Pulsación: `scale 0.97` en botones y chips.
  - Final de tanda de duelos: pequeña celebración (confeti discreto en el color de la estantería).
  - Vibración corta al confirmar (`navigator.vibrate?.(10)`; en iPhone no hace nada).
- **Pantallas vacías** con ilustración y acción («Importa tus pelis de Letterboxd»).

**Aceptación**: capturas antes/después de Descubrir, Estantería, Ficha y Perfil a 375 px; `npm run build` sin hex fuera de `index.css` (grep).

---

## F-B8. Tarjetas para compartir (al final)
- `lib/shareCard.ts`: genera en `canvas` un PNG de 1080×1920 (story) con el top 5 de una estantería o una lista: pósteres, títulos, nombre y el enlace corto actual de `lib/share.ts`.
- Compartir con `navigator.share({ files })`; si no se puede, descargar.

## F-B9. Secundarios
Registro de errores (Sentry, plan gratuito, DSN en `.env.local`), botón «Enviar feedback» en Perfil (inserta en una tabla `biblio_feedback`), pruebas de punta a punta con Playwright de registro → swipe → valorar → compartir, panel de métricas con `biblio_events`.

---

## No-objetivos de la beta
- Nombre, dominio y proyecto de Supabase propio.
- Búsqueda en vivo de **juegos de mesa** (la API de BGG es no comercial y exige registro: decide Igor). Se sigue con los 1.015 de la semilla.
- Spotify, FilmAffinity, Prime/HBO/Disney+ como fuentes de import.
- Notificaciones push, «dónde verla» por país, moderación, app nativa.
- Quitar `seed.json` del paquete: se mantiene para que la app funcione sin red; adelgazarlo es posterior.
- IA en el catálogo: solo opcional más adelante para dudas de Netflix.
