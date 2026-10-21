# Plan de enriquecimiento del catálogo — Biblioteca

> **Para quién:** el agente que lo ejecute (Gemini u otro). Es un **manual de ejecución** encima de `docs/MOTOR.md` §4-§6, que sigue siendo la especificación. Donde este documento cambia algo de MOTOR, se dice.
> **Estado:** v1.0 (16/10/2026).
> ⚠️ **21/10/2026:** las reglas de licencia de §0.4, §2.3, §4 y E3 quedan **sustituidas** por la regla de catálogo de `PROJECT_CONTEXT.md` (raspado permitido con imágenes alojadas por nosotros y procedencia). No hay TMDB. Los huecos de datos se rellenan con el registro de atributos de `docs/MOTOR.md` §2b.2. El orden de trabajo vigente está en `docs/TAREAS_MOTOR_V2.md`.
> **Objetivo:** que cada obra de todas las categorías tenga los datos que **consumen los motores** (Descubrir y Decidir) y el contexto que necesita el LLM para describirla bien. **No se trata de bajar todo lo que exista**: si un campo no lo lee ningún motor, ni la ficha, ni el LLM, no se descarga (§3).

---

## 0. Reglas
1. Lee antes `PROJECT_CONTEXT.md`, `docs/IDEA.md` §7b y `docs/MOTOR.md` §0, §4, §5, §6 y §12.
2. Todos los scripts son **idempotentes y con caché** (`app/scripts/cache/…`). Se pueden reanudar, `--refresh` fuerza la descarga y `--shelf` y `--limit` sirven para probar.
3. **Procedencia obligatoria**: cada campo importado y cada arista del grafo guardan su fuente (§2.2). Sin procedencia, no entra.
4. Las fuentes marcadas **⚠️ sin verificar** en §4 no se usan hasta que Igor confirme sus condiciones.
5. Claves solo en `app/.env.local`, solo en scripts de Node.
6. **Se pregunta a Igor** antes de cualquier lote de pago (LLM) y antes de borrar o sustituir obras del catálogo.
7. **Al terminar cada paso, `npm run engine:coverage` debe pasar** (§6). Si no pasa, el paso no está hecho.

---

## 1. Estado real (medido el 16/10/2026)

**El enriquecimiento del plan anterior prácticamente no se ha ejecutado.** Los motores F4 (Descubrir) y F5 (Decidir) están construidos, pero funcionan en **modo degradado**:
- `deck.ts` tiene `taste = 0.5` fijo;
- `decide.ts` no lee ejes ni vectores, solo géneros.

### 1.1 Cobertura de `seed.json`

| Categoría | Obras | Lo que hay | Lo que falta (≈ 0 %) |
|---|---|---|---|
| Pelis | 1000 | título, año, creador, duración, géneros, sinopsis, popularidad, `platforms` (de la semilla) | `tmdbId`, `wikidataId`, `keywords`, `voteAvg/Count`, `providers`, país e idioma, saga |
| Series | 1000 | igual; `seasons` 15 %, `tvmazeId` 14 % | igual que pelis + `ongoing` |
| Libros | 1000 | + `pages`, `depth`; `olid` 13 % | `readers`, `voteAvg/Count`, `subjects`/`keywords`, `wikidataId` |
| Juegos de mesa | **1015** | + `players`, duración | `wikidataId`, mecánicas, peso, edad mínima |
| Artistas | **261** | género, sinopsis, popularidad; `mbid` 1 % | `mbid`, `wikidataId`, etiquetas, similares |

Otros datos del estado:
- `scripts/cache/sources/` tiene **16 archivos**.
- `unmatched.json` está vacío, porque casi nada llegó a procesarse.
- **No existen** `llm.mjs`, `vectors.mjs`, `features.ts` ni `src/data/engine/`.
- El catálogo ha crecido respecto a MOTOR §1: ahora hay 1015 juegos y 261 artistas.
- **`TMDB_API_KEY` está vacía** en `.env.local` y **no hay `ANTHROPIC_API_KEY`** (§9).

