# T27-T28 — Tarjetas cuadradas para la música y estantería de Canciones (24/10/2026)

> Encargos escritos por Claude con las decisiones de Igor del 24/10. **Los hace Gemini (Antigravity), en orden: primero T27 y después T28.** Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.
> Decisiones de Igor:
> - *«Para canciones y bandas de música cambiamos la forma de las tarjetas a cuadradas. Los juegos de mesa pueden quedarse como están ahora»* (tienen portadas de formatos muy distintos).
> - *«Incluir las canciones en la app. Luego podremos desactivarlas con un click; de momento lo creamos y luego vemos si las activamos en el lanzamiento o no.»*

---

## Normas comunes (las dos tareas)
1. **Cada tarea solo toca sus archivos.** Otra sesión (Sonnet, T22) y tú mismo en T21 trabajáis a la vez en esta carpeta. Antes de empezar, `git status`: si un archivo que necesitas tiene cambios sin commitear que no son tuyos (hoy, por ejemplo, `SwipePair.tsx`, `ui.tsx`, `DuelVariants.tsx`), **no los commitees**. Apúntalo en el registro y pregunta.
2. **Registro obligatorio:** `docs/registro/T27.md` y `docs/registro/T28.md`, con la **salida real, sin resumir,** de cada comprobación. Sin registro, no está hecho.
3. **Un commit por paso**, solo con tus archivos (`git add <archivo>`, nunca `git add -A`), con el mensaje `T27: …` / `T28: …`.
4. **Nada se inventa ni se rellena con fórmulas, azar o hashes** (nada de `hashFloat`). Si un dato no se puede conseguir, se deja vacío y se apunta en el registro.
5. **Nadie edita `seed.json` a mano.** Las canciones **no van en `seed.json`** (ver T28.4).
6. Al acabar cada tarea: `npx tsc -p app/tsconfig.json --noEmit` limpio y `npx vitest run` en verde, pegados en el registro.
7. **Sin revisión visual** (sin capturas ni navegador: la hace Igor en su móvil) y **sin desplegar**.
8. Tests: **solo** los de las zonas de riesgo de datos que se indican. Nada de tests de componentes.

| Tarea | Archivos | Depende de |
|---|---|---|
| **T27 · Tarjetas cuadradas** | `app/src/lib/posterShape.ts` (nuevo), `app/src/components/Poster.tsx` y los componentes y pantallas que hoy escriben `aspect-[2/3]` a mano (lista en T27.2) | nada |
| **T28 · Canciones** | `app/scripts/songs/*` (nuevo), `app/scripts/cache/songs/*` (nuevo), `app/public/data/songs.json` (nuevo, generado), `app/src/data/songs.ts` (nuevo), `types.ts`, `config.ts`, los parsers de import de música y lo que se indica en T28.5 | T27 terminada |

---

## T27 — Tarjetas cuadradas para artistas y canciones

### Por qué
Las carátulas son siempre cuadradas y las fotos de artista casi siempre. Ahora todo se pinta en vertical 2:3: los artistas salen recortados o con relleno difuminado (`Poster.tsx`, excepción del 23/10). Los juegos de mesa **se quedan como están** (vertical con la imagen entera y relleno difuminado).

### 27.1 Una sola fuente de verdad para la forma
Nuevo `app/src/lib/posterShape.ts`:
```ts
export type PosterShape = 'portrait' | 'square'
/** Igor decide si los artistas van en círculo; de momento, cuadrados. Cambiar solo aquí. */
export const ARTIST_ROUND = false
export function posterShape(type: ShelfType): PosterShape   // artist y song → 'square'; el resto → 'portrait'
export function posterAspectClass(type: ShelfType): string  // 'aspect-square' | 'aspect-[2/3]'
export function posterRadius(type: ShelfType, base: number): number | string  // con ARTIST_ROUND, '50%' para artistas
```
- `song` todavía no existe hasta T28. Escribe la función para que `song` quede cubierta sin más cambios cuando se añada (por ejemplo, con un `Set` de tipos cuadrados).
- Ningún componente vuelve a escribir `aspect-[2/3]` a mano para una obra: todos usan `posterAspectClass(item.type)`.

