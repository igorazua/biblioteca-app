# Diseño técnico del motor — Biblioteca

> **Para quién:** el agente que lo construya. Las decisiones de producto están en `docs/IDEA.md` §7b (fuente de verdad). Aquí está el **cómo**.
> **Estado:** v1.1 (16/10/2026). Construidos F-Backend, F0, F1 (scripts), F4, F5 y F6. **F1 no se ha ejecutado de verdad y F2-F3 no existen**: los motores funcionan en modo degradado. El enriquecimiento se ejecuta con `docs/ENRIQUECIMIENTO.md`, que además añade el **grafo importado** (E4) y la **elección de vecinos con LLM** (E8) y sustituye la fórmula de §6.2.
> **Alcance:** la demo sigue siendo una PWA sin backend (`app/`). Todo el motor corre **en el navegador** con datos precalculados por scripts offline. §11 dice qué cambia cuando haya Supabase.

---

## 0. Reglas para el agente

1. **Lee primero** `PROJECT_CONTEXT.md`, `docs/IDEA.md` (§3, §6, §7b) y este documento entero.
2. **Ve fase a fase** (§12) y en el orden marcado. Cada fase termina con sus tests en verde (`npm test`) y `npm run build` sin errores. Haz un commit por fase.
3. **Motores = funciones puras** en `app/src/lib/engine/`, sin React ni zustand dentro, con tests en vitest. Las pantallas solo los llaman.
4. **Todos los números ajustables** (pesos, proporciones, umbrales) viven en `app/src/lib/engine/params.ts`, junto a `ENGINE_VERSION`. No dejes números mágicos en el código.
5. **No cambies el formato de los ids** (`movie:el-hoyo-2019`): los links compartidos y el `localStorage` dependen de ellos.
6. **Claves** (`TMDB_API_KEY`, `ANTHROPIC_API_KEY`) solo en `app/.env.local` y solo en los scripts de Node; nunca en el navegador ni en el repositorio.
7. **Pide confirmación a Igor** antes de:
   - lanzar el lote completo del LLM (cuesta dinero: §5.6);
   - añadir dependencias pesadas;
   - desplegar.
8. **Catálogo legal**: solo fuentes abiertas o con licencia (TMDB, Wikidata, Open Library, MusicBrainz/ListenBrainz). Ver §4.4 sobre las fuentes actuales de la semilla. Comprueba en los términos de TMDB:
   - si el uso comercial necesita un acuerdo aparte;
   - cómo hay que citar a JustWatch en los datos de dónde verla.

   Apúntalo en `docs/COMPETENCIA.md` o en `PROJECT_CONTEXT.md` y no supongas nada.
9. **El percentil nunca se enseña** (D25): la interfaz solo muestra puestos.

---

## 1. Punto de partida (lo que hay hoy)

| Pieza | Dónde | Qué hace | Problema |
|---|---|---|---|
| Mazo de Descubrir | `src/lib/deck.ts` (`buildDeck`, `deckScore`) | popularidad + 15·nº de amigos + época + plataforma + ruido | Una sola suma. Sin fechas, sin puesto de amigo, sin comentario, sin región, sin aprender del swipe |
| Decidir | `src/lib/recommend.ts` (`nextShaperPair`, `applyShaper`, `scoreCandidates`) | duelos por contraste de géneros; candidatas por peso de género | Solo conoce géneros: los duelos salen extremos y sin matiz |
| Preguntas | `src/data/questions.ts` | preguntas por categoría + mapas mood→géneros | Se mantienen; el mood pasará a apuntar a ejes (§7.2) |
| Ranking | `src/lib/rank.ts`, `src/lib/ranking.ts` | puestos y percentiles; rankings de amigos derivados de su nota | OK, se reutiliza |
| Afinidad | `src/lib/affinity.ts` | 100 − media de \|Δ percentil\| | OK, se reutiliza |
| Catálogo | `src/data/seed.json` (~1,7 MB: 1000 pelis, 1000 series, 1000 libros, 100 juegos, 44 artistas, 6 amigos) | `Item` con géneros, sinopsis y popularidad | **Ningún item tiene `tmdbId`**. Sin keywords, votos ni plataformas por país |
| Generación | `scripts/mass-import.mjs`, `scripts/add-boardgames-and-artists.mjs`, `scripts/build-seed.mjs` | importación masiva | Ver §4.4 (fuentes) |
| Estado | `src/store/useStore.ts` (zustand, persistido en `biblioteca-v1`) | entradas, rankings, perfil | No se guarda ningún evento |
| Amigos | `FriendEntry` en `types.ts` | `status`, `score`, `comment` | **Sin fecha** |

---

## 2. Arquitectura

```
 OFFLINE (Node, scripts/engine/)                          NAVEGADOR (app/src)
 ─────────────────────────────────                        ─────────────────────────────────────
 F1 sources  → scripts/cache/sources/*.json  ┐
 F2 llm      → scripts/cache/llm/*.json      ├─ build ─→  src/data/seed.json        (items, ligero)
 F3 vectors  → scripts/cache/vec/*.json      ┘           src/data/engine/<shelf>.json (ejes, vector, vecinos, clústeres)
                                                              │  carga perezosa por estantería
                                                              ▼
                                                     lib/engine/  (puro, testeado)
                                                       features.ts   lectura de ejes/vectores, similitud
                                                       signals.ts    señales sociales y de usuario
                                                       deck.ts       mazo por cupos            (F4)
                                                       decide.ts     duelos + propuesta         (F5)
                                                       cleanup.ts    orden de la limpieza       (F6)
                                                       metrics.ts    cálculo de KPIs            (F0)
                                                       params.ts     ENGINE_VERSION + pesos
                                                              │
                                                     store: useStore (+ events en clave aparte)
                                                              │
                                                     screens: Discover, WhatToWatch (Decidir), Shelf, Profile
```

- **Cachés offline** en `app/scripts/cache/`: crudo de cada fuente, respuestas del LLM y vectores. Cada entrada lleva un `inputHash` y solo se recalcula lo que cambió. **Se versionan en git**, salvo que pesen más de unos 20 MB; en ese caso, a `.gitignore` y se explica cómo regenerarlas.
- **Artefactos del navegador**:
  - `seed.json` sigue con los datos de la ficha.
  - Lo del motor va en `src/data/engine/<shelf>.json`, cargado con `import()` dinámico al entrar en una estantería, para no inflar la carga inicial.
- Un único comando regenera todo: `npm run engine` (= sources → llm → vectors → build). Cada paso también se puede lanzar suelto: `npm run engine:sources`, etc.

---

## 3. Fase 0 — Eventos y métricas (va primero)