### 1.2 Origen del catálogo e imágenes ⚠️

| Categoría | Origen de las obras | Portadas (`posterUrl`) | Problema |
|---|---|---|---|
| Pelis | CSV `imdb_top_1000` de un GitHub de terceros | `m.media-amazon.com` (IMDb), enlazadas directamente | sin licencia |
| Series | TVMaze | `static.tvmaze.com` | **revisar** las condiciones de TVMaze; no asumir que valen |
| Libros | Open Library | `covers.openlibrary.org` | ✅ abierta |
| Juegos | `recommend.games` (datos derivados de BGG) | `cf.geekdo-images.com` (BGG) | BGG es solo no comercial: tratar igual que BGG |
| Artistas | búsqueda de la API de Deezer | `cdn-images.dzcdn.net` | condiciones de Deezer poco claras: no asumir que valen |

Todo esto se corrige en E1 (re-anclaje) y E3 (imágenes).

### 1.3 Supabase (aviso, no bloquea)
El backend está en el proyecto `pvewnpemlwmvaduzhjso`, el mismo de SEDAE y Riftbound, con tablas `biblio_*`. **No migres nada**; Igor decide si lo separa.

---

## 2. Principios

### 2.1 Qué datos buscar
Un campo entra solo si cumple al menos una de estas condiciones:
- lo lee **un motor**;
- lo enseña **la ficha**;
- da **contexto al LLM** para describir la obra (ejes, temas y vecinos).

La tabla de §3 es la lista cerrada. Para añadir un campo, añádelo antes a esa tabla con su consumidor.

### 2.2 Procedencia
- **Campos**: `Item.src?: Record<campo, fuente>`, por ejemplo `{ voteAvg: 'tmdb', keywords: 'tmdb', wikiLangs: 'wikidata' }`.
- **Aristas del grafo**: `{ a, b, src, kind, w }` (§5, E4).
- **Fuentes** (texto fijo): `tmdb`, `wikidata`, `wikipedia`, `openlibrary`, `musicbrainz`, `listenbrainz`, `podcastindex`, `llm`, `seed`, `users`.

### 2.3 Beta con amigos o producto comercial
Algunas fuentes son **gratis solo para uso no comercial** (TMDB sin licencia, Last.fm…). La beta con amigos no es comercial, así que **es probable** que se puedan usar ahora, siempre que:
- tengan la procedencia marcada;
- exista un paso `scripts/engine/purge-source.mjs <fuente>` que borre sus campos y aristas y recalcule.

**Decidido** (16/10/2026, Igor lo deja en manos de Claude):
- en la beta se pueden usar fuentes **de uso no comercial**, siempre que sus condiciones lo permitan expresamente, la procedencia esté marcada y exista el paso de purga;
- antes de cualquier uso comercial: licencia (TMDB) o `purge-source.mjs`;
- las fuentes **⚠️ sin verificar** de §4 siguen sin usarse hasta leer sus condiciones;
- BGG, MovieLens e IMDb siguen fuera: sus condiciones no encajan ni con la beta.

---

## 3. Campo → fuente → quién lo usa

