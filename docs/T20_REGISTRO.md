# T20_REGISTRO — Registro de comprobaciones de la tarea T20

Fecha: 23/10/2026

---

## T20.1 — Limpiar el catálogo de obras basura

### Candidatas identificadas
Generadas con `node app/scripts/engine/junk-candidates.mjs`. Reporte completo en `app/scripts/cache/junk/candidatas.md`.
Total candidatas: **37** (32 programas/reality shows de relleno de televisión estadounidense y 5 publicaciones no comerciales/microfilms/folletos de libros).

Obras ocultas por estantería aplicadas con `hidden: true`:
- `movie`: 0
- `series`: 32
- `book`: 5
- `boardgame`: 0
- `artist`: 0

### Comprobación 1: `node app/scripts/engine/coverage.mjs`
```
📊 ESTADO DE COBERTURA DEL CATÁLOGO (ENRIQUECIMIENTO.md §1.1 y §6)

| Categoría | Obras | ID Ext. | Metadatos (votos/lect.) | Palabras clave | Sinopsis | Portada legal | Ejes LLM |
|---|---|---|---|---|---|---|---|
| **movie** | 935 | TMDB: 79.9% · Wiki: 85.9% | Votos: 84.4% | 84.4% | 98.7% | 0.0% | 99.9% |
| **series** | 966 | TMDB: 73.1% · Wiki: 88.4% | Votos: 86.9% | 86.9% | 88.2% | 0.0% | 103.3% |
| **book** | 983 | OLID: 96.9% · Wiki: 43.4% | Readers: 95.3% | 86.2% | 99.3% | 0.0% | 100.5% |
| **boardgame** | 1018 | Wiki: 69.5% | Votos: 68.9% | 68.9% | 91.5% | 0.3% | 99.7% |
| **artist** | 410 | MBID: 99.8% · Wiki: 97.6% | Votos: 0.0% | 60.2% | 100.0% | 0.0% | 100.0% |

Ocultas por estantería: movie: 0, series: 32, book: 5, boardgame: 0, artist: 0
```

### Comprobación 2: `npx vitest run app/src/lib/engine/hidden.test.ts`
```
 RUN  v5.0.4 C:/Users/igora/.gemini/antigravity/scratch/biblioteca-app/app

 ✓ src/lib/engine/hidden.test.ts (1 test) 20ms
   ✓ T20.1 — Obras ocultas (hidden) (1)
     ✓ una obra oculta no sale en nextCards ni en nextDuel 20ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  11:48:38
   Duration  463ms
```

### Comprobación suite completa y TypeScript:
- `npx vitest run`: 143 passed (21 test files)
- `npx tsc -p app/tsconfig.json --noEmit`: 0 errores

---

## T20.2 — Ids de Wikidata de los libros (≥ 75 %)

### Procedimiento
1. Ejecución de `enrich-books-wikidata.mjs` con las vías de enriquecimiento: OLID (P648), búsqueda Cirrus por título y autor, y verificación estricta de tipo de libro contra las raíces `['Q47461344', 'Q7725634', 'Q571']` de `check-wikidata-type.mjs`.
2. Subida sistemática a la obra principal mediante `P629` («edición de») para 161 ediciones antiguas.
3. Casos con múltiples candidatas documentados en `app/scripts/cache/books/ambiguos.md`.
4. Atributos consolidados en `app/scripts/cache/attrs/wikidataId.jsonl` y `seed.json`.

### Comprobación 1: `node app/scripts/engine/coverage.mjs`
```
| **book** | 983 | OLID: 96.9% · Wiki: 75.4% | Readers: 95.3% | 86.2% | 99.3% | 0.0% | 100.5% |
```
Resultado: **75.4% ≥ 75.0% requerido** (741/983 libros con wikidataId).
El atributo `wikidataId` en `book` ha desaparecido de la tabla de huecos.

### Comprobación 2: `node app/scripts/engine/check-wikidata-type.mjs`
```
Checking 741 books in seed...
Bad books count: 0
```
Resultado: **0 libros mal enlazados**.

### Comprobación de compilación y tests:
- `npx tsc -p app/tsconfig.json --noEmit`: 0 errores
- `npx vitest run`: 143 passed (21 test files)

---

## T20.3 — Visitas de Wikipedia (≥ 90 % de las obras con id, en todas las estanterías)