Sin datos no se puede saber si un cambio del motor mejora o empeora. Esta fase no cambia nada visible.

### 3.1 Registro de eventos
- Store nuevo `src/store/useEvents.ts` (zustand persistido en la clave **`biblioteca-events-v1`**, aparte del estado principal). Se queda con los **últimos 5.000** eventos (FIFO).
- Forma:

```ts
interface EngineEvent {
  t: number                 // Date.now()
  v: string                 // ENGINE_VERSION
  sid: string               // id de sesión de pantalla (una visita a Descubrir/Decidir/Limpieza)
  type: EventType
  shelf: ShelfType
  itemId?: string
  data?: Record<string, unknown>
}
type EventType =
  // Descubrir
  | 'deck_shown'      // data: { pos, bucket: Bucket, score }
  | 'deck_swipe'      // data: { pos, bucket, dir: 'left'|'right'|'up', ms }  (ms = tiempo mirando la tarjeta)
  | 'deck_open'       // abre la ficha desde la tarjeta
  | 'deck_session_end'// data: { cards, swipes }
  // Decidir
  | 'dec_start'       // data: { answers }
  | 'dec_duel'        // data: { a, b, winner, step, phase: 'coarse'|'fine', infoGain }
  | 'dec_propose'     // itemId = propuesta; data: { round, score, reasons, candidates }
  | 'dec_accept'      // itemId
  | 'dec_reject'      // «Seguir buscando»; itemId
  | 'dec_abandon'     // sale sin aceptar; data: { step }
  // Limpieza
  | 'clean_start' | 'clean_swipe' /* data: { dir } */ | 'clean_end'
  // Resultado a posteriori (lo emite el store al cambiar el estado de una entrada)
  | 'entry_status'    // data: { from, to, via: 'deck'|'decide'|'clean'|'add'|'other' }
  | 'entry_ranked'    // data: { pos, total, pct }  tras Comparar o colocación
```

- Ayudante `track(type, payload)` que pone solo `t`, `v` y `sid`. Lo llaman las pantallas, **nunca los motores** (que siguen siendo puros).
- Para medir «la propuesta acabó vista y en qué puesto», `entry_status` y `entry_ranked` se emiten desde las acciones del store (`swipe`, `setStatus`, `applyRanking`…).

### 3.2 KPIs (`lib/engine/metrics.ts`, funciones puras sobre `EngineEvent[]`)

| Motor | KPI | Definición |
|---|---|---|
| Descubrir | Acierto de catálogo | % de `right` en las 20 primeras tarjetas de cada sesión |
| | Descubrimiento | % de `up` sobre el total de swipes |
| | Rechazo | % de `left` |
| | Respuesta por cupo | % right / up / left por `bucket` |
| | Ritmo y abandono | tarjetas por sesión; ms medio por tarjeta |
| Decidir | Aceptación a la primera | % de sesiones con `dec_accept` en la ronda 1 |
| | Esfuerzo | media de `dec_reject` y de duelos hasta aceptar |
| | Abandono | % de sesiones con `dec_abandon` |
| | **Acierto real** | de las aceptadas: % que pasan a `seen` en 14 días y percentil medio con el que acaban en el ranking (la métrica estrella) |
| | Información de los duelos | `infoGain` medio por paso (comprueba que el selector de parejas funciona) |
| Limpieza | Reparto | % right / up / left; pendientes rescatadas (up) que acaban vistas |
| Mapa | Coherencia | ver §5.7 y §6.5 (offline) |

### 3.3 Pantalla de métricas
- Oculta: **Perfil → mantener pulsado el número de versión** → `/metricas`. Enseña los KPIs por `ENGINE_VERSION` y por estantería, más los botones «Exportar eventos (JSON)» y «Borrar eventos».
- La exportación sirve para que Igor mande sus datos de prueba y se analicen fuera.

### 3.4 Versión y experimentos
- `ENGINE_VERSION = 'm1.0'` en `params.ts`. Cualquier cambio de pesos o de algoritmo la sube.
- `params.ts` exporta `PARAMS` y una función `variant(name)` que hoy devuelve el valor por defecto. Ya queda preparada para A/B entre versiones cuando haya backend (§11).

**Hecho cuando:** los eventos se registran en las tres pantallas, `/metricas` enseña los KPIs con datos de una sesión de prueba y hay tests de `metrics.ts` con eventos de ejemplo.

---

## 4. Fase 1 — Datos base del catálogo

### 4.1 `Item` ampliado (`types.ts`)
Campos nuevos, todos opcionales para no romper nada:

```ts
interface Item {
  // …lo que ya hay…
  tmdbId?: number; olid?: string; wikidataId?: string; mbid?: string
  keywords?: string[]          // TMDB keywords (en inglés, normalizadas a minúsculas) o subjects de Open Library
  voteAvg?: number             // 0-10 (TMDB) / 0-5 → ×2 (Open Library)
  voteCount?: number
  originCountry?: string[]     // ISO-3166 ('ES', 'US')
  originalLanguage?: string    // ISO-639-1 ('es', 'eu', 'en')
  collection?: string          // saga/franquicia (TMDB belongs_to_collection o Wikidata «part of the series»)
  providers?: Record<string, string[]>  // por país: { ES: ['Netflix', 'Filmin'] } normalizado a config.PLATFORMS
  releasedIn?: string[]        // países con estreno comercial conocido
  cert?: Record<string, string>// calificación por edad por país
  wikiLangs?: number           // nº de Wikipedias con artículo (sitelinks)
  wikiLocal?: string[]         // de ['es','eu','ca','gl'] las que tienen artículo
  readers?: number             // Open Library: want_to_read + currently_reading + already_read
  related?: string[]           // ids NUESTROS de TMDB recommendations/similar que existan en el catálogo
  ongoing?: boolean            // series: en emisión (sustituye a la lista ONGOING de recommend.ts)
}
```

`platforms` se mantiene por compatibilidad: será `providers[país del usuario]`, o `providers.ES` en la demo.

### 4.2 Script `scripts/engine/sources.mjs`
- Por cada item, resuelve ids y descarga, guardando el crudo en `scripts/cache/sources/<shelf>/<slug>.json`:
  - **Pelis y series → TMDB**:
    - `search` por título + año para sacar el `tmdbId`;
    - `/{movie|tv}/{id}?append_to_response=keywords,credits,recommendations,similar,release_dates|content_ratings,watch/providers,external_ids`;
    - `external_ids` trae `wikidata_id`.
  - **Libros → Open Library**: `search.json` con `fields=key,subject,ratings_average,ratings_count,want_to_read_count,currently_reading_count,already_read_count,first_publish_year,id_wikidata`.
  - **Wikidata (todas)**: una consulta SPARQL por lotes de 200 QIDs para sacar sitelinks, eswiki/euwiki, premios, «based on», «part of the series», «main subject», país e idioma.
  - **Artistas → MusicBrainz** (1 petición/s, con User-Agent propio) + **ListenBrainz** (artistas similares).
  - **Juegos**: Wikidata. **No usar la API de BGG.**