| Campo | Categorías | Fuente | Lo usa |
|---|---|---|---|
| `tmdbId`, `wikidataId`, `olid`, `mbid`, `bggId`* | todas | E1 | identidad, enlazar fuentes y grafo |
| `voteAvg`, `voteCount` | pelis, series, libros | TMDB · Open Library (ratings) | `votes` y `explore` en el mazo (MOTOR §7.3); `quality` en Decidir (§8.3) |
| `readers` | libros | Open Library | `votes` en el mazo de libros |
| `popularity` (recalculada) | todas | TMDB popularity · OL readers · `wikiLangs` · MusicBrainz/ListenBrainz | `pop` en el mazo; clásicos para orientadores (§8.4) |
| `wikiLangs`, `wikiLocal` | todas | Wikidata sitelinks | `region` y popularidad cultural |
| `originCountry`, `originalLanguage` | pelis, series, libros, artistas | TMDB · Wikidata | `region` |
| `releasedIn`, `cert` | pelis, series | TMDB release dates / content ratings | `region`; `familiar` (contexto para el LLM) |
| `providers[país]` | pelis, series | TMDB watch/providers (datos de JustWatch) | `plat` en el mazo; filtro de Decidir |
| `collection` | pelis, series, libros, juegos | TMDB collection · Wikidata P179 | diversidad del mazo (§7.4); aristas `saga` |
| `ongoing`, `seasons`, `episodes` | series | TMDB | filtros de Decidir |
| `keywords` | pelis, series | TMDB keywords | similitud (jaccard); contexto para el LLM; vectores |
| `subjects` | libros | Open Library subjects · Wikidata P921 | ídem |
| `mechanics`, `minAge`, `weight`* | juegos | Wikidata (si lo tiene) · LLM | ídem; filtros de Decidir |
| `tags` | artistas | MusicBrainz tags/genres | ídem |
| `awards` | todas | Wikidata P166 | contexto para el LLM; calidad de respaldo |
| `basedOn`, `inspiredBy`, `influencedBy` | todas | Wikidata P144 / P941 / P737 | **aristas entre categorías** (E4) |
| `cast` (top 5), `crew` (dirección, guion, música) | pelis, series | TMDB credits | aristas `creator`; contexto para el LLM |
| `synopsisEs` (mejorada) | todas | TMDB overview es · Wikipedia es · OL description | ficha; contexto para el LLM; vectores |
| `context` (no se publica) | todas | Wikipedia (resumen es/en) | **solo contexto para el LLM** y vectores. Es CC BY-SA: no se enseña en la app |
| `posterUrl` | todas | E3 | ficha y tarjetas |
| `axes`, `themes`, `moments`, `oneLiner`, `conf` | todas | LLM (E6) | ejes de Decidir, `mood`, `taste`, motivos |
| vecinos y clústeres | todas | E7-E9 | `taste`, `novelty`, orientadores, pareja de duelos, diversidad |

\* `bggId` solo como **clave de cruce** con Wikidata (P2339). No se llama a la API de BGG.

---

## 4. Fuentes y su estado de licencia

| Fuente | Para qué | Estado |
|---|---|---|
| **TMDB API** | pelis y series: todo lo de §3 | ✅ verificado: gratis para uso **no comercial** con atribución (logo + «This product uses the TMDB API but is not endorsed or certified by TMDB.» en Acerca de/Créditos). **Comercial = licencia** con su equipo de ventas. La cita de JustWatch en `providers`: ⚠️ sin verificar; ponerla igualmente junto al dato |
| **Wikidata** | ids cruzados, relaciones, premios, país, sitelinks | ✅ CC0 |
| **Wikipedia** (REST `page/summary`) | contexto para el LLM | ✅ CC BY-SA: se puede usar como entrada; **no se republica** |
| **Open Library** | libros: ids, temas, ratings, readers, portadas | ✅ datos abiertos |
| **MusicBrainz** | artistas: mbid, tags, relaciones | ✅ datos principales CC0 (1 petición/s, User-Agent propio) |
| **ListenBrainz Labs** (`similar-artists`, `similar-recordings`, `tag-similarity`) | aristas entre artistas a partir de escuchas reales | ⚠️ los endpoints existen, pero **la licencia no está confirmada**. *Corrijo lo que dije en el chat: afirmé que era CC0 y «la mejor de todas» sin haberlo comprobado.* No usar hasta confirmarlo |
| **Last.fm** | artistas similares | ❌ no comercial sin acuerdo |
| **TasteDive** | similares entre categorías | ⚠️ es una API antigua que migra a Qloo; condiciones no encontradas. No usar sin confirmación |
| **Trakt** | `related` de pelis y series | ⚠️ condiciones no encontradas. No usar sin confirmación |
| **Podcast Index** | podcasts (futuro) | ⚠️ sin verificar (la web devolvió 403) |
| **TVMaze** | series (origen actual) | ⚠️ revisar sus condiciones antes de seguir usando sus imágenes |
| BGG, `recommend.games`, MovieLens, IMDb datasets, Goodreads | — | ❌ no comercial o API cerrada. No se usan |