### Causa investigada: por qué los artistas tenían 4 de 400
1. **Sitelinks en caché:** Los sitelinks de Wikipedia en `sitelinks-cache.json` sí existían para 396/400 artistas (descargados correctamente por su QID de Wikidata).
2. **Causa raíz:** En ejecuciones previas de `enrich-pageviews.mjs`, se utilizaba concurrencia elevada (8 trabajadores concurrentes solicitando 6 idiomas cada uno simultáneamente). Esto generaba ráfagas de más de 45 peticiones instantáneas a la API REST de Wikimedia (`wikimedia.org/api/rest_v1/metrics/pageviews/per-article/`), provocando respuestas masivas `HTTP 429 Too Many Requests`.
3. **Manejo de error defectuoso previo:** El script capturaba el error 429 retornando `0` para cada idioma y guardaba `{ es: 0, en: 0, fr: 0, de: 0, it: 0, pt: 0 }` en `pageviews.jsonl`.
4. **Impacto en métricas:** En `coverage.mjs`, `hasPageviews` requería una suma de visitas estrictamente mayor que 0 (`reduce((a, b) => a + b, 0) > 0`). Por ello, las 396 obras de artistas cuyos valores se guardaron en 0 por el rate-limit figuraban como "sin visitas".
5. **Solución aplicada en `enrich-pageviews.mjs`:**
   - Procesamiento secuencial sin ráfagas con ritmo controlado (pausa de 35ms por llamada de idioma).
   - Detección y reintento con backoff exponencial progresivo (3s, 6s, 9s) ante cualquier `HTTP 429`.
   - Consulta incremental de sitelinks faltantes para los nuevos QIDs de libros asignados en T20.2.
   - Guardado inmediato y persistente en `pageviews.jsonl` (incluyendo `{}` para obras sin artículo en ninguno de los 6 idiomas para no reencolarlas).
   - Descarga completada: 1000 obras procesadas (953 con visitas > 0).

### Comprobación: `node app/scripts/engine/coverage.mjs`
```
1. Cobertura de pageviews (≥ 90 % de las obras con wikidataId):
   ✓ Pageviews en 'movie': 100.0% (≥ 90%)
   ✓ Pageviews en 'series': 100.0% (≥ 90%)
   ✓ Pageviews en 'book': 100.0% (≥ 90%)
   ✓ Pageviews en 'boardgame': 100.0% (≥ 90%)
   ✓ Pageviews en 'artist': 100.0% (≥ 90%)
```
Resultado: **✓ en las 5 estanterías (todas al 100.0%)**.

### Comprobación de compilación y tests:
- `npx tsc -p app/tsconfig.json --noEmit`: 0 errores
- `npx vitest run`: 143 passed (21 test files)


---

## T20.4 — Volver a calcular la fama y comprobar la lista de oro

### Procedimiento
1. Revisión de `nivel1.md`: se detectaron 28 obras en juegos de mesa (ej. *Nippon*, *Mexica*, *Indonesia*, *Cuba*, *Lisboa*, *Praga*, etc.) cuya fama `fameLlm: 0.75` había sido asignada por el LLM confundiéndolas con nombres geográficos/ciudades famosas, así como dos películas de Bollywood (*Queen* 2013 y *Pink* 2016) confundidas con los artistas homónimos, la serie *Hung* y el relato de ciencia ficción *I Have No Mouth and I Must Scream*.
2. Se corrigió su valor con `src: 'manual'` (`ES: 0.1` o `0.0`) en `app/scripts/cache/attrs/fameLlm.jsonl`.
3. Se actualizó la jerarquía de fuentes en `app/scripts/engine/attrs.mjs` para garantizar que la curación humana explícita (`manual`) tenga máxima prioridad sobre la inferencia heurística (`llm-infer`).
4. Reconstrucción con `node app/scripts/engine/build.mjs`.