- Respeta los límites de cada fuente (TMDB ~40 peticiones/10 s; MusicBrainz 1/s). Reintenta con espera creciente y reanuda desde la caché.
- Es **idempotente**: si el crudo existe y no se pasa `--refresh`, no vuelve a llamar.
- Informe final: % de items emparejados por fuente; lista de **no emparejados** en `scripts/cache/sources/unmatched.json` para revisarlos a mano.

### 4.3 Amigos con fecha y perfil con país
- `FriendEntry.at?: number`. En `seed-friends.mjs`, fechas **deterministas** repartidas en los últimos 18 meses, con más densidad en las recientes (un 25 % en los últimos 60 días), para que «visto últimamente» tenga algo que mostrar.
- `UserEntry` ya tiene `updatedAt`; se añade `dismissedAt?: number` (§7.7) y `reviewedAt?: number` (§9).
- `Profile.country?: string` y `Profile.lang?: string`. Valor inicial:
  - `country` = región de `navigator.language` (`es-ES` → `ES`), o si no la trae, la que corresponda a `Intl.DateTimeFormat().resolvedOptions().timeZone`;
  - `lang` = idioma de `navigator.language`.
  - Editable en Perfil. Nada de geolocalización.

### 4.4 Fuentes actuales de la semilla ⚠️
`mass-import.mjs` y `add-boardgames-and-artists.mjs` descargan CSV de repositorios de GitHub de terceros (`imdb_top_1000.csv`, un *gist* con juegos de BGG). **No casa con la regla de catálogo legal.** En esta fase:
- se **conservan los ids y títulos** ya generados, porque hay links y `localStorage` que dependen de ellos;
- se **re-anclan** a TMDB, Open Library o Wikidata;
- todo lo que se use del CSV (nota, votos, géneros) se sustituye por el dato de la fuente con licencia.

Los items que no se puedan re-anclar se marcan y se listan para que Igor decida qué hacer con ellos.

### 4.5 Build
`scripts/engine/build.mjs` fusiona la semilla actual con lo nuevo y escribe `seed.json` (solo los campos de ficha y del `Item`).

**Hecho cuando:**
- al menos el 90 % de las pelis y series tienen `tmdbId`, `keywords` y `voteCount`;
- al menos el 80 % de los libros tienen `olid` y `readers`;
- los amigos tienen `at`;
- el perfil tiene `country`;
- la app sigue funcionando igual.

---

## 5. Fase 2 — Enriquecimiento con LLM (ejes de sensación)

### 5.1 Qué produce
Por cada obra, un JSON validado:

```ts
interface LlmEnrich {
  axes: Record<AxisId, 1 | 2 | 3 | 4 | 5>   // ejes de su categoría (§5.2)
  themes: string[]        // 3-8 del vocabulario controlado de su categoría (§5.3)
  moments: string[]       // 1-4 de la lista de «para cuándo» de su categoría (§5.3)
  oneLiner: string        // ≤ 90 caracteres, en español: qué se siente al verla. Uso interno (motivos, depuración)
  confidence: 'alta' | 'media' | 'baja'     // baja = poca información o no la reconoce
}
```

### 5.2 Ejes por categoría (`scripts/engine/axes.mjs`, que se copia también a `src/lib/engine/axes.ts`)
Cada eje es una escala 1-5 con sus extremos descritos. **El texto de los extremos va tal cual en el prompt.**

**Pelis y series (comunes)**

| id | 1 | 5 |
|---|---|---|
| `tono` | luminoso, optimista | oscuro, desolador |
| `ritmo` | pausado, contemplativo | frenético |
| `emocion` | ligera, no te remueve | te deja tocado |
| `exigencia` | para desconectar | pide atención, compleja |
| `humor` | nada de humor | comedia pura |
| `tension` | relajada | suspense o miedo constante |
| `fantasia` | realista | fantástica o imposible |
| `violencia` | ninguna | explícita y dura |
| `familiar` | solo adultos | para toda la familia |
| `escala` | íntima, pocos personajes | épica, gran escala |
| `reconfort` | incómoda | reconfortante, para repetir |

**Solo series:** `enganche` (1 se deja cuando quieras … 5 adictiva) y `formato` (1 capítulos autoconclusivos … 5 una sola historia continua).

**Libros**

`tono`, `ritmo` (1 pausado … 5 no puedes soltarlo), `emocion`, `densidad` (1 prosa ligera … 5 prosa exigente), `humor`, `tension`, `fantasia`, `escala`, `ideas` (1 pura trama … 5 lleno de ideas para pensar), `reconfort`.

**Juegos de mesa**

| id | 1 | 5 |
|---|---|---|
| `peso` | se explica en 2 min | denso, muchas reglas |
| `interaccion` | cada uno a lo suyo | todo el rato pendiente de los demás |
| `azar` | sin azar | puro azar |
| `confrontacion` | nada | ataque directo |
| `cooperacion` | competitivo | totalmente cooperativo |
| `tema` | abstracto | muy temático o narrativo |
| `risas` | serio, silencioso | risas aseguradas |
| `familiar` | jugones | cualquiera, también niños |

**Artistas**

| id | 1 | 5 |
|---|---|---|
| `energia` | calma | máxima energía |
| `valencia` | melancólico | alegre |
| `bailable` | nada | para bailar |
| `organico` | electrónico o sintético | acústico u orgánico |
| `intensidad` | suave | intenso o agresivo |
| `fondo` | pide escucha atenta | perfecto de fondo |
| `complejidad` | sencillo, pegadizo | complejo |

> Los ejes se pueden cambiar. Si Igor los toca, sube `ENGINE_VERSION` y relanza solo F2 y F3 (la caché de F1 sirve igual).

### 5.3 Vocabularios controlados (`scripts/engine/vocab.mjs`)
- `themes`: 40-80 por categoría («viaje en el tiempo», «familia», «venganza», «mayoría de edad», «guerra», «amistad», «IA», «duelo», «atraco», «pueblo», «distopía»…).
- `moments`: unos 12 por categoría. Pelis y series: `solo`, `pareja`, `amigos`, `familia`, `desconectar`, `pensar`, `llorar`, `reir`, `pasar_miedo`, `domingo_tarde`, `noche_tarde`, `para_repetir`.
- **Cómo se construye:**
  1. El agente genera un borrador: le pasa al LLM 300 títulos variados de cada categoría y le pide los temas recurrentes.
  2. Lo deja en el archivo **para que Igor lo revise**.
  3. Solo después se lanza el lote completo.
