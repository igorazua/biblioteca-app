# Diseño técnico del motor — Biblioteca

> **Para quién:** el agente que lo construya. Las decisiones de producto están en `docs/IDEA.md` §7b (fuente de verdad). Aquí está el **cómo**.
> **v2 (21/10/2026):** §2b y §8.4 reescritos; **§2c nuevo: el cerebro** (espacio único de contenido + comportamiento, vector de usuario y modelo que aprende a ordenar) (los tres motores, registro de atributos, R única para duelos y mazo). Las tareas para construirlo están en `docs/TAREAS_MOTOR_V2.md`. **No hay API de TMDB** (PLAN_MEJORAS §0): las menciones a TMDB de este documento son históricas.
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
8. ⚠️ **Sustituida el 21/10/2026** por la regla de catálogo de `PROJECT_CONTEXT.md` (se permite raspar con imágenes alojadas por nosotros y procedencia; no hay TMDB: donde este documento dice TMDB, léase Wikidata/TVmaze/Open Library/MusicBrainz o raspado). Texto antiguo: **Catálogo legal**: solo fuentes abiertas o con licencia (TMDB, Wikidata, Open Library, MusicBrainz/ListenBrainz). Ver §4.4 sobre las fuentes actuales de la semilla. Comprueba en los términos de TMDB:
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


## 2b. Los tres motores y sus datos (v2, 21/10/2026)

> Sustituye a la «Especificación Maestra» del 20/10. Decisiones de Igor: cero fricción, **los mejores motores que existan** y **la ficha de obra con más metadatos que exista**; se itera lo que haga falta. Las tareas para construirlo están en `docs/TAREAS_MOTOR_V2.md`.

### 2b.0 Principios
1. **Tres puntuaciones, cada una con su trabajo:**
   - **R — reconocibilidad**: probabilidad de que *este usuario* conozca la obra. Elige los orientadores de los duelos y ordena el cupo `seen_likely` del mazo. **Es una sola función** (`lib/engine/recog.ts`) para los dos sitios.
   - **A — propuesta**: qué obra proponer hoy en Decidir (encaje × calidad). **No lleva reconocibilidad**: una propuesta desconocida puede ser justo el descubrimiento.
   - **D — posición en el mazo**: orden de Descubrir por cupos (§7), donde `seen_likely` usa R.
2. **Primero los datos, después las fórmulas.** Una fórmula fina sobre datos de relleno no vale nada. Hoy (21/10) los ejes, temas y momentos son relleno (todo a 3): llenarlos va antes que afinar pesos.
3. **Nada de umbrales absolutos sobre datos con escalas distintas.** Cada señal se pasa a **percentil dentro de su estantería** antes de usarse (la popularidad mediana de series es 92 y la de juegos 70: un «≥ 90» significa cosas distintas en cada una).
4. **Nada de adivinar por el texto del título.** Idioma, país y título local salen de datos (Wikidata, Open Library, MusicBrainz) o del registro de atributos (§2b.2), nunca de una regex.
5. **Todo número ajustable en `params.ts`** y todo cambio sube `ENGINE_VERSION` y se mide (§2b.7).
6. **Cero fricción:** no se pregunta nada que se pueda deducir (año de nacimiento, país, plataformas se infieren o se preguntan solo cuando hacen falta), y no hay botón «no conozco ninguna» (D28): los orientadores tienen que ser reconocibles desde el primer duelo.

### 2b.1 La ficha de obra (`Item`)
Campos que leen los motores, la ficha o el LLM. Todos opcionales. **Cada valor importado lleva su procedencia** en `Item.src[campo]` y, si no viene de una fuente dura, su confianza en `Item.conf[campo]` (0-1).