### Comprobación: `node app/scripts/engine/coverage.mjs` (apartados 3 y 4)
```
3. IDs de la lista de oro:
   ✓ Titanic (Q44578) en movie
   ✓ El padrino (Q47703) en movie
   ✓ La guerra de las galaxias (Q17738) en movie
   ✓ El rey león (Q36479) en movie
   ✓ Harry Potter y la piedra filosofal (Q102438) en movie
   ✓ Avatar (Q24871) en movie
   ✓ Torrente (Q1050105) en movie
   ✓ Friends (Q79784) en series
   ✓ Los Simpson (Q886) en series
   ✓ La casa de papel (Q29647346) en series
   ✓ Juego de tronos (Q23572) en series
   ✓ Aída (Q2916884) en series
   ✓ Harry Potter y la piedra filosofal (Q43361) en book
   ✓ Don Quijote (Q480) en book
   ✓ 1984 (Q208460) en book
   ✓ El principito (Q25338) en book
   ✓ Cien años de soledad (Q178869) en book
   ✓ Monopoly (Q17243) en boardgame
   ✓ Parchís (Q2051664) en boardgame
   ✓ Trivial Pursuit (Q172440) en boardgame
   ✓ UNO (Q17267) en boardgame
   ✓ Cluedo (Q172460) en boardgame
   ✓ Ajedrez (Q718) en boardgame
   ✓ Queen (Q15862) en artist
   ✓ The Beatles (Q1299) en artist
   ✓ Michael Jackson (Q2831) en artist
   ✓ Shakira (Q34424) en artist
   ✓ Rosalía (Q28843759) en artist
   ✓ Alejandro Sanz (Q276170) en artist

4. Reglas de notoriedad y nivel de fama de la lista de oro (A.5):
   ✓ En 'movie': Tier 1 (mín 0.98) > Low (máx 0.33)
   ✓ En 'series': Tier 1 (mín 0.98) > Low (máx 0.61)
   ✓ En 'book': Tier 1 (mín 0.98) > Low (máx 0.44)
   ✓ En 'boardgame': Tier 1 (mín 0.98) > Low (máx 0.54)
   ✓ En 'artist': Tier 1 (mín 0.98) > Low (máx 0.17)
```
Resultado: **✓ en todas las comprobaciones de apartados 3 y 4**.

### Las 10 primeras obras de Nivel 1 por estantería

#### Libros
| # | Título | Año | Creador | Notoriedad | FameLLM | ID |
|---|---|---|---|---|---|---|
| 1 | **Don Quijote de la Mancha** | 1605 | Miguel de Cervantes | 1 | 1 | `book:don-quijote-de-la-mancha-1605` |
| 2 | **1984** | 1949 | George Orwell | 1 | 1 | `book:1984-1949` |
| 3 | **El principito** | 1943 | Antoine de Saint-Exupéry | 0.99 | 1 | `book:el-principito-1943` |
| 4 | **Cien años de soledad** | 1967 | Gabriel García Márquez | 0.98 | 1 | `book:cien-anos-de-soledad-1967` |
| 5 | **Harry Potter y la piedra filosofal** | 1997 | J. K. Rowling | 0.98 | 1 | `book:harry-potter-y-la-piedra-filosofal-1997` |
| 6 | **El conde de Montecristo** | 1844 | Alexandre Dumas | 1 | 1 | `book:el-conde-de-montecristo-1844` |
| 7 | **Cumbres borrascosas** | 1847 | Emily Brontë | 1 | 1 | `book:cumbres-borrascosas-1847` |
| 8 | **El Señor de los Anillos** | 1954 | J. R. R. Tolkien | 1 | 1 | `book:el-senor-de-los-anillos-1954` |
| 9 | **Animal Farm** | 1945 | George Orwell | 0.99 | 1 | `book:animal-farm-1945` |
| 10 | **Lord of the Flies** | 1954 | William Golding | 0.99 | 1 | `book:lord-of-the-flies-1954` |

#### Series
| # | Título | Año | Creador | Notoriedad | FameLLM | ID |
|---|---|---|---|---|---|---|
| 1 | **Juego de tronos** | 2011 | David Benioff y D. B. Weiss | 1 | 1 | `series:juego-de-tronos-2011` |
| 2 | **Los Simpson** | 1989 | Matt Groening | 0.99 | 1 | `series:los-simpson-1989` |
| 3 | **Friends** | 1994 | David Crane y Marta Kauffman | 0.99 | 1 | `series:friends-1994` |
| 4 | **La casa de papel** | 2017 | Álex Pina | 0.98 | 1 | `series:la-casa-de-papel-2017` |
| 5 | **Aída** | 2005 | Nacho G. Velilla | 0.98 | 1 | `series:aida-2005` |
| 6 | **Planet Earth** | 2006 | BBC One | 1 | 1 | `series:planet-earth-2006` |
| 7 | **Peaky Blinders** | 2013 | Steven Knight | 1 | 1 | `series:peaky-blinders-2013` |
| 8 | **The Boys** | 2019 | Eric Kripke | 1 | 1 | `series:the-boys-2019` |
| 9 | **Yellowstone** | 2018 | Taylor Sheridan | 1 | 1 | `series:yellowstone-2018` |
| 10 | **From** | 2022 | John Griffin | 1 | 1 | `series:from-2022` |