### 27.2 Dónde se cambia
Hoy el 2:3 está escrito a mano en estos sitios (búscalos de nuevo con `grep -rn "aspect-\[2/3\]\|aspectRatio" app/src` por si hay más):
`ItemRow.tsx` (20, 33, 55, 76), `PosterCard.tsx:32`, `RatingFlow.tsx:44`, `SwipeDeck.tsx:105`, `screens/Library.tsx:162`, `screens/Profile.tsx:189`, `screens/WhatToWatch.tsx` (692, 751), `screens/Shelf.tsx` (69, 162), `screens/Public.tsx` (103, 167). Los esqueletos de carga (`skeleton`) siguen la forma de la obra que van a mostrar. Si no se sabe cuál es, vertical.

### 27.3 Reglas de composición (las decidió Igor con Claude)
1. **Estantería de un solo tipo** (la de Artistas, después la de Canciones): rejilla de tarjetas cuadradas. Mismo número de columnas que ahora; la rejilla queda más baja.
2. **Filas y rejillas que mezclan tipos** (perfil, listas, listas públicas, «¿Qué vemos?»): **se mantiene el hueco vertical 2:3** para que la rejilla no se descuadre. Dentro, la carátula cuadrada ocupa el ancho arriba y debajo van el título y el artista, sobre `bg-surface`. Nada de relleno difuminado aquí.
3. **Mazo de swipe** (`SwipeDeck`, 2 / 3,15): la tarjeta **no cambia de tamaño** (los gestos y el mazo siguen igual). La imagen cuadrada va arriba a todo el ancho y la información debajo, dentro de la misma tarjeta.
4. **Duelos lado a lado** (`SwipePair`, `DuelVariants`): tarjetas cuadradas cuando las dos obras son de música. Si no, como ahora.
5. **Miniaturas de lista** (`ItemRow` pequeño, `Shelf.tsx:162`, `RatingFlow`): cuadradas para música.
6. **Póster que vuela entre pantallas** (`layoutId`): tiene que seguir funcionando; la ficha de una obra de música muestra la carátula cuadrada.
7. `Poster.tsx`: para `artist` (y `song`) en contenedor cuadrado se usa `object-cover` sin relleno difuminado. **El relleno difuminado se queda solo para `boardgame`.** El póster generado (sin imagen) también tiene que verse bien en cuadrado.

### 27.4 Hecho cuando
- `grep -rn "aspect-\[2/3\]" app/src` solo devuelve `posterShape.ts`. Si queda algún otro sitio, tiene que llevar una línea de comentario que explique por qué no es la forma de una obra.
- tsc y vitest en verde, pegados en `docs/registro/T27.md`, con la lista de archivos tocados.
- En el registro, una lista de **qué tiene que mirar Igor en el móvil**: pantalla por pantalla, dónde salen artistas.

---

## T28 — Estantería de Canciones, desactivable con un click

### Por qué
Las canciones dicen más de una persona que los grupos, y una lista de canciones es lo que más apetece compartir. El catálogo posible es enorme, así que **no intentamos tenerlas todas**: un catálogo de partida con lo que conoce casi todo el mundo, y el resto se busca cuando alguien la quiere añadir.

### 28.0 El interruptor (lo primero que se hace)
- En `config.ts`:
  ```ts
  /** Estanterías que se ven en la app. Para quitar Canciones, ponla a false: no se carga nada de canciones. */
  export const SHELF_ENABLED: Record<ShelfType, boolean> = { movie: true, series: true, book: true, artist: true, boardgame: true, song: true }
  ```
- En `types.ts`, `ShelfType` añade `'song'` y `SHELVES` sigue teniendo todas. Nueva `ACTIVE_SHELVES = SHELVES.filter(s => SHELF_ENABLED[s])`.
- **Toda la interfaz recorre `ACTIVE_SHELVES`**, no `SHELVES`: añadir, biblioteca, perfil, comparar, filtros, conectar, listas, onboarding… Busca cada uso de `SHELVES` y decide uno a uno. Los `Record<ShelfType, …>` (`SHELF_LABEL`, `DeckLearn`, `compareOverview`…) llevan su entrada `song` aunque esté apagada.
- **Con `song: false`:** no aparece la estantería, no se descarga `songs.json`, los imports no crean canciones y las canciones que un usuario ya tenga **se ocultan, no se borran**. Al volver a `true` reaparecen.
- **Test de riesgo de datos** (`app/src/data/songs.test.ts`): con el interruptor apagado, `ACTIVE_SHELVES` no tiene `song` y una entrada de canción guardada del usuario sigue en su estado, sin tocar.