| Bloque | Campo | Tipo | Fuente preferida → alternativas | Lo usa |
|---|---|---|---|---|
| Identidad | `id`, `type`, `title`, `year`, `creator` | — | semilla | todo |
| | `originalTitle` | string | Wikidata label original · OL · MusicBrainz | imports, ficha |
| | `titles` | `Record<locale, string>` (`es-ES`, `es-MX`…) | Wikidata label@es · ediciones de OL · raspado · LLM | título por mercado; señal de «se estrenó/tradujo aquí» |
| | `originalLanguage` | ISO-639-1 | Wikidata P364/P407 · MusicBrainz · LLM | R (local), D (`region`) |
| | `originCountry` | ISO-3166[] | Wikidata P495 · nacionalidad del autor P27 (libros) · MusicBrainz área (artistas) · LLM | R, D |
| | `collection` | string | Wikidata P179 · LLM | diversidad, aristas `saga` |
| | `wikidataId`, `olid`, `mbid`, `tvmazeId`, `imdbId`, `bggId` | — | resolutores | cruce de fuentes e imports |
| Notoriedad | `popPct` | 0-100, **percentil en su estantería** | se calcula (§2b.4) | R, D |
| | `notoriety` | `Record<país, 0..1>` | se calcula por mercado (§2b.4) | R |
| | `trend` | `Record<país, 0..1>` + fecha | visitas recientes de Wikipedia vs su media · listas raspadas | D (`social`/`explore`), A (empujón pequeño) |
| | `isCanon` | bool | listas de canon (escolar, «1001…», AFI, etc.) · LLM | R (no penaliza por antigüedad) |
| | `schoolReading` | `Record<país, bool>` | listas de lecturas de instituto · LLM con búsqueda | R (libros: casi todo el mundo los conoce) |
| | `wikiLangs`, `wikiLocal`, `pageviews` | número / idiomas / `Record<lang, nº 12 meses>` | Wikidata sitelinks · API de visitas de Wikimedia | `notoriety`, `popPct` |
| | `voteAvg`, `voteCount`, `readers` | — | Wikidata · OL · raspado | calidad (A), `votes` (D) |
| | `awards` | string[] | Wikidata P166 | calidad de respaldo, ficha, LLM |
| Consumo | `durationMin`, `pages`, `seasons`, `episodes`, `ongoing`, `players`, `minAge`, `weight` | — | semilla · Wikidata · TVmaze · raspado · LLM | filtros de Decidir |
| | `providers` | `Record<país, string[]>` | raspado (sin TMDB no hay fuente abierta) · LLM con búsqueda | empuja en D, filtra en Decidir |
| Sensación | `axes`, `themes`, `moments`, `oneLiner` | §5 | LLM (E6) | mood, `taste`, duelos `fine`, motivos |
| | vector, vecinos, `macro`/`micro` | §6 | vectores locales + LLM (E7-E9) | todo lo de similitud |
| Imagen | `posterUrl`, `imageSrc`, `imageCredit` | — | **alojada por nosotros** (PROJECT_CONTEXT, Reglas) | ficha, tarjetas |

**Al navegador solo va lo que lee la app.** Los mapas por mercado (`notoriety`, `trend`, `titles`, `providers`) se recortan en el build al mercado activo (hoy `ES`); el resto vive en las cachés de `scripts/cache/` y, cuando haya catálogo vivo, en `biblio_catalog`.

### 2b.2 Registro de atributos y relleno de huecos
Para que añadir un dato nuevo («¿estuvo más de un mes en cines en España?», «¿es lectura de instituto?») sea **una entrada en una tabla y un comando**, no un script nuevo.

**Registro** `app/scripts/engine/attrs.mjs`:
```js
export const ATTRS = {
  originalLanguage: {
    type: 'lang', shelves: ['movie', 'series', 'book', 'artist'],
    consumers: ['R', 'D'],
    sources: ['wikidata', 'openlibrary', 'musicbrainz', 'llm-infer'],   // orden de preferencia
    minCoverage: 0.95,
    refresh: 'never',
  },
  schoolReading: {
    type: 'map<country,bool>', shelves: ['book'], consumers: ['R'],
    question: '¿Es (o ha sido) lectura habitual en institutos de {country}?',
    sources: ['scrape:listas-lecturas', 'llm-search'],
    needsEvidence: true,      // dato factual: el LLM tiene que buscar y citar una URL
    minCoverage: 1.0, refresh: 'yearly',
  },
  // …
}
```