#### Juegos de mesa
| # | Título | Año | Creador | Notoriedad | FameLLM | ID |
|---|---|---|---|---|---|---|
| 1 | **Monopoly** | 1935 | Charles Darrow, Elizabeth J. Magie | 0.98 | 1 | `boardgame:monopoly-1935` |
| 2 | **UNO** | 1971 | Merle Robbins | 0.98 | 1 | `boardgame:uno-1971` |
| 3 | **Parchís** | 1900 | Tradicional | 0.98 | 1 | `boardgame:parchis-1900` |
| 4 | **Cluedo** | 1949 | Anthony E. Pratt | 0.98 | 1 | `boardgame:cluedo-1949` |
| 5 | **Trivial Pursuit** | 1981 | Scott Abbott y Chris Haney | 0.98 | 1 | `boardgame:trivial-pursuit-1981` |
| 6 | **Risk Legacy** | 2011 | Chris Dupuis, Rob Daviau | 1 | 1 | `boardgame:risk-legacy-2011` |
| 7 | **Ajedrez** | 1475 | Tradicional | 0.99 | 1 | `boardgame:chess-1475` |
| 8 | **Scrabble** | 1948 | Alfred Mosher Butts | 0.97 | 1 | `boardgame:scrabble-1948` |
| 9 | **Risk** | 1959 | Albert Lamorisse, Michael I. Levin | 0.97 | 1 | `boardgame:risk-1959` |
| 10 | **Catan** | 1995 | Klaus Teuber | 0.97 | 1 | `boardgame:catan-1995` |

#### Artistas
| # | Título | Año | Creador | Notoriedad | FameLLM | ID |
|---|---|---|---|---|---|---|
| 1 | **Michael Jackson** | 1971 | Indiana, EE. UU. | 1 | 1 | `artist:michael-jackson-1971` |
| 2 | **Shakira** | 1990 | Barranquilla, Colombia | 1 | 1 | `artist:shakira-1990` |
| 3 | **The Beatles** | 1960 | Liverpool, Reino Unido | 0.98 | 1 | `artist:the-beatles-1960` |
| 4 | **Rosalía** | 2017 | Barcelona, España | 0.98 | 1 | `artist:rosalia-2017` |
| 5 | **Queen** | 1970 | Londres, Reino Unido | 0.98 | 1 | `artist:queen-1970` |
| 6 | **Alejandro Sanz** | 1989 | Madrid, España | 0.98 | 1 | `artist:alejandro-sanz-1989` |
| 7 | **Bad Bunny** | 2016 | Vega Baja, Puerto Rico | 0.89 | 0.75 | `artist:bad-bunny-2016` |
| 8 | **Taylor Swift** | 2006 | Pensilvania, EE. UU. | 0.88 | 0.75 | `artist:taylor-swift-2006` |
| 9 | **Dua Lipa** | 2015 | Londres, Reino Unido | 0.88 | 0.75 | `artist:dua-lipa-2015` |
| 10 | **Madonna** | 1982 | Bay City, Michigan, EE. UU. | 0.88 | 0.75 | `artist:madonna-1982` |

#### Películas
| # | Título | Año | Creador | Notoriedad | FameLLM | ID |
|---|---|---|---|---|---|---|
| 1 | **Avatar** | 2009 | James Cameron | 1 | 1 | `movie:avatar-2009` |
| 2 | **El padrino** | 1972 | Francis Ford Coppola | 1 | 1 | `movie:el-padrino-1972` |
| 3 | **Titanic** | 1997 | James Cameron | 0.99 | 1 | `movie:titanic-1997` |
| 4 | **El rey león** | 1994 | Roger Allers y Rob Minkoff | 0.98 | 1 | `movie:el-rey-leon-1994` |
| 5 | **La guerra de las galaxias** | 1977 | George Lucas | 0.98 | 1 | `movie:star-wars-1977` |
| 6 | **Harry Potter y la piedra filosofal** | 2001 | Chris Columbus | 0.98 | 1 | `movie:harry-potter-and-the-philosopher-s-stone-2001` |
| 7 | **Torrente, el brazo tonto de la ley** | 1998 | Santiago Segura | 0.98 | 1 | `movie:torrente-el-brazo-tonto-de-la-ley-1998` |
| 8 | **Brazil** | 1985 | Terry Gilliam | 1 | 1 | `movie:brazil-1985` |
| 9 | **La La Land** | 2016 | Damien Chazelle | 1 | 1 | `movie:la-la-land-2016` |
| 10 | **Oppenheimer** | 2023 | Christopher Nolan | 1 | 1 | `movie:oppenheimer-2023` |

### Comprobación de compilación y tests:
- `npx tsc -p app/tsconfig.json --noEmit`: 0 errores
- `npx vitest run`: 143 passed (21 test files)