---

## 5. Pasos

### E0 — Requisitos previos (lo hace Igor)
- `TMDB_API_KEY` en `app/.env.local`.
- Clave del LLM: `ANTHROPIC_API_KEY`, o la de Gemini si Igor prefiere usar Gemini para el enriquecimiento. El esquema, el prompt y la validación son los mismos; solo cambia el cliente.
- (La decisión de §2.3 ya está tomada.)

### E1 — Identidad: emparejar cada obra con sus ids (`sources.mjs`)
| Categoría | Cómo |
|---|---|
| Pelis y series | TMDB `search` (título original y español, año ±1) → `external_ids` (IMDb, Wikidata). Si no aparece, Wikidata por IMDb id (P345) |
| Libros | Open Library `search.json` (título + autor) → `olid` de la obra → Wikidata por P648 |
| Juegos | Wikidata por nombre + año + diseñador; P2339 (BGG ID) como cruce si existe |
| Artistas | MusicBrainz `search/artist` (nombre + país + inicio) → `mbid` → Wikidata por P434 |

> Comprueba los números de propiedad de Wikidata antes de usarlos; los de esta tabla y los de E4 están escritos de memoria.

- **Puntuación de emparejamiento** (0-1): título normalizado (sin tildes, artículos ni signos), año, creador (parecido aproximado) y tipo.
  - ≥ 0.85: se acepta;
  - 0.6-0.85: va a `ambiguous.json` con las 3 mejores opciones;
  - < 0.6: va a `unmatched.json`.
- **Re-anclaje** (MOTOR §4.4): pelis, juegos y artistas toman de la fuente con licencia sus datos y la imagen. Se **conservan los ids** de la app.
- Las obras que no se emparejan **no se borran**. Quedan marcadas `anchored: false` y se listan para Igor.

### E2 — Metadatos
Se descarga **solo lo de §3**, en las mínimas llamadas:
- **TMDB pelis**: `/movie/{id}?append_to_response=keywords,credits,recommendations,similar,release_dates,watch/providers,external_ids&language=es-ES`, más una llamada `en-US` solo si la sinopsis en español está vacía.
- **TMDB series**: lo mismo con `/tv/{id}` y `content_ratings`.
- **Open Library**: work + editions (páginas, ISBN) + ratings + bookshelves (readers).
- **Wikidata**: **SPARQL por lotes de 200 QIDs** con todas las propiedades de §3 de una vez (sitelinks, P144, P179, P155/P156, P941, P737, P166, P136, P921, P840, P2408, P495, P364, P50/P57/P175/P178, P135).
- **MusicBrainz**: artist con `inc=tags+genres+url-rels`.
- **Wikipedia**: `page/summary` en es (y en si no hay en es) a partir de los sitelinks de Wikidata.
- **Popularidad recalculada** por categoría (percentil 0-100 dentro de la categoría):
  - pelis y series: TMDB popularity (raíz) + voteCount (log);
  - libros: readers (log) + wikiLangs;
  - juegos: wikiLangs + nº de premios + la popularidad de la semilla (con peso decreciente hasta que haya datos de usuarios);
  - artistas: wikiLangs + nº de tags + la popularidad de la semilla.