### 28.1 Cómo es una canción
- **Id:** mismo formato que todo (MOTOR regla 5): `song:<titulo>-<artista>-<año>`, en slug, por ejemplo `song:bohemian-rhapsody-queen-1975`. El año es el de la **primera publicación**, no el del remaster. Una vez publicado, el id no cambia.
- **Campos** (añádelos a `Item` como opcionales, con un comentario «solo canciones»):
  `creator` = artista tal y como se muestra, `artistId?` = el `artist:…` del seed si existe, `album?`, `isrc?`, `durationSec?`, `mbid` = id de la grabación de MusicBrainz, `genres`, `popularity`, `posterUrl` = carátula, `synopsis` (puede ir vacía de momento), `src` con la procedencia de cada campo, como el resto del catálogo.
- `SHELF_LABEL.song`: plural «Canciones», singular «canción», `seen` «escuchadas», `seenFem` «escuchada», `stamp` «¡LA CONOZCO!», `actionPast` «Escuchada», pronombre «la» / «La», `verbPast` «escuchó», `verbPerfSingular` «la ha escuchado», etc., siguiendo el patrón de las demás y la guía `docs/T20_TEXTOS.md`.
- **Nunca se guardan letras**, ni enteras ni a trozos.

### 28.2 De dónde salen (scripts en `app/scripts/songs/`, cachés en `app/scripts/cache/songs/`)
Mercado España. Objetivo del catálogo de partida: **entre 4.000 y 6.000 canciones.**
1. **Canciones más escuchadas de cada artista del seed:** 409 de los 410 artistas tienen `mbid`. Para cada uno, sus 10-15 grabaciones más populares (ListenBrainz `popularity/top-recordings-for-artist/<mbid>` y MusicBrainz para los datos). ListenBrainz tiene la **licencia por confirmar** (`ENRIQUECIMIENTO.md:129`): se usa con procedencia (`src: 'listenbrainz'`), igual que el resto de fuentes de esa tabla.
2. **Éxitos en España:** listas de éxitos de PROMUSICAE / Los 40 de los últimos años y las listas clásicas, como las 500 de Rolling Stone, raspadas con procedencia (regla de raspado de `PROJECT_CONTEXT.md`). Cada canción se resuelve a una grabación de MusicBrainz. Si no se resuelve, va a `cache/songs/sin-resolver.json`, no al catálogo.
3. MusicBrainz a **1 petición por segundo** y con User-Agent propio (como `MOTOR.md:457`). Todo queda en caché para no repetir peticiones.

### 28.3 Lo difícil: una canción, no cinco versiones
La misma canción aparece como original, remaster, directo, versión de un recopilatorio o «feat.». **Se juntan en una sola:**
- Primero por **obra de MusicBrainz** (*work*): las grabaciones del mismo artista y la misma obra son la misma canción, salvo que la grabación sea una versión de otro artista.
- Si no hay obra, por **ISRC**, y si tampoco, por título normalizado + artista. El título normalizado quita «Remastered», «Live», «- 2011 Remaster», «(feat. …)», «Radio Edit», paréntesis de versión y tildes y mayúsculas.
- Se queda la **grabación original de estudio** (la de fecha más antigua que no sea directo ni demo) para el año y la carátula.
- **Test de riesgo de datos** (`app/scripts/songs/dedupe.test.mjs` o en vitest): 15 casos reales difíciles, cada uno con el resultado esperado escrito a mano. Por ejemplo: «Bohemian Rhapsody» y «Bohemian Rhapsody - Remastered 2011» → una; «Hurt» de Nine Inch Nails y la de Johnny Cash → dos; una canción en directo y la de estudio → una; dos canciones distintas con el mismo título de artistas distintos → dos.
- En el registro: cuántas grabaciones entraron, cuántas canciones quedaron y 30 grupos fusionados al azar para que Igor los revise.

### 28.4 Carátulas y peso
- **Carátula:** la del single o el disco de la grabación original. Por orden: Cover Art Archive (por *release-group* de MusicBrainz) → raspado de la búsqueda de iTunes (artwork a 600 px) → foto del artista del seed → póster generado. **Siempre alojada por nosotros**, reutilizando `scripts/engine/covers.mjs` (bucket de Supabase, ruta `song/<slug>.webp`, webp de 300-400 px, registro en `posterUrl.jsonl`, `src.posterUrl` con la fuente). No se usan imágenes de Deezer (`ENRIQUECIMIENTO.md:184`).
- **Las canciones no van en `seed.json` ni en el paquete principal.** Hoy `seed.json` (10,8 MB) se importa entero en el JavaScript de la app (`data/catalog.ts`). Las canciones van a `app/public/data/songs.json`, con campos cortos (unos 500 bytes por canción, unos 3 MB en total) y **solo se descargan si `SHELF_ENABLED.song` está a `true`**, en segundo plano al abrir la app. `app/src/data/songs.ts` las carga y las mete en el mismo índice que usa `getItem` / `itemsOfType`, para que listas, perfil y amigos las encuentren. Mientras no han llegado, las pantallas no pueden romperse si `getItem` devuelve `undefined`.
- En el registro: tamaño real de `songs.json` (sin comprimir y comprimido con gzip) y el % de canciones con carátula real.