**Valores** en `app/scripts/cache/attrs/<atributo>.jsonl`, una línea por obra:
```json
{"id":"book:la-colmena-1951","value":{"ES":true},"src":"llm-search","conf":0.9,"evidence":"https://…","at":"2026-10-21"}
```

**Reglas:**
- **Orden de fuentes** (de más a menos fiable): fuente dura (Wikidata, OL, MusicBrainz, TVmaze) > raspado > `llm-search` (con URL de prueba) > `llm-infer` (lo deduce sin buscar). **Un valor de menos fiabilidad nunca pisa uno de más.**
- **Datos factuales** (fechas, cifras, listas, «estuvo en cines») van con `needsEvidence: true`: sin URL, no entran.
- **Calibración antes del lote**: si el atributo ya tiene valores de una fuente dura en parte del catálogo, se rellena primero una muestra de 50 de esas obras con el LLM y se compara. Solo se acepta el lote si coincide ≥ 90 % (booleanos y categorías) o con error medio ≤ 0,15 (escalas 0-1). Si no hay valores duros con los que comparar, Igor revisa 30 al azar con su prueba.
- **Modos de relleno** (`scripts/engine/fill-attr.mjs --attr X --shelf Y --mode …`):
  - `agent`: exporta bloques de ~40 obras a `cache/attrs/agent-in/`; el agente (Gemini) escribe la respuesta en `agent-out/`; `--mode import` la valida (tipo, rango, enum, prueba si hace falta). Igual que ENRIQUECIMIENTO §5b.
  - `api`: lo mismo por API de un LLM (pide confirmación de coste a Igor).
  - `search`: modo agente con búsqueda en internet obligatoria; cada valor lleva `evidence`.
- **El build** (`npm run engine:build`, que la tarea T2 mete dentro de `npm run seed`) fusiona: por cada obra y atributo coge el valor de la fuente más fiable, rellena `src` y `conf` y recorta los mapas al mercado activo.
- **Huecos a la vista**: `npm run engine:coverage` lee `minCoverage` de cada atributo e imprime la tabla **«Huecos»** (atributo · estantería · cobertura · objetivo · comando para rellenarlo). Esa tabla es el aviso para que Igor ponga a un LLM a rellenar.

### 2b.3 Usuario y amigos
| Campo | Cómo se obtiene (sin preguntar si se puede) | Lo usa |
|---|---|---|
| `country`, `lang` | `navigator.language` / zona horaria (§4.3); editable en Ajustes | R, D, títulos |
| `birthYear` | declarado en Ajustes; si no, **inferido** (abajo). El declarado manda | R (`era`), D |
| `platforms` | se pregunta la primera vez en Decidir (PLAN_MEJORAS §2) | Decidir, D |
| entradas (`seen`, `pending`, `dismissed`, rankings, notas, comentarios) | uso normal | todo |
| `deckLearn[shelf]` (§7.6) | **aprendido del mazo**: por `macro` y por década, cuántas tarjetas le salieron y cuántas marcó «la vi» (suavizado, con decaimiento ×0,8 por sesión) | R (`zona`), año inferido |
| amigos: afinidad, puesto, comentario, fecha | §7.3 | R (`social`), A, D |

**Año de nacimiento inferido** (`inferBirthYear`): se calcula con la **tasa** de «la vi» por década del mazo (`seen / shown` de `deckLearn`, sin canon ni obras de los últimos 2 años), **no** con los años de las obras vistas: si no, se retroalimenta (el mazo enseña más de la época supuesta, el usuario marca más de esa época y la suposición se confirma sola). Se busca la década con la tasa más alta y `birthYear ≈ inicio de esa década + 5 − PARAMS.ERA_MEDIAN_AGE` (25 de partida), acotado a [1940, 2012]. Hace falta ≥ 60 tarjetas vistas repartidas en ≥ 3 décadas; confianza baja hasta 150. Se recalcula al abrir Decidir o Descubrir. Se valida con los usuarios que sí lo declaran (error medio objetivo ≤ 6 años).