- El LLM **solo puede elegir del vocabulario** (enum en el esquema JSON). Así no salen sinónimos.

### 5.4 Prompt (`scripts/engine/llm.mjs`)
- Modelo: **`claude-haiku-5-5`** con el SDK oficial `@anthropic-ai/sdk`, por la **Message Batches API** (`client.messages.batches.create`, asíncrona, **50 % de descuento**; los resultados llegan en cualquier orden, así que se emparejan por `custom_id` = id de la obra). **Salida estructurada** con `output_config.format` y un esquema JSON por categoría (ejes como enteros 1-5, temas y momentos como `enum`). `output_config.effort: "low"`: es una tarea de clasificación (en Haiku 5.5 el razonamiento va siempre activo y por defecto usa `medium`). Comprueba `stop_reason` antes de leer la respuesta: si sale `refusal`, esa obra se reintenta suelta o se marca para revisión.
- Sistema (en español): «Describes obras para un recomendador. Usa SOLO los datos dados y lo que sepas con seguridad de esta obra. Si no la reconoces y los datos no bastan, usa 3 en los ejes dudosos y `confidence: "baja"`».
- Usuario: título, año, creador, géneros, sinopsis, keywords, temas de Open Library, «basada en», premios, duración o temporadas o páginas, calificación por edad y, de los datos de TMDB, 3-5 títulos relacionados que estén en el catálogo, para dar contexto.
- **Calibración**: el prompt incluye **3 ejemplos fijos ya puntuados por categoría**, elegidos para cubrir extremos (pelis: *Toy Story*, *Seven*, *Amélie*). Se sacan de `axes.mjs` y Igor puede retocarlos.
- `inputHash` = sha1(prompt de sistema + versión de ejes + datos de la obra). Si no cambia, no se vuelve a pedir.

### 5.5 Validación
- Se rechaza y se reintenta (máximo 2 veces) si falta un eje, si un valor no es entero 1-5 o si sale algo fuera del vocabulario.
- **Reglas de coherencia** que solo avisan (no rechazan):
  - `familiar ≥ 4` con `violencia ≥ 4`;
  - `humor = 5` con género Terror sin Comedia;
  - libros con `densidad = 1` y más de 800 páginas.
- Informe: % por `confidence`, avisos de coherencia y distribución de cada eje (si un eje tiene más del 60 % de valores en el 3, el texto de sus extremos está mal escrito).

### 5.6 Coste y ejecución
- Unas 3.150 obras, ~1.500 tokens de entrada + ~250 de salida (+ el razonamiento) cada una. A precio de Haiku 5.5 (0,10 $ / 0,50 $ por millón de tokens de entrada / salida, la mitad en Batches) sale por **1-3 $** el lote completo. Hay que volver a calcularlo con `messages.countTokens` sobre la muestra. El script imprime la **estimación antes de lanzar** y pide confirmación (`--yes` para saltarla).
- Primero **`--sample 60`** (20 pelis, 20 series, 20 libros): Igor revisa a ojo una tabla `scripts/cache/llm/sample.md` (título, ejes, temas, oneLiner). Solo después, el lote completo.

### 5.7 Control de calidad del mapa
`scripts/engine/qa-pairs.mjs`, un juego fijo de unas 40 parejas por categoría escritas a mano: 20 que «se parecen» (*Toy Story* / *Buscando a Nemo*) y 20 que no (*Toy Story* / *Saw*). Se comprueba que las parecidas quedan más cerca (en ejes y luego en vectores) que las que no. Se guarda el % de aciertos por versión.

**Hecho cuando:** todas las obras tienen `LlmEnrich` válido, la muestra está revisada por Igor, la QA de ejes pasa del 85 % y el informe está en `scripts/cache/llm/report.md`.

---

## 6. Fase 3 — Vectores, vecinos y clústeres

### 6.1 Embedding de texto
- Modelo **local**, sin clave ni coste: `Xenova/multilingual-e5-small` (384 dimensiones, multilingüe) con `@huggingface/transformers` en Node, como **devDependency** solo de los scripts.
- Alternativa si la calidad no llega: un modelo de embeddings de Voyage AI (comprobar el nombre y el precio actuales), con clave en `.env.local`.
- Texto que se vectoriza (prefijo `passage: ` que pide e5): `título. géneros. temas. momentos. oneLiner. keywords (≤20). sinopsis (≤600 caracteres)`.

### 6.2 Similitud combinada
Para dos obras de la misma categoría:

```
sim(a,b) = 0.45·cos(emb_a, emb_b)
         + 0.30·(1 − ‖axes_a − axes_b‖₂ / ‖4·1‖₂)        // ejes normalizados 0-1
         + 0.15·jaccard(themes ∪ keywordsTop, …)
         + 0.10·[b ∈ related_a ∨ a ∈ related_b]
```
Pesos en `params.ts` (`SIM_W`). Se ajustan con la QA de §5.7: se elige la combinación que más aciertos da.

> **Sustituida** por la fórmula de `docs/ENRIQUECIMIENTO.md` E9, que añade las aristas importadas (`graph`) y las elegidas por el LLM (`pick`).

### 6.3 Lo que se guarda para el navegador (`src/data/engine/<shelf>.json`)

```ts
interface ShelfEngine {
  v: string                      // ENGINE_VERSION con la que se generó
  axisIds: string[]
  ids: string[]                  // orden de las filas
  axes: string                   // base64 de Uint8Array [n × nAxes], valores 1-5
  vec: string                    // base64 de Int8Array [n × 48]: PCA a 48 dimensiones del vector combinado, cuantizado
  nn: number[][]                 // por fila: 20 vecinos más cercanos (índices de fila) según sim()
  macro: number[]                // clúster grueso por fila (k ≈ 8)
  micro: number[]                // clúster fino por fila (k ≈ 30 en pelis/series/libros, ≈ 8 en juegos y artistas)
  clusterNames: { macro: string[]; micro: string[] }  // nombres internos que pone el LLM, solo para depurar y para /metricas
  meta: Record<string, { themes: string[]; moments: string[]; conf: 0 | 1 | 2 }>
}
```
- El «vector combinado» concatena el embedding (peso 0.45) con los ejes escalados (0.30) y un one-hot de temas (0.15). Luego **PCA a 48 dimensiones**. El coseno sobre ese vector reducido aproxima `sim()` y basta para el navegador. `nn` se calcula con la `sim()` exacta en offline.
- Clústeres: k-means++ (semilla fija) sobre el vector combinado; `micro` se calcula dentro de cada `macro`.
- Tamaño previsto: ~1000 × 48 B ≈ 48 KB de vectores + ~80 KB de vecinos por estantería, unos 200 KB en JSON. Si pasa de 400 KB por estantería, se reduce la dimensión.