### E3 — Imágenes
| Categoría | Fuente nueva | Si no hay |
|---|---|---|
| Pelis y series | TMDB `poster_path` (`w500`) | portada generada (DISENO §13.4) |
| Libros | Open Library covers (ya está) | portada generada |
| Juegos y artistas | Wikidata P18 → Wikimedia Commons, **solo con licencia libre** (CC0 / CC BY / CC BY-SA), guardando autor y licencia para los créditos | portada generada |

Las imágenes de IMDb, BGG y Deezer se **dejan de usar**. Las de TVMaze siguen solo si sus condiciones lo permiten. Se guarda `imageSrc` y `imageCredit`.

### E4 — Grafo importado: aristas con procedencia (`graph-import.mjs`) — **capa nueva**
Antes de que el LLM y los vectores fabriquen el parecido, se importa el que **ya existe** en otras fuentes. Solo entran aristas con **los dos extremos en el catálogo**; las que apuntan fuera van a `scripts/cache/graph/outside.json`, que es una lista de obras candidatas para ampliar el catálogo.

| `kind` | Fuente | w | Categorías |
|---|---|---|---|
| `rec` | TMDB recommendations | 0.8 | pelis↔pelis, series↔series |
| `similar` | TMDB similar (más por keywords) | 0.5 | ídem |
| `saga` | Wikidata P179 / P155 / P156 · TMDB collection | 1.0 | todas (*marcada aparte*: la diversidad del mazo y Decidir la tratan como «obvia») |
| `adapt` | Wikidata P144 «basada en» | 0.9 | **entre categorías**: libro↔peli↔serie↔juego |
| `influence` | Wikidata P941 / P737 | 0.6 | todas, también entre categorías |
| `creator` | mismo director, autor, diseñador o showrunner | 0.4 | dentro de cada categoría y entre ellas (autor de libro = guionista de peli) |
| `artist_sim` | ListenBrainz `similar-artists` ⚠️ | 0.9 | artistas (solo si se confirma la licencia) |

Formato en `scripts/cache/graph/edges.jsonl`: `{"a":"movie:…","b":"book:…","kind":"adapt","src":"wikidata","w":0.9}`.

### E5 — Contexto para el LLM
Por obra, un bloque de texto compacto (≤ 2.500 caracteres) con:
- título y título original, año, creador;
- géneros, keywords y subjects (≤ 25);
- sinopsis en español, resumen de Wikipedia (≤ 800 caracteres);
- premios (≤ 5), «basada en»;
- duración, temporadas o páginas, jugadores;
- calificación por edad;
- 5 títulos relacionados del catálogo (de E4).

Se guarda en `scripts/cache/context/<shelf>/<slug>.txt` con su hash. Es la entrada de E6 y de E7.

### E6 — Ejes, temas y momentos con LLM (MOTOR §5)
> Se puede hacer **por API** (Batches) o **en modo agente**, sin API: ver §5b. El esquema, el vocabulario, la validación y la QA son los mismos en los dos.

Se ejecuta como dice MOTOR §5 (esquema, vocabulario cerrado, validación, coherencia), con estos ajustes:
- **Muestra por categoría**: `--sample 20` de cada una de las 5 categorías (100 obras). Igor revisa la tabla de `scripts/cache/llm/sample.md` antes del lote.
- El vocabulario de juegos y artistas también lo revisa Igor; hoy está solo como borrador en `vocab.mjs`.
- `conf: 'baja'` en más del 15 % de una categoría = el contexto (E5) es pobre ahí. Se revisa E2 antes de seguir.

### E7 — Vectores (MOTOR §6.1)
Embedding local de `contexto + ejes + temas + momentos + oneLiner`. Las categorías se vectorizan **en el mismo espacio** (mismo modelo), para poder buscar candidatas de otras categorías en E8.