### 2b.4 Motor R — reconocibilidad
**Notoriedad por mercado** (`notoriety[país]`, la calcula el build, no la app). Responde a «¿y si abrimos en otros países?»: no hay un dato «España», hay un mapa por país y abrir un país nuevo es calcular su clave.
```
señales para el país P con idioma L (todas a percentil dentro de la estantería):
  vis   = visitas de los últimos 12 meses al artículo en la Wikipedia de L
  local = [originCountry ∋ P] · 1  +  [titles tiene título para P o artículo en la Wikipedia de L] · 0.5   (tope 1)
  lista = aparece en listas raspadas de P (taquilla, más vendidos, audiencias, lecturas escolares)
  llm   = estimación del LLM: «¿qué parte de los adultos de P la reconocería?» en 0 / .25 / .5 / .75 / 1
notoriety[P] = 0.45·vis + 0.15·local + 0.15·lista + 0.25·llm      (pesos en params; se recalibran con datos, §2b.7)
```
Limitación conocida: las visitas de Wikipedia son por idioma, no por país (España y México comparten la Wikipedia en español). Para distinguirlos pesan más `local`, `lista` y `llm`.

**Popularidad**: `popPct` = percentil dentro de la estantería de una mezcla de visitas de Wikipedia (todas las lenguas), `voteCount`/`readers` y `wikiLangs`. Sustituye a `popularity` en los motores (que se queda solo por compatibilidad). Nunca se escribe a mano.

**R de una obra para un usuario** (`recog(item, user)` en `lib/engine/recog.ts`):
```
si la tiene vista                → R = 1
si la tiene pendiente            → R = 0.9
(descartada no cuenta: «no me interesa» no significa «la conozco»)

base   = notoriety[user.country]           (si falta: popPct/100 · 0.8)
era    = curva por la edad del usuario al estreno, e = year − birthYear (birthYear declarado o inferido):
           e < 0   → 0.35   (0.9 si isCanon o schoolReading)
           0–11    → 0.7
           12–25   → 1.0     (ventana formativa: PARAMS.ERA_WINDOW, la única definición del proyecto)
           26–35   → 0.85
           > 35    → 0.7
           tramos con transición lineal de 2 años; sin birthYear → 0.75
zona   = tasa de «la vi» de deckLearn (§7.6) en el macro y de la década de la obra (0.5 sin datos)
social = 1 − Π(1 − 0.35·wf) sobre los amigos que la tienen vista o pendiente   (wf como en §7.3)

R = 1 − (1 − base · era · (0.6 + 0.4·zona)) · (1 − social)
```
- **Arranque en frío** (usuario nuevo, sin nada): R ≈ notoriedad en su país × su época. Los primeros orientadores y las primeras tarjetas del mazo son lo más conocido de su país y su generación: «muy reconocibles desde el principio», sin botón.
- **Aprende sin preguntar**: cada «la vi» del mazo es una etiqueta gratis de «la conoce». Con ≥ 2.000 eventos de mazo (`deck_shown` con su R + `deck_swipe`), un script offline ajusta los pesos (regresión logística) y se compara con la fórmula a mano (§2b.7).

### 2b.5 Motor A — propuesta de Decidir
La de §8.3 y §8.8, sin cambios de fondo:
```
final = fit^0.6 · quality^0.4 · (1 + boost) · (1 − 0.6·maxSim(c, rechazadas))
boost = 0.15 si es pendiente tuya + 0.05 si la tiene pendiente un amigo con afinidad ≥ 50 + PARAMS.TREND_BOOST·trend[país] (0.05)
```
- **No lleva reconocibilidad, idioma ni época** (se quita el `geoEraBoost` que añadió Gemini al `prior`). El idioma solo filtra si el usuario lo pide en las preguntas.
- Un orientador **puede** ser la propuesta (D19, 21/10/2026).
- Depende de que haya ejes, temas y vecinos reales: hasta las tareas T5-T7 de `TAREAS_MOTOR_V2.md`, `fit` sale casi solo de géneros y vecinos.