### 6.4 `lib/engine/features.ts`
Carga y decodifica el `ShelfEngine` y expone:
- `axesOf(id)`, `vecOf(id)`, `sim(idA, idB)` (coseno sobre `vec`), `neighbors(id, k)`, `macroOf(id)`, `microOf(id)`;
- `centroid(ids, weights?)`: el centro de un grupo de obras.

Si no hay `ShelfEngine` (carga fallida o estantería sin enriquecer), **degrada a géneros** con el comportamiento actual. Los motores nunca rompen.

### 6.5 QA
§5.7 repetida sobre `sim()`; además, revisión a ojo de los 10 vecinos de 30 obras conocidas (`scripts/cache/vec/neighbors.md`).

**Hecho cuando:** existe un `engine/<shelf>.json` por estantería, la QA de parejas pasa del 90 % y la revisión de vecinos está en el informe.

---

## 7. Fase 4 — Motor de Descubrir por cupos (`lib/engine/deck.ts`)

### 7.1 Entrada y salida

```ts
interface DeckInput {
  shelf: ShelfType
  items: Item[]                       // de la estantería
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
  profile: Profile                    // birthYear, platforms, country, lang
  friends: Friend[]
  affinity: (friendId: string) => number | null   // 0-100
  friendPct: (friend: Friend, itemId: string) => number | null
  engine: ShelfEngine | null
  session: DeckSessionState           // lo aprendido en esta sesión (§7.6)
  now: number
  seed: number                        // aleatoriedad estable por sesión
}
interface DeckCard { item: Item; bucket: Bucket; score: number; reason?: { friendId?: string } }
type Bucket = 'seen_likely' | 'social' | 'friend_gem' | 'explore'

export function nextCards(input: DeckInput, already: string[], n = 20): DeckCard[]
```

**Generación por tandas, no el mazo entero de golpe.** Hoy `Discover.tsx` rehace todo el mazo con `useMemo` a cada swipe, porque depende de `entries`. Con cupos y aprendizaje, eso reordenaría las tarjetas en pantalla. La pantalla debe tener una **cola**: pide 20, y cuando quedan 8 pide otras 20 con la sesión actualizada. «Deshacer» sigue poniendo la tarjeta recuperada delante.

### 7.2 Elegibles
- Obras sin entrada del usuario.
- Más las **descartadas que vuelven** (§7.7).
- Se **excluyen** las ya enseñadas en esta sesión (`already`).

### 7.3 Puntuación dentro de cada cupo
Todas las señales van normalizadas de 0 a 1 dentro de la estantería.

```
pop      = percentil de popularity en la estantería
votes    = log(1+voteCount) / log(1+max)                     (o readers en libros)
region   = 0.5·[providers[country] no vacío] + 0.3·[releasedIn ∋ country] + 0.2·[wikiLocal ∋ lang]
           + 0.2·[originalLanguage == lang] (tope 1)
era      = 1 si year ∈ [birthYear+12, birthYear+25]; decae lineal a 0 en ±10 años; 0.5 si no hay birthYear
plat     = [providers[country] ∩ profile.platforms ≠ ∅]      ← solo empuja; NUNCA filtra (IDEA §7b.1)

Para cada amigo f que tiene la obra:
  wf     = 0.5 + affinity(f)/100            (0.75 si la afinidad es null)
  rec    = 0.5^((now − at)/30 días)         (vida media en PARAMS.RECENCY_HALF_LIFE_D; 0.3 si no hay at)
  pct    = friendPct(f, id)/100             (si la vio; si la tiene pendiente, pct = 0.4)
  com    = 0.25 si dejó comentario
  s_f    = wf · (0.5·pct + 0.3·rec + com) · (status == 'pending' ? 0.6 : 1)
social   = 1 − Π(1 − min(s_f, 1))           (varios amigos suman sin pasarse de 1)
gem      = max_f [ pct_f ≥ 0.7 ] · wf · (pct_f + com_f)  si pop < 0.5; si no, 0
taste    = sim(item, centroide de tu top 20 % del ranking de esta estantería)  (0.5 si no hay ranking o motor)
novelty  = 1 − max sim(item, cualquier obra tuya vista)      (lo lejos que está de lo tuyo)
adapt    = multiplicador de sesión (§7.6), 0.5-1.3
```

| Cupo | Puntuación |
|---|---|
| `seen_likely` | (0.40·pop + 0.15·votes + 0.20·region + 0.20·era + 0.05·plat) · adapt |
| `social` | (0.70·social + 0.15·taste + 0.10·pop + 0.05·plat) · adapt. Solo si `social > 0` |
| `friend_gem` | (0.75·gem + 0.25·taste) · adapt. Solo si `gem > 0` |
| `explore` | (0.45·novelty + 0.30·votes·(voteAvg/10) + 0.25·taste) · adapt, **con calidad mínima**: voteAvg ≥ 6.5 o un amigo con pct ≥ 0.6. Lejos de lo tuyo, sí; malo, no |

Libros: `votes` usa `readers`; `seen_likely` pesa algo menos `pop` (0.30) y algo más `social` (lo hace el reparto de §7.4). Juegos: `region` y `era` valen 0.5 fijo. Artistas: `region` pesa el doble.
Una obra puede ser elegible en varios cupos; se queda en el que más puntúa, salvo que ese cupo esté lleno.

### 7.4 Reparto e intercalado
Proporciones base según el tamaño de tu estantería (`seenCount` = vistas):

| seenCount | seen_likely | social | friend_gem | explore |
|---|---|---|---|---|
| < 30 | 0.70 | 0.18 | 0.06 | 0.06 |
| 30-150 | 0.55 | 0.32 | 0.07 | 0.06 |
| > 150 | 0.42 | 0.45 | 0.07 | 0.06 |

