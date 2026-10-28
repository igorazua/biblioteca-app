# Catálogo por idiomas: título y carátula de cada país (28/10/2026)

## La regla (decisión de Igor, 28/10/2026)

1. Cada obra se enseña **como se conoce en el país del usuario**: el título y la carátula con los que se distribuyó allí.
2. Si no hay versión local (no se estrenó aquí, no está traducido), se enseña la **original**, con su título original.
3. **Título y carátula siempre de la misma versión.** Nunca el título español con el póster inglés, ni al revés.
4. Se guardan **varias versiones por obra** (una por idioma); cada usuario ve la de su idioma o, si no hay, la original.
   Hoy solo se rellena el español; el inglés llegará cuando se traduzca la app.

| Estantería | Qué se localiza | Fuente para el español |
|---|---|---|
| Pelis y series | título + póster | **JustWatch España** (los pósteres que se ven en España) |
| Libros | título + portada de la edición en ese idioma | **Google Books** (sin clave, `langRestrict=es`) y **ediciones en español de Open Library** |
| Juegos de mesa | solo el nombre si hay edición española (*Aventureros al tren*) | BGG (nombres alternativos) o la propia caja |
| Artistas | nada | — |

## Modelo de datos (común a A y B)

En cada obra del catálogo (`seed.json` y, al partirlo, `catalog-index.json` y `shelves/<shelf>.json`):

```jsonc
{
  "title": "…",            // como hoy: el nombre que se enseña en España (no se toca)
  "originalTitle": "The Godfather",   // título original (YA EXISTE en 479 obras; rellenar donde falte)
  "posterUrl": "…",        // como hoy: la carátula ORIGINAL (no se toca)
  "local": {               // nuevo: versiones por idioma; cada una con su título y su carátula juntos
    "es": { "title": "El padrino", "poster": "https://…/biblio-covers/es/movie/el-padrino-1972.webp", "src": "justwatch-es" }
  }
}
```

La app elige: `local[idioma]` si existe (título y carátula juntos); si no, `title` + `posterUrl`.

---

## Parte A — Datos: carátulas y títulos en español · **Gemini**

**Reglas:** las de `docs/TAREAS_CEREBRO_V3.md` (raspado a ≤ 1 petición/s, caché reanudable, ids canónicos de
`aliases.json`, sin commits, sin revisiones visuales) y las de `docs/MOTOR.md` §2b.2: un dato del LLM nunca pisa uno
de fuente dura; cada dato con su procedencia (`src`).

1. **Pelis y series — JustWatch España** (`https://apis.justwatch.com/graphql`, ya usado en
   `app/scripts/brain/sources/justwatch.mjs`): por cada obra, su ficha en España → título español y póster español.
   Cruce por `tmdbId` / `imdbId` (los da JustWatch) y, si no, título + año. Descarga el póster en tamaño grande.
2. **Libros:** Google Books `https://www.googleapis.com/books/v1/volumes?q=intitle:…+inauthor:…&langRestrict=es` (sin
   clave; respeta su límite) y, si no, las ediciones con `languages: spa` de Open Library (por `olid`). Quédate con la
   edición española más conocida (más valoraciones o la más reciente de una editorial grande) y su portada.
   **Ojo con los cruces falsos** (otro libro del mismo autor): exige título y autor, y apunta los dudosos.
3. **Juegos de mesa:** solo el nombre español si existe (nombres alternativos de BGG, que ya tenemos por
   `app/scripts/cache/graph/sources/bgg/ids.json`). Sin carátula nueva.
4. **Subida:** cada carátula, en vertical (comprueba la forma, como en T14) y en webp, a Supabase Storage
   `biblio-covers/es/<shelf>/<slug>.webp` (el mismo bucket y forma que hoy, con `/es/`). Mira cómo sube
   `app/scripts/engine/covers.mjs`.
5. **Escritura:** `originalTitle` donde falte (el título original que dé la fuente; el campo ya existe) y `local.es` en `seed.json`, con un atributo en el
   registro de atributos (`app/scripts/engine/fill-attr.mjs`) para que no se pierda al regenerar el catálogo; luego
   `npm run catalog:split`.