### 2b.6 Motor D — mazo de Descubrir
El de §7, con estos cambios:
- `seen_likely` = **R · adapt** (sustituye a la suma `pop + votes + region + era + plat`; la plataforma sigue empujando un 5 %).
- `explore` y `friend_gem` usan `popPct` (percentil), no `popularity`.
- Cada `deck_shown` guarda el R de la tarjeta, para medir R (§2b.7).

### 2b.7 Medir e iterar
Cada cambio sube `ENGINE_VERSION` y se compara en `/metricas` y con los scripts offline.

| Motor | Métrica principal | Objetivo inicial |
|---|---|---|
| R | **AUC** de R prediciendo «la vi» en el mazo (`deck_shown`.R vs `deck_swipe` = right) | ≥ 0.80 |
| R | % de «la vi» en las 20 primeras tarjetas de usuarios nuevos | ≥ 50 % |
| R (duelos) | mediana del tiempo de respuesta del duelo (`dec_duel.ms`) y abandono en duelos | baja con cada versión |
| A | aceptación a la primera; **acierto real** (aceptada → vista → percentil en su ranking) | §3.2 |
| D | recall@50 (`eval-deck.mjs`), «la vi» en las 20 primeras, guardadas por sesión | §3.2 |
| Datos | tabla «Huecos» de `engine:coverage` vacía para los atributos con `minCoverage` | 0 huecos |

---

## 2c. El cerebro: un espacio único que aprende (v2, 21/10/2026)

> Decisión de Igor (21/10/2026): el motor tiene que ser un **cerebro** que aprende y se adapta, no una suma de atributos. Los atributos de §2b.1 sirven para filtros y para R; **el gusto sale del cerebro**. Tareas en `docs/TAREAS_MOTOR_V2.md` (bloque B, T4-T7, y T11).

### 2c.0 Idea
Cada obra es un punto en un espacio de muchas dimensiones, y la distancia entre dos puntos es el peso de su conexión: todas las obras quedan conectadas con todas. Ese espacio se construye con dos fuentes:
- **qué es la obra** (contenido): de qué va y cómo se siente;
- **qué hace la gente con ella** (comportamiento): quién la ve, guarda o pone alta junto a qué otras. Es la parte que lo convierte en aprendizaje automático y la que más vale.

Los tres motores son **preguntas al mismo cerebro**: R = «¿la conoce?», A = «¿le va a gustar hoy?», D = la mezcla para el mazo. Todas las categorías comparten el mismo espacio (un libro puede quedar cerca de una peli).

### 2c.1 Capa 1 — Contenido: ficha de experiencia
- **Qué es:** por obra, el LLM escribe una **ficha de experiencia** en español (≤ 1.200 caracteres, uso interno, no se publica) a partir del contexto de E5 (sinopsis, Wikipedia, keywords, premios, relacionadas). Estructura fija:
  1. de qué va, sin spoilers (2 frases);
  2. cómo se siente (tono, ritmo, intensidad, humor, qué te deja);
  3. por qué engancha y a quién le gusta;
  4. a quién no le va a gustar;
  5. 3-5 obras con las que se compara (de cualquier categoría, con nombre);
  6. contexto (época, fenómeno, culto, clásico).
- En la **misma llamada** salen los ejes, temas, momentos y `oneLiner` de §5 (sustituye al relleno actual). Un solo esquema JSON, una sola validación.
- **Embedding de contenido** (`embContent`): de la ficha de experiencia + temas + momentos, con el modelo multilingüe local de §6.1 (gratis). Si la QA no llega, se prueba un modelo de pago (Voyage, unos 5-15 $ para 200.000 obras); se elige el que gane la evaluación de §2c.6.
- **Modelo del LLM:** muestra de 100 obras con Haiku 5.5 y con Sonnet 5.5; Igor compara a ojo y se elige. Beta (5.000 obras): Gemini en modo agente o API; catálogo grande: API por lotes (§2c.7).

### 2c.2 Capa 2 — Comportamiento prestado: el grafo de co-consumo
Sin usuarios propios todavía, se aprende del comportamiento público. Cada fuente da **aristas obra–obra con un peso** = cuánta gente las junta.