- `friend_gem + explore` suman **más o menos 1 de cada 8** en todos los tramos (IDEA §7b.2). Lo que cambia con el tamaño de la biblioteca es el reparto entre `seen_likely` y `social`. Rarezas y exploración suben o bajan **solo por la respuesta del usuario** (siguiente punto), con un techo de 0.25 entre las dos.
- **Ajuste por respuesta** (dentro de la sesión y entre sesiones, con los eventos de F0): para cada cupo, `r = (right + up) / shown` en sus últimas 40 tarjetas. Su proporción se multiplica por `clamp(0.6, 1.5, r / r_media)`, y luego se renormaliza.
- Si un cupo no tiene obras (por ejemplo, sin amigos), su parte se reparte entre los demás.
- **Intercalado por créditos** (round-robin ponderado): cada cupo acumula su proporción en cada paso y sale el de más crédito, que resta 1. Un jitter pequeño (`seed`) evita patrones fijos.
- **Diversidad**:
  - nunca dos de la misma `collection` en menos de 6 tarjetas;
  - como mucho 3 seguidas del mismo `macro`;
  - como mucho 2 seguidas del mismo `creator`.

  Si la siguiente las incumple, se coge la siguiente del mismo cupo.

### 7.5 Las 5 primeras tarjetas de cada sesión
Siempre del cupo `seen_likely` o `social`, de las de mejor puntuación. La primera impresión debe ser «¡esta la vi!».

### 7.6 Aprendizaje durante la sesión (`DeckSessionState`)
- Contadores por `macro` y por década: `seen`, `up`, `left`, `shown`.
- `adapt(item)` = producto de:
  - `seenRate(macro)` y `seenRate(década)`, usado solo en `seen_likely`: si casi nunca dices «la vi», baja hasta 0.5;
  - `interestRate(macro)` = (up + right) / shown, en los demás cupos: si descartas mucho una zona, baja.

  Todo **suavizado** (prior de 3 tarjetas neutras) y **limitado** a [0.5, 1.3] para no encerrar al usuario.
- Persistencia: el estado de la sesión se guarda resumido en el store (`deckLearn[shelf]`), con decaimiento ×0.8 al empezar cada sesión nueva.

### 7.7 Descartes que vuelven
- Una descartada es elegible otra vez si `now − dismissedAt > PARAMS.DISMISS_RETURN_D` (365) **o** si después de `dismissedAt` un amigo con afinidad ≥ 60 la vio y la tiene en pct ≥ 0.8.
- Vuelve solo por `social`, `friend_gem` o `explore`, nunca por `seen_likely`, y como mucho 1 de cada 30 tarjetas. Si la vuelves a descartar, el plazo se duplica.
- `dismissedAt` lo pone la acción `swipe(…, 'left')`. En las entradas antiguas sin el campo, se usa `updatedAt`.

### 7.8 Burbuja con comentario (UI, `SwipeDeck` / tarjeta)
- En la burbuja de cada amigo con comentario: un **💬 pequeño** (unos 14 px, sobre un círculo con el color de fondo de la tarjeta) en la **esquina inferior derecha**, como el badge del puesto.
- Orden de las burbujas: primero las que tienen comentario, luego por puesto.
- **Mantener pulsada** una burbuja (≥ 350 ms) enseña un globo con la primera línea del comentario (≤ 80 caracteres) y su puesto. Al soltar se cierra. No debe disparar el swipe: el gesto largo sobre la burbuja cancela el arrastre.
- Lo mismo en `AddFlow` (lista inicial), porque usa el mismo mazo.

### 7.9 Compatibilidad
`AddFlow.tsx` usa hoy `buildDeck` para su lista inicial. Pasa a usar `nextCards(…, n = 40)` **sin cupo `explore`** y sin aprendizaje. `lib/deck.ts` se queda como degradado si no hay `ShelfEngine` y luego se elimina.

### 7.10 Evaluación offline (`scripts/engine/eval-deck.mjs`)
Cada amigo simulado hace de usuario:
1. se le oculta al azar el 30 % de lo que ha visto;
2. se genera su mazo con lo demás;
3. se mide qué % de lo oculto aparece en las primeras 50 tarjetas (*recall@50*).

Se compara con el `buildDeck` actual. Los amigos son sintéticos, así que la cifra sirve para detectar regresiones, no como verdad absoluta.

**Hecho cuando:** el mazo sale por cupos, cada tarjeta registra su `bucket`, se cumplen las reglas de diversidad (con tests), las 5 primeras son de cupos seguros, el 💬 funciona en el móvil y el *recall@50* mejora al `buildDeck` actual.

---

## 8. Fase 5 — Motor de Decidir (`lib/engine/decide.ts`)

Sustituye a `nextShaperPair`, `applyShaper` y `scoreCandidates` de `recommend.ts`, con la misma pantalla `WhatToWatch.tsx`. Las preguntas de `questions.ts` se mantienen.

### 8.1 Estado de la sesión

```ts
interface DecideState {
  shelf: ShelfType
  answers: Answers
  pool: string[]                 // candidatas que pasan los filtros (§8.2)
  prior: Record<string, number>  // puntuación previa de cada candidata (§8.3)
  post: Record<string, number>   // probabilidad actual (suma 1)
  pref: Float32Array | null      // vector de gusto de la sesión (espacio vec, 48 dims)
  prefAxes: number[]             // dirección en ejes (−1..1 por eje)
  duels: { a: string; b: string; winner: string; phase: 'coarse' | 'fine' }[]
  shown: string[]                // orientadores ya usados (no se repiten)
  rejected: string[]             // propuestas rechazadas con «Seguir buscando»
  round: number
}
```

### 8.2 Bolsa de candidatas (`pool`)
- Es la misma lógica de hoy (`passes()` + fallback por niveles) ampliada:
  - `ongoing` sale del dato (`Item.ongoing`), no de la lista fija;
  - los moods que hoy son géneros pasan a ser **condiciones sobre ejes** (`MOOD_AXES` en `questions.ts`, por ejemplo `miedo: { tension: '>=4' }`, `risas: { humor: '>=4' }`, `profunda: { emocion: '>=4', exigencia: '>=3' }`), con los géneros de respaldo si no hay motor.
- **Plataformas en Decidir**: aquí sí pesan mucho. Filtro estricto en el primer nivel y, si se queda corto, se relaja (como hoy). En Descubrir nunca se filtra.
- Origen según `answers.source`: pendientes, catálogo sin entrada del usuario o ambos. Con «ya vista» (repetir): vistas.
- Tope: las 300 mejores por `prior`, para que la elección de parejas sea rápida en el móvil.

### 8.3 Puntuación previa
```
quality = mezcla bayesiana:
  qGlobal  = (voteCount·voteAvg/10 + m·0.65) / (voteCount + m)       m = PARAMS.Q_PRIOR_VOTES (p. ej. 200)
  qFriends = media ponderada por wf del pct de los amigos que la vieron, encogida hacia qGlobal con k = 2
  quality  = 0.4·qGlobal + 0.6·qFriends     (solo qGlobal si ningún amigo la vio)
taste   = sim(item, centroide de tu top 20 %)                 (0.5 sin datos)
mood    = encaje con MOOD_AXES y momentos (company → moments: pareja, amigos, solo…)
boost   = 0.15 si es pendiente tuya; 0.05 si la tiene pendiente un amigo con afinidad ≥ 50
prior   = (0.35·mood + 0.25·taste + 0.40·quality) · (1 + boost)
post    = prior normalizado
```