### E8 — Elegir vecinos con el LLM (`neighbors-llm.mjs`) — **capa nueva**
Para cada obra:
1. **Candidatas**: las 40 más cercanas de su categoría según la similitud provisional (vectores + ejes + aristas de E4), más las 15 más cercanas de **otras categorías**.
2. **El LLM elige**, solo de entre esas candidatas, **las 10 que de verdad se parecen** (en experiencia y sensación, no solo en género) y **hasta 3 de otras categorías**. Para cada una, un motivo de ≤ 80 caracteres en español («mismo humor absurdo y melancólico»).
3. **Validación**:
   - ids solo de la lista de candidatas (es un enum en el esquema);
   - sin repetidos;
   - las de `saga` no cuentan entre las 10 (ya están en E4).
4. Las elegidas se guardan como aristas `kind: 'pick'`, `src: 'llm'`, con `w` según el orden (1.º = 1.0 … 10.º = 0.55) y el motivo.

El motivo se usa en la propuesta de Decidir («Porque te gustó *X*: mismo humor absurdo…»).

### §5b — Modo agente: E6 y E8 sin API de LLM
Lo propone Gemini: el propio agente escribe los ejes y los vecinos en lugar de pagar llamadas a una API. Es válido, con estas condiciones:
1. **Nunca de memoria.**
   - El agente trabaja sobre los archivos de contexto de E5 (`scripts/cache/context/…`), no sobre lo que recuerda: en libros poco conocidos y en buena parte de los 1015 juegos se inventaría los datos.
   - Por eso E1-E5 (las APIs gratuitas: TMDB, Wikidata, Open Library…) **siguen siendo necesarios**.
   - Sin contexto suficiente, `conf: 'baja'`.
2. **Mismo formato y mismo validador.**
   - `llm.mjs --mode agent --shelf X --block N` exporta un bloque de unas 40 obras (contexto + esquema + vocabulario + los 3 ejemplos fijos de calibración) a `scripts/cache/llm/agent-in/`.
   - El agente escribe la respuesta en `scripts/cache/llm/agent-out/` y `llm.mjs --mode import` la valida con las mismas reglas de MOTOR §5.5.
   - Lo que no valida, se rehace.
   - `src: 'llm-agent'`.
3. **Contra la deriva.**
   - Una categoría entera por sesión; los ejemplos de calibración al principio de **cada** bloque.
   - Al terminar cada categoría:
     - se miran las distribuciones de los ejes (MOTOR §5.5);
     - se pasa la QA de parejas (MOTOR §5.7);
     - se re-puntúan 20 obras al azar en un bloque nuevo: si más del 25 % de los ejes difiere en 2 puntos o más, hay deriva y esa categoría se rehace.
4. **E8 igual**: `neighbors-llm.mjs --mode agent` exporta, por obra, sus candidatas (E8.1) y el agente elige **solo de esa lista**. El validador rechaza cualquier id que no esté en ella.
5. **Plan B**: si la QA no pasa en una categoría, esa categoría va por API (Batches, unos pocos dólares).
6. **Obras nuevas en el futuro**: el mismo modo agente, o la API cuando haya backend y enriquecimiento automático (E12).

Lo que **no** cambia con el modo agente: los vectores ya eran locales y gratuitos (E7), y las fuentes de E1-E2 son APIs gratuitas que hay que llamar igualmente.

### E9 — Fusión → `src/data/engine/<shelf>.json` y `cross.json`
**Similitud combinada** (sustituye a la fórmula de MOTOR §6.2):

```
sim(a,b) = 0.35·cos(emb)          // vectores
         + 0.20·axesSim           // ejes normalizados
         + 0.10·jaccard(temas ∪ keywords)
         + 0.20·graph(a,b)        // 1 − Π(1 − w_i) sobre las aristas importadas de E4 (sin 'saga')
         + 0.15·pick(a,b)         // w de la arista 'pick' del LLM, máx. de los dos sentidos
```
- Pesos en `SIM_W`, ajustados con la QA de MOTOR §5.7.
- `nn` (20 vecinos) se calcula con esta `sim`.
- **`cross.json`**: por obra, como mucho 5 vecinos de otras categorías (aristas `adapt`, `influence` y `pick` entre categorías). Prepara los orientadores entre categorías (D24) y la ficha («Si te gustó este libro: la peli…»).
- El tamaño por estantería sigue el límite de MOTOR §6.3 (unos 200-400 KB).