### 28.5 Lo que tiene que funcionar en la app
- **Estantería de Canciones** con tarjetas cuadradas (T27), swipe de 3 gestos (no me interesa / la conozco / escuchar luego), valoración y **duelos A/B** para el ranking, como el resto de estanterías.
- **Búsqueda al añadir:** si la canción no está en el catálogo, se busca en MusicBrainz desde la app (mismo patrón que el catálogo vivo de `store/useCatalog.ts`), se aplica la misma regla de 28.3 para no crear un duplicado de una canción que ya existe y se guarda con la carátula de Cover Art Archive. Si no hay carátula, póster generado.
- **Imports:** `lib/import/spotify-history.ts` hoy solo agrupa por artista. Que además cree **canciones** con su número de escuchas (`master_metadata_track_name` + artista), y que las 20 más escuchadas entren con 5 estrellas, igual que hoy con los artistas. Lo mismo en `youtube-music.ts` y `apple-music.ts` si traen el nombre de la canción. Solo con el interruptor encendido. **Test de riesgo de datos** en `import.test.ts`: un historial de ejemplo produce las canciones esperadas, las escuchas suman bien y una canción repetida con remaster cuenta como una.
- **Listas compartidas:** una lista puede mezclar canciones con lo demás (`IDEA.md:96`). La página pública muestra la carátula y un enlace «Abrir en Spotify» que es una **búsqueda** (`https://open.spotify.com/search/<título artista>`). No hace falta ninguna API.
- **Mazo de Descubrir:** las canciones entran con los mismos cupos que el resto de estanterías. Para empezar, la fama sale de `popularity` pasada a percentil dentro de la estantería (MOTOR §2b regla 3).
- **Fuera de alcance ahora** (no se hace): Decidir y «¿Qué vemos?» con canciones, las anclas de T22, los vectores del cerebro, los fragmentos de audio de 30 s (Igor decide aparte: chocan con la regla de imágenes y audio alojados por nosotros) y exportar una playlist a Spotify.

### 28.6 Paradas para Igor (⛔ no sigas sin su OK)
1. **Tras 28.2 y 28.3, antes de tocar la app:** `docs/registro/T28.md` con cuántas canciones salen, el % con carátula real, el % de grabaciones sin resolver, los 30 grupos fusionados y 50 canciones al azar con su carátula. Igor decide si vale la pena seguir.
2. **Al acabar:** la lista de qué mirar en el móvil, con el interruptor encendido y apagado.

### 28.7 Hecho cuando
- Con `song: true`: estantería, swipe, duelos, búsqueda, import de Spotify y listas funcionan (lo comprueba Igor en el móvil). Con `song: false`: la app queda exactamente como antes de T28 y no se descarga `songs.json`.
- Los tres tests de riesgo de datos (interruptor, versiones duplicadas e import) en verde.
- tsc y vitest en verde, pegados en el registro.
- `PROJECT_CONTEXT.md` actualizado: la estantería existe, está detrás de `SHELF_ENABLED.song` y está pendiente decidir si se activa en el lanzamiento.

---

## T28.8 — Correcciones tras la entrega (25/10/2026, revisión de Claude)

> Revisado sobre `a8ac059`. Los títulos vacíos, los `mbid` repetidos, las versiones de DJ y las carátulas en Supabase están bien. Queda esto. **Va antes de que nadie guarde canciones**, porque el año va dentro del id y el id no puede cambiar una vez publicado. Mismas normas comunes de arriba, commits `T28.8: …`, registro en `docs/registro/T28.md` (sección nueva, con la salida real).

### 28.8.1 Año de primera publicación (lo más importante)
**Qué pasa:** el año sale de la grabación encontrada, que muchas veces es un remaster o un recopilatorio. 3.360 de 4.474 canciones tienen año ≥ 2000. Ejemplos de `songs.json`:

| Canción | Año en el catálogo | Año real |
|---|---|---|
| Stairway to Heaven | 2022 | 1971 |
| Sweet Child O' Mine | 2025 | 1987 |
| Billie Jean | 2009 | 1982 |
| Bohemian Rhapsody | 2004 | 1975 |
| Wish You Were Here | 2005 | 1975 |
| Entre dos tierras | 2005 | 1990 |
| Like a Rolling Stone | 1978 | 1965 |
| Wonderwall | 1996 | 1995 |
| Mediterráneo (Serrat) | 2000 | 1971 |
| Hijo de la Luna | 1989 | 1986 |

**Cómo se arregla:** el año es la fecha **más antigua** entre:
- todas las grabaciones de la misma **obra** de MusicBrainz (`work`) del mismo artista, contando solo las de estudio (las versiones de otros artistas no cuentan);
- el `first-release-date` del *release-group* del disco o single original.

Si una canción no tiene obra, se usa el `first-release-date` mínimo de los *release-groups* de su grabación. El año de iTunes **nunca** se usa para el año. Si no hay ninguno de estos datos, la canción va a `sin-resolver.json` con el motivo.

**Después:** regenerar los ids (`song:<titulo>-<artista>-<año>`) y las rutas de las carátulas (`song/<slug>.webp`). Hay que borrar del bucket las carátulas con el slug viejo. No hay que migrar nada: aún no hay usuarios con canciones guardadas.

**Test de riesgo de datos** (en `dedupe.test.mjs` o uno nuevo, con datos de MusicBrainz guardados en un archivo de prueba y sin red): las 10 canciones de la tabla salen con su año real.

**En el registro:**
- la tabla de arriba con el año nuevo;
- cuántas canciones hay por década, antes y después del arreglo;
- las 20 canciones que más han cambiado de año.

### 28.8.2 Colaboraciones en el título y en el id
`song:mamichula-con-nicki-nicole-bizarrap-2020`: «con …», «with …», «feat. …», «ft. …» y «junto a …» se quitan del título y del id, igual que el resto de coletillas. Añade este caso al test de 28.3.

### 28.8.3 Búsqueda en MusicBrainz al añadir (faltaba de 28.5)
Hoy el buscador de añadir solo encuentra las canciones de `songs.json`. Tiene que hacer esto:
1. Si una búsqueda en la estantería de Canciones da pocos resultados locales (menos de 5), consulta en el momento la búsqueda de grabaciones de MusicBrainz (`/ws/2/recording?query=…&fmt=json`). Una petición por búsqueda, con espera de 400 ms tras la última tecla (*debounce*) y como mucho 1 por segundo.
2. Cada resultado pasa por las mismas reglas que el catálogo: quitar coletillas, saltar versiones de DJ, año según 28.8.1 (si no se puede calcular en el momento, el de la grabación más antigua de la obra que devuelva la búsqueda) y el **mismo formato de id**. Si el id o el `mbid` ya existen en `songs.json`, se usa el que hay. Nunca se crea un duplicado.
3. La carátula se toma de Cover Art Archive en ese momento. Si no hay, póster generado. Alojarla en nuestro Supabase puede quedar para un paso nocturno o en servidor; apúntalo como pendiente en el registro si no lo haces ahora.
4. Lo que el usuario añade se guarda en el catálogo vivo (`store/useCatalog.ts`), como el resto de estanterías.
5. Sin conexión o si MusicBrainz falla, se muestran solo los resultados locales, sin errores en pantalla.

Prueba a mano y pega en el registro el resultado de buscar «Imagine», «Zombie» y «Macarena»: no están en el catálogo porque John Lennon, The Cranberries y Los del Río no están entre los artistas.

### 28.8.4 Duelos de canciones
Confirma en el registro, con el archivo y la línea, que los duelos A/B del ranking (Comparar) funcionan con canciones con tarjetas cuadradas (27.3 regla 4). Si no estaban conectados, conéctalos.

### 28.8.5 Hecho cuando
- `songs.json` regenerado: 0 años de iTunes, la tabla de 28.8.1 correcta, ids y carátulas con el año nuevo y 0 carátulas huérfanas en el bucket.
- La búsqueda viva funciona con los tres ejemplos.
- tsc limpio, y en verde los tests de riesgo (interruptor, versiones duplicadas con los casos nuevos, años, import), pegados en el registro.
- Lista corta de qué tiene que mirar Igor en el móvil.