### 8.4 Orientadores: de dónde salen
Bolsa `O`, con un `recog` (reconocibilidad) por obra:
- **Tus vistas** de la estantería: `recog = 1`. Las del top 30 % de tu ranking valen como guía positiva más clara.
- **Tus descartadas**: `recog = 0.8`.
- **Clásicos**: obras con `pop ≥ p85` y `votes ≥ p80` de la estantería: `recog = 0.6 + 0.4·pop`.

Ninguna obra de `pool` puede ser orientador (D19: los orientadores no son candidatas). Si una vista tuya está en `pool` porque se eligió «repetir», ese día los orientadores salen solo de clásicos y descartadas.

### 8.5 Elegir la pareja: de lo grueso a lo fino, máxima información
Para cada duelo:
1. **Fase**: `coarse` en los 2 primeros duelos de la ronda 1; `fine` en el resto.
2. **Candidatas a pareja**: muestrea hasta 250 parejas (a, b) de `O` sin repetir `shown`:
   - `coarse`: `macro(a) ≠ macro(b)`, y los dos macro con masa en `post` (cada uno con ≥ 15 % de la probabilidad de las candidatas más cercanas a él);
   - `fine`: `a` y `b` **en el macro con más masa**, mejor en el mismo `micro` o en micros vecinos, con `sim(a,b) ∈ [0.55, 0.85]` (parecidas pero no iguales) y diferencia clara en 1-3 ejes (|Δ| ≥ 2 en al menos uno).
3. **Ganancia de información**: cada candidata `c` se reparte por cercanía, `pA(c) = σ((sim(c,a) − sim(c,b)) / τ)` con τ = 0.05. `PA = Σ post(c)·pA(c)`. `info = 1 − |2·PA − 1|`, que es máxima si parte en dos mitades.
4. **Puntuación de la pareja** = `info · (recog_a · recog_b)^0.5 · (1 − 0.3·[mismo creator])`. Se queda la mejor; entre las 3 primeras, al azar (para que no salga siempre igual).
5. El orden de las dos tarjetas en pantalla, al azar. Se registra `infoGain = info` en el evento.

Sin `ShelfEngine`: se degrada al `nextShaperPair` actual.

### 8.6 Aprender del duelo
- `pref ← normalizar(pref + η·(vec(w) − vec(l)))`, con η = 1 en el primer duelo y 0.7 en los siguientes; `pref` empieza en el centroide de tu top o en cero.
- `prefAxes ← prefAxes + 0.5·sign(axes(w) − axes(l))` en los ejes donde |Δ| ≥ 2 (dirección, no valor absoluto).
- Actualización bayesiana de cada candidata: `post(c) ∝ post(c) · (pA(c) si ganó a; 1 − pA(c) si ganó b)^β`, con β = 1.5. Se renormaliza.

### 8.7 Cuándo proponer
- **Por defecto** (`PARAMS.DECIDE_MODE = 'fixed'`): 5 duelos en la ronda 1 y **3** en cada «Seguir buscando», como dice `docs/DISENO_DEMO.md` §14.2. El código actual usa 4 (`MORE_DUELS` en `recommend.ts`): alinéalo a 3.
- **Variante a probar** (`'adaptive'`): mínimo 3 y máximo 8. Para en cuanto `max(post) ≥ 0.30` y `max(post) ≥ 2 × la segunda`. En cada «Seguir buscando», mínimo 2 y máximo 5.
- Se cambia en `params.ts`; `/metricas` compara las dos versiones con los KPIs de Decidir.

### 8.8 La propuesta (siempre una)
```
fit    = post(c) normalizado a 0-1 dentro del top 30 (o, sin motor, la puntuación actual)
final  = fit^0.6 · quality^0.4 · (1 + boost) · (1 − 0.6·maxSim(c, rejected))
```
- Es **encaje × calidad**, no una suma: una muy cercana pero mala no gana a una algo menos cercana y muy buena.
- Las rechazadas y sus casi gemelas (`sim > 0.9`) quedan fuera.
- **Una sola propuesta** por ronda.
- «Seguir buscando»:
  - la rechazada pasa a `rejected`;
  - `pref` se aleja de ella a la mitad de η: `pref ← pref − 0.35·vec(rechazada)`;
  - empiezan los duelos de la ronda siguiente, ya en fase `fine`.

### 8.9 Motivo de la propuesta
`reasons(c, state)` devuelve 1-3 frases con datos reales, en este orden de preferencia:
1. **Duelos**: «Porque elegiste *El Rey León* y *Up*». Son los dos ganadores con más `sim` a la propuesta; sustituye al actual «Algo como *X*».
2. **Amigo**: «Ana la tiene de nº 2», con el amigo de mayor wf·pct. Si tiene comentario, se enseña en la ficha.
3. **Práctico**: «Está en Netflix» / «1 h 38» / «Miniserie de 6 capítulos».
4. **Pendiente**: «La guardaste hace 4 meses».

La ficha de la propuesta enseña la fila completa de amigos con su puesto y comentario (IDEA §7b.3). Los duelos no enseñan amigos.

### 8.10 Por categoría
- **Libros**: las preguntas de la siguiente lectura (§14.1 de DISENO_DEMO) se traducen a ejes:
  - dificultad → `densidad`;
  - ritmo → `ritmo`;
  - parecido o salir de mi zona → `taste` positivo o negativo en `prior`.
- **Juegos**: `players` y `time` son filtros duros (sin fallback que los ignore: si sois 6, un juego de 2 no vale); `mood` → ejes (`risas`, `peso`, `cooperacion`).
- **Artistas**: `mood` → `energia` / `fondo` / `bailable`; la época, por `year`.

### 8.11 Evaluación offline (`scripts/engine/eval-decide.mjs`)
Usuario simulado: un amigo con una obra «objetivo» oculta que tiene en su top 10 %. El simulador responde a los duelos eligiendo el orientador más cercano al objetivo (con un 15 % de ruido). Se mide:
- puesto del objetivo en `post` tras 5 duelos (*hit@1*, *hit@5*);
- duelos necesarios en modo adaptativo;
- el mismo cálculo con el motor actual, para comparar.

**Hecho cuando:**
- con motor, los duelos de fase `fine` son visiblemente «del mismo tipo» (revisado a mano con 10 sesiones guardadas en `scripts/cache/vec/decide-samples.md`);
- *hit@5* mejora al motor actual;
- el motivo sale con datos reales;
- las dos variantes de `DECIDE_MODE` funcionan.