| Fuente | Señal | Categorías | Cómo |
|---|---|---|---|
| **Clickstream de Wikipedia** (dumps mensuales, CC0, incluida la Wikipedia en español) | personas que pasan del artículo A al B | todas | descarga mensual; se cruzan los artículos con nuestras obras por sitelinks de Wikidata |
| **Listas públicas de Letterboxd** | dos pelis en la misma lista | pelis (y series) | raspado de listas populares y recientes |
| **Estanterías y listas de Goodreads** | dos libros en la misma lista o estantería | libros | raspado de listas («Listopia») |
| **Colecciones y «fans also like» de BGG** | dos juegos en la misma colección | juegos | raspado |
| **Last.fm / «fans también escuchan»** | artistas similares por escuchas | artistas | raspado |
| **Nuestros usuarios** (cuando haya) | top 30 % del mismo ranking, ganadoras de la misma sesión de Decidir, aceptada → vista | todas | eventos de F0 |

Reglas:
- **Solo se guardan recuentos agregados** (`a`, `b`, `fuente`, `n`); nunca nombres de usuario ni listas identificables.
- Peso de la arista: **PMI positivo** (cuánto más aparecen juntas de lo esperable por su popularidad), para que las obras muy populares no se conecten con todo.
- Ritmo ≤ 1 petición/s por dominio, con caché y reanudable (puede tardar días en segundo plano).
- Archivo: `app/scripts/cache/graph/cooc-<fuente>.jsonl`. Las obras de las listas que no están en el catálogo van a `outside.json` (candidatas a ampliar el catálogo, ordenadas por número de conexiones).
- **Embedding de comportamiento** (`embBehavior`): node2vec / item2vec sobre el grafo de co-consumo (un script de Python o Node, minutos u horas en un portátil).

### 2c.3 Capa 3 — Fusión: el espacio único
```
vec(obra) = normalizar( α·embContent  ⊕  β·embBehavior  ⊕  γ·embRelaciones )
  embRelaciones = node2vec sobre las aristas duras de E4 (saga, adaptación, mismo creador, influencia)
  β depende del soporte de la obra: crece con su nº de aristas de comportamiento (0 si no tiene, β_max con ≥ 50)
  → una obra de nicho se apoya en su contenido; una muy vista, en el comportamiento
```
- Los pesos (α, β_max, γ) se eligen con la evaluación de §2c.6, no a mano.
- Para el navegador: PCA a 48-64 dimensiones, cuantizado (como §6.3), vecinos (`nn`) y clústeres recalculados sobre `vec`.
- La similitud de E9 (`sim(a,b)`) pasa a ser el coseno sobre `vec` más el empujón de las aristas `pick` del LLM (que siguen dando el **motivo** en texto).
- Se recalcula **cada semana**, solo lo que cambia (por hash).

### 2c.4 Capa 4 — Tú dentro del espacio y un modelo que aprende a ordenar
- **Vector de usuario** `u` por estantería, en el mismo espacio, persistido en el store y en Supabase:
  ```
  u = normalizar( Σ peso(acción) · vec(obra) )   con decaimiento por antigüedad (vida media 1 año)
  peso: puesto en el ranking (top 10 % = 3, resto de vistas = 1 escalado por percentil), pendiente = 0.5,
        descartada = −0.5, ganadora de duelo = +0.3, perdedora = −0.15, propuesta rechazada = −0.3
  ```
  Se actualiza en el móvil en cada acción (milisegundos). El vector de la sesión de Decidir (`pref`, §8.6) parte de `u` en lugar de cero.
- **Modelo que aprende a ordenar** (`lib/engine/ranker.ts`, uno por motor): regresión logística sobre señales ya calculadas:
  - `cos(u, vec)`, R, calidad, social, `popPct`, `trend`, encaje con el mood, plataforma, novedad;
  - objetivo: D → «la vi» o «la guardo»; A → «aceptada y luego vista con percentil ≥ 50»; R → «la vi».
  - Arranca con los pesos a mano de §2b y §7; `scripts/engine/fit-ranker.mjs` los reentrena offline con los eventos (≥ 2.000 por objetivo) y **propone**; Igor decide si se aplican (sube `ENGINE_VERSION`).
  - Más adelante, si hay volumen: árboles (LightGBM) en lugar de logística, y pesos personales ligeros por usuario.