6. **Informe:** cobertura por estantería (con `local.es` / total), 20 ejemplos por estantería (título antes → después y
   las dos carátulas) y la lista de dudosos.

**No toques** `app/src` salvo los JSON del catálogo, ni la popularidad, notoriedad o nivel de fama (aprendido el
27/10: regenerar el catálogo los movió sin querer; si cambian, devuélvelos como estaban).

**Hecho cuando:** ≥ 80 % de las pelis, ≥ 70 % de las series y ≥ 60 % de los libros tienen `local.es` con título y
carátula, los dudosos están listados, `npx tsc -p app/tsconfig.json --noEmit` y `cd app && npx vitest run` en verde.

---

> **Hecho (28/10/2026, Gemini; revisado por Claude).** Carátulas españolas subidas a `biblio-covers/es/` y aplicadas con
> `app/scripts/localize/apply.mjs`. **Corrección de Claude — regla de España:** JustWatch ES saca los títulos de TMDB en
> español, que mezclan España y Latinoamérica («Pulp Fiction: Tiempos violentos», «Otro día para matar», «Bajo escucha»),
> y hubo cruces con otra obra (*Regreso al futuro* → la II, *Top Gun: Maverick* → la de 1986) porque nuestro `tmdbId`
> estaba mal. Ahora la versión local solo se acepta si su título coincide con nuestro `title` (de Wikidata en español,
> que acierta con el uso de España); los juegos, siempre (se localiza el nombre). Resultado: pelis 588/935 (63 %),
> series 523/1.054 (50 %), libros 601/976 (62 %), juegos 34. Descartadas: 267 pelis, 299 series, 23 libros (lista en
> `scripts/localize/localization-report.json`). Pendiente: corregir los `tmdbId` erróneos del catálogo.

## Parte B — App: elegir versión por idioma · **Haiku**

1. `app/src/types.ts`: en `Item`,
   `local?: Partial<Record<string, { title?: string; poster?: string; src?: string }>>`.
2. `app/src/lib/locale.ts` (nuevo, puro):
   - `userLang()`: el idioma del perfil (`profile.lang`, hoy `'es'`);
   - `displayTitle(item, lang)` y `displayPoster(item, lang)`: `local[lang]` si tiene título **y** carátula (van juntos,
     nunca uno sin otro); si no, `item.title` y `item.posterUrl`.
   - 3-4 tests en `lib/locale.test.ts`: con versión local completa usa las dos; con solo título local, ninguna; sin `local`, lo de siempre.
3. Que **todas** las carátulas y títulos de obras pasen por esas dos funciones: el componente `Poster`
   (`app/src/components/Poster.tsx`) y los sitios que pintan `item.title` (búscalos todos con grep: fichas, listas,
   mazo, duelos, Decidir, compartir). No cambies nada más de esas pantallas.
4. `app/scripts/split-catalog.mjs`: que `catalog-index.json` lleve `local` (título y carátula).

> **Hecho (28/10/2026, Haiku; revisado por Claude).** `lib/locale.ts` (`displayTitle`, `displayPoster`, `searchTitles`) con tests; todas las carátulas y títulos de obras pasan por ahí; el índice lleva `local`. Se usa el `originalTitle` que ya existía (no hay `origTitle`).
5. Sin datos de la parte A todo debe verse exactamente igual que hoy.

**Reglas:** sin commits, sin revisiones visuales, `npx tsc -p app/tsconfig.json --noEmit` y `cd app && npx vitest run`
en verde.

**Hecho cuando:** las dos funciones existen con sus tests, todo título y carátula de obra pasa por ellas, y el
catálogo partido lleva los campos nuevos.

---

## Fase 2 (más adelante): textos de la interfaz

Hoy los textos de la app están escritos en español dentro de cada pantalla, sin sistema de idiomas. Antes de traducir
la app: sacarlos a `app/src/i18n/es.json` con `i18next` (o una función `t()` propia ligera), pantalla a pantalla, y
poner `profile.lang` en Ajustes. Los nombres del código ya están en inglés; los comentarios pasarán a inglés al tocar
cada archivo.