---

## 9. Fase 6 — Limpieza de pendientes (`lib/engine/cleanup.ts` + `Shelf.tsx`)

> Independiente y pequeña: se puede construir en cualquier momento después de F0.

- En la pestaña **Pendientes** de la estantería, si hay 3 o más pendientes: botón **«Lanzar limpieza»** encima de la lista.
- Abre un mazo a pantalla completa (reutiliza `SwipeDeck`) **solo con tus pendientes**:
  - ➡️ derecha: **ya la vi**. Pasa a `seen`; sale la hoja de valoración si `settings.rateOnSwipe` está activo, igual que en Descubrir.
  - ⬆️ arriba: **sigue guardada**. Se queda `pending` y se le pone `reviewedAt = now`.
  - ⬅️ izquierda: **descartada**. Pasa a `dismissed` con `dismissedAt`.
  - Toque: abre la ficha. Deshacer, igual que en Descubrir.
- Etiquetas de los sellos: «¡VISTA!» (según `SHELF_LABEL.stamp`), «LA GUARDO», «FUERA».
- Orden (`cleanupOrder`): primero las **más antiguas** sin `reviewedAt` reciente (`updatedAt` asc.). Luego, las que algún amigo ha visto hace poco (más fáciles de decidir). Las revisadas hace menos de 60 días van al final.
- Al terminar o salir: resumen «3 vistas · 5 siguen · 2 fuera» y un botón «Volver a Pendientes».
- Eventos: `clean_start`, `clean_swipe`, `clean_end`, y `entry_status` con `via: 'clean'`.

**Hecho cuando:** funciona en las cinco estanterías, deshacer funciona y los tests de `cleanupOrder` pasan.

---

## 10. Parámetros (`src/lib/engine/params.ts`)

Todo lo ajustable, con un comentario de qué hace cada valor:
- `ENGINE_VERSION`;
- `SIM_W`;
- `BUCKET_BASE` (tabla §7.4);
- `BUCKET_ADAPT_CLAMP`;
- `RECENCY_HALF_LIFE_D` (30);
- `DISMISS_RETURN_D` (365);
- pesos de cada cupo (§7.3);
- `DIVERSITY` (6 / 3 / 2);
- `Q_PRIOR_VOTES`;
- `DECIDE_MODE`;
- `TAU` (0.05), `BETA` (1.5), `ETA`;
- umbrales de la propuesta adaptativa;
- `CLEANUP_MIN` (3), `CLEANUP_RECENT_D` (60).

---

## 11. Backend (Supabase) — Fase adelantada para beta con amigos

Para probar la app con amigos reales y evitar que cada uno viva en un `localStorage` aislado, el backend se ha adelantado con Supabase (en la cuenta secundaria `usamoneandoando@gmail.com`, proyecto `pvewnpemlwmvaduzhjso`).

- **Tablas ya creadas (con prefijo `biblio_` y RLS habilitado)**:
  - `biblio_profiles`: perfiles de usuario vinculados a `auth.users(id)`.
  - `biblio_entries`: catálogo personal de cada usuario (obras, estados, puntuaciones y puestos).
  - `biblio_friends`: relaciones de amistad bidireccionales reales.
  - `biblio_invites`: enlaces mágicos de invitación («Únete a mi biblioteca»).
  - `biblio_events`: persistencia en la nube de los eventos de motor y analítica (conecta con F0).
- **Modo Demo (fallback)**: se mantiene para usuarios no autenticados, usando amigos simulados en memoria/local.
- **Colaborativo futuro** (IDEA §7b.1, fase 4): matriz obra-obra de co-ocurrencia en el top 30 % de los rankings de usuarios.
- **Avisos con motivo** (IDEA §7b.4): notificaciones cuando un amigo califica una obra guardada o cuando una obra entra en su catálogo de streaming.

---

## 12. Orden de construcción y entregables

| # | Fase | Entregable | Depende de | Confirmación de Igor |
|---|---|---|---|---|
| 0 | F-Backend Mínimo (§11) | Cliente Supabase, login email/Google, sincronización de estanterías, invitaciones de amigos y eventos a `biblio_events` | — | ✅ Configurado |
| 1 | F0 Eventos y métricas (§3) | `useEvents`, `track`, `metrics.ts`, `/metricas`, `params.ts` (con persistencia local + Supabase) | F-Backend | — |
| 2 | F1 Datos base (§4) | `sources.mjs`, `Item` ampliado, amigos con `at`, perfil con país, re-anclaje §4.4 | — | revisar `unmatched.json` y qué hacer con lo no re-anclable |
| 3 | F2 LLM (§5) | `axes.mjs`, `vocab.mjs`, `llm.mjs`, muestra de 60, lote completo | F1 | **vocabulario**, **muestra** y **coste** antes del lote |
| 4 | F3 Vectores (§6) | `vectors.mjs`, `engine/<shelf>.json`, `features.ts`, QA | F2 | revisar los vecinos |
| 5 | F4 Descubrir (§7) | `engine/deck.ts`, cola en `Discover.tsx`, 💬, evaluación | F0, F1 (F3 opcional: sin motor usa `taste = 0.5`) | probar en el móvil |
| 6 | F5 Decidir (§8) | `engine/decide.ts`, `WhatToWatch.tsx`, motivos, evaluación | F0, F3 | probar en el móvil |
| — | F6 Limpieza (§9) | botón + mazo de pendientes | F0 | — |

- **F6 es independiente y pequeña**: se puede hacer en cualquier momento después de F0, incluso en paralelo a F2-F3.
- **F4 puede empezar en cuanto acabe F1**: casi todas sus señales son sociales o de metadatos. El término `taste` y la diversidad por `macro` se activan solos cuando llega F3.

Tests mínimos por motor:
- casos límite: estantería vacía, sin amigos, sin `ShelfEngine`, todo descartado, una sola candidata;
- reglas de diversidad;
- que las plataformas **no filtran** en Descubrir;
- que los orientadores nunca son candidatas;
- que el degradado sin motor da el comportamiento de hoy.

---

## 13. Abierto (no bloquea la construcción)

- Textos finales de los extremos de cada eje y de los vocabularios: el agente hace el borrador e Igor lo revisa (F2).
- `DECIDE_MODE`: `fixed` o `adaptive`, lo deciden las métricas.
- Si el globo del 💬 al mantener pulsado molesta al swipe en móviles reales, se cambia por un toque en la burbuja (abre la ficha en los comentarios).
- Permiso de GroupLens para calibrar con Tag Genome (opcional; ver IDEA §7b.1).