- **Exploración (bandit):** en `explore` y en el 10 % de `social`, muestreo de Thompson sobre la incertidumbre de cada zona del espacio: se prueban de vez en cuando zonas poco vistas para seguir aprendiendo y no encerrar al usuario.

### 2c.5 Qué cambia en cada motor
- **R:** `zona` (§2b.4) pasa a ser también la cercanía a lo que ya conoces en el espacio (`cos(u, vec)` de tus vistas). Los pesos de R los ajusta `fit-ranker`.
- **A (Decidir):**
  - `taste` = `cos(u, vec)`; los duelos mueven `pref` en el espacio único;
  - **re-muestreo del pool:** tras el 3.er duelo, y en cada «Seguir buscando», se vuelve a buscar en **todo el catálogo** las 300 más cercanas a `pref` que pasen los filtros (el pool inicial pudo dejar fuera la buena);
  - parada adaptativa (`DECIDE_MODE = 'adaptive'`, §8.7) cuando una candidata concentra la probabilidad.
- **D (Descubrir):** `taste` y `novelty` sobre el espacio único; el bandit en `explore`.
- **Además:** «si te gustó este libro → esta peli» (D24) y los vecinos de la ficha salen gratis del espacio único.

### 2c.6 Evaluar con usuarios reales antes de tenerlos
- **Usuarios de prueba:** ~2.000 perfiles públicos raspados (Letterboxd para pelis, Goodreads para libros; solo sus listas de vistas y notas, con un id interno anónimo y sin nombre). Se **separan de los que alimentan el grafo** de §2c.2, para no hacer trampa.
- Por cada uno: se esconde el 20 % de lo que ha visto (lo más reciente) y se mide si el motor lo recupera:
  - **recall@50 y NDCG@50** del mazo;
  - **hit@5** de Decidir (simulador de §8.11 usando ese usuario);
  - **AUC de R** (obras vistas frente a no vistas de la misma época).
- `scripts/engine/eval-brain.mjs` imprime la tabla por versión y por estantería, y se guarda en `scripts/cache/eval/historico.md`. **Ningún cambio del cerebro se aplica si empeora esta tabla.**
- Línea base: el sistema actual (vectores solo de texto). Objetivo de la primera versión: +30 % de recall@50 sobre la línea base.

### 2c.7 Magnitudes (estimación del 21/10/2026)
| | Beta (~5.000 obras) | Producto (~200.000 obras) |
|---|---|---|
| Portadas (~40 KB por obra) | 200 MB | 8 GB |
| Fichas, vectores y grafo | < 50 MB | ~1 GB |
| Alojamiento | gratis (Supabase) | ~25 $/mes (Supabase Pro); portadas en Cloudflare R2 cuando haya tráfico (descarga gratis) |
| LLM, una vez (ficha + ejes + vecinos) | 4 $ (Haiku) – 80 $ (Sonnet) | 160 $ (Haiku) – 3.200 $ (Sonnet), en lotes |
| LLM, cada atributo deducido | céntimos | ~6 $ (Haiku) |
| LLM con búsqueda web obra a obra | ~60 $ por atributo | ~2.400 $ por atributo → **se evita: se raspan listas, no obras** |
| Embeddings y entrenamiento | 0 $ (modelo local, portátil) | 0 $ local (horas de CPU) o 5-15 $ |
| Raspado | 1 PC en segundo plano | 1 PC o un servidor de ~5 $/mes; días de trabajo a 1 petición/s |
| Por usuario | un vector (< 2 KB) y unos pocos pesos | igual: el cerebro es compartido |

- Los vectores caben en el navegador hasta ~50.000 obras por estantería; por encima, búsqueda en el servidor con pgvector.
- Mantenimiento: obras nuevas y tendencias cada semana, < 30 $/mes de LLM.