### E10 — Conectarlo a la app (**sin esto, todo lo anterior no se nota**)
- `src/lib/engine/features.ts` (MOTOR §6.4): carga perezosa de `engine/<shelf>.json` y `cross.json`, y degradado si falta.
- `deck.ts`:
  - `taste` = similitud con el centroide de tu top 20 % (se acaba el `0.5` fijo);
  - `novelty` con vectores;
  - diversidad por `macro` y `collection`.
- `decide.ts`:
  - orientadores y parejas `coarse`/`fine` con `macro`/`micro` y `sim` (MOTOR §8.4-§8.6);
  - mood por `MOOD_AXES`;
  - motivo con el texto de la arista `pick`.
- `ENGINE_VERSION` sube (`m1.1`), para que `/metricas` compare antes y después.
- **Criterio de aceptación**:
  - `eval-deck.mjs` y `eval-decide.mjs` (MOTOR §7.10, §8.11) mejoran respecto al degradado (recall@50 y hit@5);
  - en el móvil, 10 sesiones de Decidir guardadas en `decide-samples.md` muestran duelos `fine` «del mismo tipo».

### E11 — Cobertura y QA
`scripts/engine/coverage.mjs` (`npm run engine:coverage`):
- imprime la tabla de §1.1 actualizada;
- **sale con error** si algún umbral de §6 no se cumple;
- guarda el histórico en `scripts/cache/coverage.md`.

QA del mapa:
- las parejas fijas de MOTOR §5.7 (más 10 parejas entre categorías: *El Señor de los Anillos* libro ↔ peli, etc.);
- `neighbors.md` con los 10 vecinos de 30 obras conocidas por categoría, para revisarlos a ojo.

### E12 — Mantenimiento
| Qué | Cada cuánto | Script |
|---|---|---|
| `providers` (dónde verla) | semanal | `sources.mjs --only providers` |
| popularidad, votos, `ongoing` | mensual | `sources.mjs --only stats` |
| obras nuevas | al añadirlas al catálogo | E1→E9 solo para esas, por hash |
| `conf: 'baja'` | tras mejorar el contexto | E6 solo para esas |
| ampliar catálogo | cuando Igor quiera | candidatas de `outside.json` ordenadas por nº de aristas entrantes |

Con backend, esto pasa a un trabajo programado (MOTOR §11).

---

## 6. Umbrales de cobertura (los comprueba `coverage.mjs`)

| Categoría | Mínimos |
|---|---|
| Pelis y series | `tmdbId` ≥ 95 %, `wikidataId` ≥ 85 %, `keywords` ≥ 90 %, `voteCount` ≥ 95 %, `providers` consultado ≥ 95 % (puede estar vacío), sinopsis en español ≥ 95 %, imagen con licencia ≥ 95 % |
| Libros | `olid` ≥ 90 %, `wikidataId` ≥ 60 %, `subjects` ≥ 80 %, `readers` ≥ 80 %, descripción ≥ 85 % |
| Juegos | `wikidataId` ≥ 50 %, contexto (E5) con ≥ 400 caracteres ≥ 80 % (si falta, el LLM no tiene con qué) |
| Artistas | `mbid` ≥ 95 %, `wikidataId` ≥ 85 %, `tags` ≥ 80 % |
| Todas (E6-E9) | LLM válido = 100 %, `conf: 'baja'` ≤ 15 %, vector = 100 %, ≥ 8 vecinos (`nn`) = 100 %, ≥ 1 arista `pick` = 95 % |