### 2c.8 Licencias
Aparcado por decisión de Igor (21/10/2026) hasta que la app funcione con usuarios. Para no cerrarse puertas: todo dato e imagen lleva su procedencia (`src`, `imageSrc`), los datos de comportamiento solo se guardan agregados y sin personas, y lo que se publica (fichas, motivos) lo escribe nuestro LLM. Con eso, `purge-source.mjs` puede sustituir cualquier fuente el día que haga falta.

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
era      = ⚠️ v2: sustituido por la curva `era` de §2b.4 (PARAMS.ERA_WINDOW)
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
| `seen_likely` | ⚠️ v2: **R · adapt** + 0.05·plat (§2b.6). Antes: (0.40·pop + 0.15·votes + 0.20·region + 0.20·era + 0.05·plat) · adapt |
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

### 8.4 Orientadores: de dónde salen (v2, 21/10/2026)

> **Regla de producto (Igor):** los orientadores son guías de tipo («¿más tipo esto o tipo lo otro?»). Para que sirvan, **el usuario tiene que reconocerlos desde el primer duelo**, sin botón de «no conozco ninguna» (D28). Si un orientador acaba siendo la mejor propuesta, se propone (D19).

- **Elegibles**: todas las obras de la estantería no enseñadas en esta sesión, **incluidas las del `pool`**. Ya no hace falta ninguna salvaguarda para estanterías pequeñas.
- **Reconocibilidad**: `R = recog(item, user)` de §2b.4 (la misma función que ordena `seen_likely` en el mazo).
- **Suelo relativo**: entran las obras con R en el percentil ≥ `PARAMS.ORIENTER_R_PCT` (70) de la estantería para ese usuario; si quedan menos de `PARAMS.ORIENTER_MIN` (40), se baja el percentil de 10 en 10.
- **Sorteo con papeletas** (lo que pidió Igor: las de arriba tienen más papeletas, pero puede salir cualquiera del grupo): se muestrean hasta 250 parejas con probabilidad ∝ `(R_a · R_b)^PARAMS.ORIENTER_K` (k = 2). No se corta a un «top 80» fijo, para que no salgan siempre las mismas obras de sesión en sesión.
- **Rotación entre sesiones**: las obras que hicieron de orientador en las últimas 3 sesiones de esa estantería llevan ×0.5 en sus papeletas.
- **Tus vistas valen doble como guía**: las del top 30 % de tu ranking orientan con más claridad; R = 1 ya las favorece en el sorteo.
- Después, la pareja se puntúa como en §8.5 (`info · (R_a·R_b)^0.5 · penalización por mismo creador`) y se elige entre las 3 mejores al azar.
- El evento `dec_duel` guarda también `ms` (tiempo hasta responder): un duelo lento es la señal, sin preguntar, de que no se reconocían.

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
- `CLEANUP_MIN` (3), `CLEANUP_RECENT_D` (60);
- v2 (§2b): `ERA_WINDOW` (la curva de `era`, **única definición** de la ventana formativa en todo el proyecto), `ERA_MEDIAN_AGE` (25), `R_W` (pesos de R), `NOTORIETY_W` (pesos de la notoriedad, que también usa el build), `ORIENTER_R_PCT` (70), `ORIENTER_MIN` (40), `ORIENTER_K` (2), `ORIENTER_ROTATION` (3 sesiones, ×0.5), `TREND_BOOST` (0.05).

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
- que el degradado sin motor da el comportamiento de hoy.

---

## 13. Abierto (no bloquea la construcción)

- Textos finales de los extremos de cada eje y de los vocabularios: el agente hace el borrador e Igor lo revisa (F2).
- `DECIDE_MODE`: `fixed` o `adaptive`, lo deciden las métricas.
- Si el globo del 💬 al mantener pulsado molesta al swipe en móviles reales, se cambia por un toque en la burbuja (abre la ficha en los comentarios).
- Permiso de GroupLens para calibrar con Tag Genome (opcional; ver IDEA §7b.1).