Los umbrales de juegos son bajos a propósito: Wikidata cubre peor los juegos de mesa. Si no se llega, el LLM usa el contexto disponible y su `conf` lo refleja.

---

## 7. Cómo mejora el grafo con el uso

**Lo social y lo estadístico son cosas distintas:**
- **Lo social** («Ana la vio y la tiene de nº 2») es una señal **directa** y vale desde el primer amigo. Va **por encima** del grafo, en los motores: afinidad, puesto, fecha y comentario. No depende de la escala, y la app está pensada para pocos amigos bien elegidos.
- **El grafo** dice qué se **parece** a qué. Al principio sale de fuentes externas y del LLM (este plan). Con el uso se le añaden aristas `src: 'users'`.

**Señales de usuario** que alimentan el grafo:
- **rankings**: dos obras en el top 30 % de la misma persona;
- **duelos de Decidir**: ganadoras de la misma sesión;
- **swipes**: guardar o ver seguidas en la misma sesión pesa poco;
- **propuesta aceptada → vista → puesto**: es la señal de verdad para evaluar.

**Las listas compartidas no son señal** de momento: son una función voluntaria y no hay volumen.

**Mezcla según el soporte**: el peso de las aristas `users` en `sim()` crece con el nº de personas que las respaldan, de 0 con menos de 5 a su peso completo con 50 o más. Una obra nicho sigue apoyándose en el contenido, y una muy usada, en el comportamiento.

**Corrección del mapa**: si quien elige un mood rechaza sistemáticamente una obra, sus ejes se marcan para revisar y se repite E6 solo para ella.

---

## 8. Podcasts (categoría futura; no construir)
- Unidad: el **programa**, como dice D12. El episodio suelto está aparcado.
- Fuentes **⚠️ por confirmar**:
  - Podcast Index (catálogo, categorías, feeds);
  - Wikidata (los programas grandes);
  - la descripción del feed RSS (de la que el LLM saca los ejes).
- Aristas: `creator` (mismo presentador o productora), `influence` (Wikidata) y `pick` del LLM. Entre categorías conecta bien con libros y documentales.
- Ejes propuestos (borrador):

  | id | 1 | 5 |
  |---|---|---|
  | `formato` | conversación | narrativo |
  | `seriedad` | humor | serio |
  | `densidad` | ligero | denso |
  | `duracion` | — | — |
  | `actualidad` | atemporal | de actualidad |
  | `produccion` | casero | muy producido |

---

## 9. Lo que espera a Igor
1. **`TMDB_API_KEY`** en `app/.env.local`.
2. **Clave del LLM** (`ANTHROPIC_API_KEY` o la de Gemini) **solo si se usa la API**; en modo agente (§5b) no hace falta.
3. ~~Decisión §2.3~~ → tomada: sí, con procedencia y purga.
4. **Revisar**:
   - `unmatched.json` y `ambiguous.json` (E1);
   - el vocabulario de juegos y artistas (E6);
   - la muestra de 100 obras (E6);
   - los vecinos (E11).
5. **Coste**, antes de lanzar el lote:
   - ~4.300 obras × (E6 + E8) ≈ 2 llamadas por obra, de ~3.000 tokens de entrada y ~600 de salida;
   - con Haiku 5.5 en Batches (0,10 $ / 0,50 $ por millón, la mitad en lote) sale por **unos 3-6 $ en total**, contando reintentos;
   - el script lo recalcula con la muestra antes de lanzar.
6. **Supabase**: el backend comparte proyecto con SEDAE y Riftbound (§1.3). Igor decide si lo separa.

## 10. Orden
E0 → E1 → E2 → E3 → E4 → E5 → (muestra) E6 → E7 → E8 → E9 → **E10** → E11. Después, E12 periódico.
- E3 (imágenes) se puede hacer en paralelo a E4-E5.
- Cada paso termina con `engine:coverage` en verde para lo que le toca, y con un commit.
