# TAREAS_MOTOR_V2 — Encargo para Gemini: el cerebro, los tres motores y la metadata al máximo nivel

> **Para quién:** Gemini (Antigravity). Escrito por Claude el 21/10/2026 a partir de la revisión de tu trabajo del 20/10 y de las decisiones de Igor.
> **Especificación:** `docs/MOTOR.md` §2b, **§2c (el cerebro)** y §8.4 (v2). Este documento dice **qué hacer, en qué orden y cómo se comprueba**. Si algo de aquí choca con MOTOR §2b, manda MOTOR §2b; avisa a Igor del choque.
> **Objetivo de Igor:** cero fricción, los mejores motores que existan y la ficha de obra con más metadatos que exista. Se itera lo que haga falta, pero **cada iteración se mide**.

---

## 0. Antes de empezar

### 0.1 Lee, en este orden
1. `PROJECT_CONTEXT.md` (sobre todo **Reglas**: han cambiado el 21/10).
2. `docs/MOTOR.md` §0, §2b y **§2c (el cerebro)** enteros, §7, §8 (con el §8.4 nuevo), §10.
3. `docs/ENRIQUECIMIENTO.md` §5b (modo agente) y E1-E11, con el aviso de su cabecera.
4. Este documento entero.

### 0.2 Prohibido
- **Inventar números.** Ningún `popularity`, `voteAvg`, `voteCount`, `notoriety`… escrito a mano. Todo valor sale de una fuente o del registro de atributos con `src` y `conf`.
- **Editar `seed.json` a mano o con un script que no forme parte de `npm run seed` / `npm run engine`.** Lo que no está en la cadena se pierde al regenerar.
- **Enlazar imágenes de webs ajenas.** Se descargan y se alojan nosotros (T1).
- **Detectar idioma, país o «traducido» con expresiones regulares sobre el título.**
- **Umbrales absolutos sobre popularidad o R.** Siempre percentiles dentro de la estantería.
- **Desplegar**, **gastar dinero en APIs** o **tocar Supabase** (tablas, buckets, `biblio_catalog`) sin el OK de Igor en el chat.

### 0.3 Cómo se trabaja
- Una tarea = un commit (o varios si es grande), con mensaje en español como los del repo (`feat(motor): …`, `fix(catalogo): …`).
- Al acabar cada tarea: `npm run build` sin errores, `npm test` en verde y `npm run engine:coverage` actualizado. Apunta en `PROJECT_CONTEXT.md` (Estado) una línea con lo hecho.
- **Tests con moderación** (regla de Igor): solo donde un error rompe datos (fusión del seed, alias, registro de atributos, importación de valores del LLM). En lógica de motor, 2-3 tests de comportamiento, no más.
- Todos los números nuevos van a `app/src/lib/engine/params.ts` y cualquier cambio de motor sube `ENGINE_VERSION`.
- Si una tarea no se puede cumplir como está escrita, **para y pregunta a Igor**; no improvises una alternativa.

### 0.4 Por qué se rehace parte de lo del 20/10 (resumen de la revisión)
| Lo que se hizo | Problema | Dónde se arregla |
|---|---|---|
| `enrich-catalogo-es.mjs` escribe `seed.json` directamente | no está en `npm run seed`: se pierde al regenerar | T2 |
| Obras nuevas con `popularity` 88-94, `voteAvg` y `voteCount` puestos a mano | números inventados; inflan los tres motores (394 de 395 artistas ≥ 88) | T2, T3 |
| Portadas de Goodreads/Amazon enlazadas | devuelven 403: se ven rotas | T1 |
| Obras nuevas sin `wikidataId`/`olid` | los imports no las encuentran | T2 |
| Duplicados borrados sin alias | las entradas guardadas con esos ids se quedan huérfanas | T2 |
| Traducciones de títulos sin comprobar | p. ej. «The Psychology of Money → Cómo piensan los ricos» parece mal (la edición española sería «La psicología del dinero») | T2 |
| Idioma por regex del título | «A sangre fría» se toma por inglés y se penaliza ×0.45 | T3, T8 |
| Umbrales absolutos (`recog ≥ 0.65`, `pop ≥ 90`) | significan cosas distintas en cada estantería | T8, T9 |
| `top 80` fijo de orientadores | salen siempre los mismos | T9 |
| «Descartada» = R 0.85 | «no me interesa» no significa «la conozco» | T8 |
| `geoEraBoost` en el `prior` de la propuesta | mezcla reconocibilidad con lo que te va a gustar | T9 |
| Ventana generacional definida 4 veces (12-25, 10-35, 12-35…) | incoherente | T8 |
| Fórmulas de MOTOR §2b con LaTeX roto | ilegibles | ya reescrito por Claude |

**Se conserva:** la idea de `calcRecognizability` (pasa a `recog.ts` con la fórmula nueva), la lista de obras españolas que añadiste (entra por T2 resolviendo sus ids), y el principio de que los orientadores deben ser muy reconocibles.

---

# Bloque A — Cimientos (datos y catálogo)

## T0 — Guardar lo del 20/10 y dejar `main` limpio · ⛔ necesita OK de Igor

**Por qué:** hay trabajo sin commit mezclado (docs revisados por Claude + código y seed tuyos). Si alguien ejecuta `npm run seed`, el seed se pierde.

1. Con el OK de Igor, en `main`: commit **solo** de la documentación (`PROJECT_CONTEXT.md`, `docs/`), mensaje `docs(motor): motor v2, registro de atributos y encargo para Gemini`.
2. Crea la rama `wip/gemini-20oct` y haz commit allí de `app/src/data/seed.json`, `app/src/lib/engine/decide.ts`, `decide.test.ts` y `app/scripts/enrich-catalogo-es.mjs`. **No se fusiona**: es la referencia para T2 y T8.
3. Vuelve a `main`; comprueba que esos archivos están como en el último commit de `main` (`git status` limpio salvo `supabase/.temp/`).
4. Añade `supabase/.temp/` a `.gitignore`.

**Hecho cuando:** `git status` en `main` está limpio y la rama `wip/gemini-20oct` existe con tus cambios.

---

## T1 — Portadas: raspado permitido, imágenes alojadas por nosotros

**Por qué:** Igor permite raspar portadas hasta tener algo mejor, pero los enlaces en caliente se rompen (403) y no se pueden sustituir de forma controlada.

1. **Bucket** · ⛔ OK de Igor: migración nueva `supabase/migrations/00XX_biblio_covers.sql`, siguiendo `0003_biblio_avatars.sql`: bucket `biblio-covers`, público en lectura, escritura solo con service role. Antes, mira el uso de Storage del proyecto (lo comparte con SEDAE y Riftbound) y dile a Igor cuánto ocupará (≈ 4.400 portadas × ~35 KB ≈ 150 MB).
2. **Script** `app/scripts/engine/covers.mjs` (y `npm run engine:covers`):
   - Para cada obra, busca la imagen en este orden y se queda con la primera que exista: imagen actual si ya está en el bucket → **la `posterUrl` actual si responde 200 (se descarga y se aloja tal cual: así no se pierde ninguna portada que Igor ya ve, como las ~500 de pelis)** → TVmaze (series) → Open Library (libros) → Wikidata P3383 «cartel» (pelis) → Wikidata P18 (juegos, artistas) → **raspadores** en `app/scripts/engine/scrapers/<fuente>.mjs` (uno por web, todos con la misma interfaz `findCover(item) → url | null`).
   - Respeta la memoria de Igor sobre portadas: **si la fuente tiene una imagen real, se usa aunque sea un logo**; la portada generada es solo para cuando no hay ninguna.
   - Descarga (≤ 1 petición/s por dominio, User-Agent propio, sin iniciar sesión), convierte a WebP de 342 px de ancho (y 154 px para miniaturas si la app lo usa), y sube a `biblio-covers/<type>/<slug>.webp`.
   - Caché en `app/scripts/cache/covers/` (hash de la URL de origen) para no repetir descargas.
   - Escribe en el registro de atributos (T3) los valores `posterUrl` (URL pública del bucket), `imageSrc` (dominio de origen) e `imageCredit` (si la fuente lo pide).
3. `purge-source.mjs <dominio>` debe poder quitar las imágenes de un dominio y volver a buscar.

**Hecho cuando:**
- ninguna `posterUrl` del seed apunta fuera del bucket (comando: un `node -e` que cuente dominios y salga con error si hay otros);
- ≥ 95 % de obras con portada en cada estantería (las que no, con portada generada);
- 50 URLs al azar devuelven 200;
- en el móvil, Descubrir y la ficha cargan las portadas.

---

## T2 — Catálogo durable: tu script entra en la cadena

**Por qué:** que lo que añadas al catálogo sobreviva a `npm run seed` y tenga ids reales.

0. **Primero, que la cadena no borre lo que ya hay.** Hoy `npm run seed` es `build-seed → localize-titles → dedupe-twins`; `build-seed` regenera desde cero (y con `--fast` deja las portadas a `null`), y el 85 % de `wikidataId`, votos y keywords de pelis y series vino de `engine:build`, que **no** está en la cadena. Así que:
   1. guarda la tabla de `npm run engine:coverage` y una copia de `seed.json` en `app/scripts/cache/seed-antes-T2.json` (no se versiona);
   2. mete `engine:build` (y, cuando exista, `engine:covers`) en `npm run seed`, después de `build-seed`;
   3. ejecuta `npm run seed` y vuelve a medir. **Cualquier campo que baje** es un fallo de la cadena y se arregla antes de seguir (normalmente: `build-seed` debe partir de las cachés de `scripts/cache/sources/`, no de la red).
1. **Traducciones** → a la caché de `localize-titles.mjs`, ampliándola a libros: `app/scripts/cache/titles/es-book.json`, mismo formato que `es-movie.json`. **Cada título se comprueba** con la etiqueta `@es` de Wikidata o con una edición española de Open Library; los que no coincidan van a `app/scripts/cache/titles/revisar-es-book.md` con la propuesta y lo encontrado, para Igor.
2. **Duplicados** → por `dedupe-twins.mjs`, que deja alias en `aliases.json`. Si no comparten `wikidataId`, añade los pares a mano en `app/scripts/cache/twins-manual.json` (nuevo; `dedupe-twins.mjs` lo lee). Ojo: los gemelos de tu lista existen con otros ids (`book:el-arte-de-la-guerra--500`, `book:el-principe-1532`, `book:el-retrato-de-dorian-gray-1890`).
3. **Obras nuevas** → `app/scripts/cache/additions/<shelf>.json` con **solo identidad**: `type`, `title`, `year`, `creator` y, si lo sabes, `wikidataId`/`olid`/`mbid`. El build las resuelve contra Wikidata/Open Library/MusicBrainz y les pone sinopsis, géneros, etc. **Sin popularidad ni notas**: las calcula T3. Las que no se puedan resolver van a `additions/sin-resolver.md` para Igor.
4. Mete el paso en `npm run seed` (después de `build-seed`, antes de `localize-titles`).
5. Borra `enrich-catalogo-es.mjs` de `main` (queda en la rama de T0).
6. **Catálogo vivo** · ⛔ OK de Igor: sube los cambios a `biblio_catalog` con `catalog-upload.mjs`.

**Hecho cuando:**
- `npm run seed` dos veces seguidas → la segunda no cambia nada (`git diff --stat` vacío);
- ningún campo de la tabla de cobertura ha bajado respecto a la medida del paso 0;
- cada estantería tiene ≥ 400 obras (artistas: completar hasta 400 con artistas resueltos en MusicBrainz, priorizando los que tienen más visitas en la Wikipedia en español);
- `seed.json` no crece más de un 10 % (hoy 5,4 MB): `src`/`conf` por campo y los mapas de otros mercados se quedan en `scripts/cache/`; al seed solo va lo que lee la app;
- ninguna obra nueva sin id externo, salvo las de `sin-resolver.md`;
- `aliases.test.ts` en verde y un test nuevo que compruebe que los ids eliminados por duplicado resuelven a su gemela.

---

## T3 — Registro de atributos y datos base que faltan

**Por qué:** es la base de «la ficha con más metadatos que exista». Cada dato nuevo será una entrada en una tabla y un comando, y los huecos se ven solos (MOTOR §2b.2).

1. **Infraestructura**:
   - `app/scripts/engine/attrs.mjs`: el registro `ATTRS` (MOTOR §2b.2), empezando por los atributos de la tabla de abajo.
   - `app/scripts/cache/attrs/<atributo>.jsonl`: valores con `id`, `value`, `src`, `conf`, `evidence?`, `at`.
   - `app/scripts/engine/fill-attr.mjs --attr X --shelf Y --mode agent|api|search|import [--sample N]`: modos de MOTOR §2b.2, con validación por tipo, rango, enum y `evidence` obligatorio cuando `needsEvidence`.
   - El build (`scripts/engine/build.mjs`, ya dentro de `npm run seed` desde T2) fusiona por orden de fuente (dura > raspado > `llm-search` > `llm-infer`), rellena `Item.src` y `Item.conf`, y recorta los mapas por país al mercado activo (`ES`).
   - `coverage.mjs`: añade la tabla **«Huecos»** (atributo · estantería · cobertura · objetivo · comando para rellenarlo), leyendo `minCoverage`.
   - `types.ts`: añade a `Item` los campos de MOTOR §2b.1 que falten (`titles`, `originalLanguage`, `popPct`, `notoriety`, `trend`, `isCanon`, `schoolReading`, `pageviews`, `conf`). Todos opcionales.
   - Tests (zona de riesgo de datos): la fusión respeta el orden de fuentes, un `llm-infer` nunca pisa un dato duro y el import rechaza valores fuera de esquema o sin prueba.
2. **Rellenar**, por este orden:

| Atributo | Estanterías | Fuente dura | Si falta | Objetivo |
|---|---|---|---|---|
| `wikidataId` (libros, hoy 19 %) | libros | Open Library → Wikidata por P648 (id de OL); después por ISBN (P212/P957) | `llm-search` con prueba | ≥ 60 % (sin él no hay visitas de Wikipedia ni notoriedad fiable en libros) |
| `originalLanguage` | pelis, series, libros, artistas | Wikidata P364 (obras), P407 (libros), P1412/P103 (artistas); MusicBrainz | `llm-infer` | ≥ 95 % |
| `originCountry` | todas | Wikidata P495; libros: P27 del autor; artistas: área de MusicBrainz; juegos: P495 o país del diseñador | `llm-infer` | ≥ 90 % |
| `titles.es-ES` | pelis, series, libros, juegos | Wikidata label@es; edición española de OL | `llm-search` con prueba | ≥ 90 % (si no hay título español, se marca «igual que el original») |
| `pageviews` (es, en, 12 meses) | todas | API REST de visitas de Wikimedia (`/metrics/pageviews/per-article/…/monthly`) a partir de los sitelinks | — | ≥ 85 % de las que tienen `wikidataId` |
| `popPct` | todas | se calcula (MOTOR §2b.4): percentil de visitas (todas las lenguas) + votos/lectores + `wikiLangs` | — | 100 % |
| `isCanon` | todas | listas de canon (Wikidata, listas raspadas) | `llm-infer` | 100 % |
| `notoriety.ES` | todas | se calcula (MOTOR §2b.4) con visitas en es, `local`, listas raspadas y `llm` | la parte `llm` es `llm-infer` | 100 % |
| `trend.ES` | todas | visitas en es de los últimos 30 días / media de 12 meses (tope 1) | — | ≥ 85 %; se refresca cada semana |

   - Comprueba los números de propiedad de Wikidata antes de usarlos: están escritos de memoria.
   - **Calibración** antes de cada lote con LLM (MOTOR §2b.2): muestra de 50 obras que ya tengan el dato duro; si no llega al 90 % de acierto, no se lanza y se avisa a Igor.
   - La parte `llm` de `notoriety`: `--sample 30` por estantería → Igor la revisa → lote completo.
3. `popularity` deja de usarse en los motores (se queda en la ficha por compatibilidad). Los motores leen `popPct`.

**Hecho cuando:** los objetivos de la tabla se cumplen en `engine:coverage`, la tabla «Huecos» solo lista lo que de verdad falta, y en la ficha de 10 obras al azar `src`/`conf` cuadran con su origen.

---

# ⚠️ URGENTE (21/10/2026, Igor probó la app) — hacer antes de seguir con T5

## T2b — Fichas enlazadas a la cosa equivocada de Wikidata

**Qué pasa:** muchas obras apuntan a un elemento de Wikidata que no es la obra: el juego *Earth* apunta al planeta Tierra (Q2) y enseña su foto y su descripción; *Orléans*, *Lisboa*, *Concordia*, *Maracaibo* apuntan a ciudades; *Barrage* a una presa; la serie *Chernóbil* a la ciudad; la peli *La La Land* a Los Ángeles (Q65). Todo lo que cuelga de ese id (sinopsis, portada, visitas, notoriedad, idioma, país) es basura y envenena el cerebro.

**Medido** con `app/scripts/engine/check-wikidata-type.mjs` (comprueba con SPARQL que el id sea instancia, directa o por subclase, del tipo de su categoría: peli Q11424; serie Q5398426/Q526877/Q1259759; libro Q47461344/Q7725634/Q571; juego Q11410; artista Q5/Q2088357/Q215380). Lista completa en `app/scripts/cache/wikidata-tipo-equivocado.json`:

| Categoría | Mal enlazadas |
|---|---|
| Juegos | **213 / 705** |
| Series | 155 / 865 |
| Pelis | 52 / 803 |
| Libros | 213 / 442 (muchos apuntan a una **edición** concreta en vez de a la obra: también hay que corregirlos, porque las ediciones no tienen artículos ni visitas) |
| Artistas | 8 / 400 (*Dover* → la ciudad, *Cupido* → el dios) |

**Arreglo:**
1. Mete la comprobación de tipo **dentro del resolutor** (E1): un candidato de Wikidata solo se acepta si es del tipo de su categoría. En libros, si el candidato es una edición (P31 = Q3331189), se sube a la obra con P629 («edición de»).
2. Para cada obra de la lista: borra el `wikidataId` y **todo lo que vino de él** (los campos con `src` = `wikidata`/`wikipedia`/`wikimedia`: sinopsis, portada, visitas, `wikiLangs`, país, idioma, premios, notoriedad) y vuelve a resolver con el filtro de tipo. Lo que no se resuelva queda sin id y va a `sin-resolver.md`; su sinopsis y portada salen de otra fuente o de la ficha del LLM (T5).
3. `coverage.mjs` ejecuta la comprobación y **falla si hay alguna** mal enlazada.

**Hecho cuando:** `check-wikidata-type.mjs` da 0 en todas las categorías y la ficha de *Earth* enseña el juego.

## T2c — Faltan los clásicos que conoce todo el mundo

**Qué pasa:** en Decidir, Igor no reconoce casi ningún orientador de juegos ni de series. Dos causas:
- **El catálogo de juegos es de jugones**: la popularidad viene de la comunidad de BGG (*Brass*, *Ark Nova*, *Gloomhaven* arriba). *Monopoly* tiene 50 y *Catan* 69; **no existen** Tabú, Trivial Pursuit, Parchís, Cluedo, Pictionary, Jenga, Dobble, Jungle Speed, Virus!, ajedrez, damas, dominó, la oca, Hundir la flota, Conecta 4, Party & Co, Scattergories, Hotel, Mikado… Y los que hay están en inglés (*Ticket to Ride* en vez de *¡Aventureros al tren!*).
- **Las series vienen de un volcado de TVmaze de ~2010-2015** con popularidad 95 para casi todo (*Helix*, *Bitten*, *Continuum* empatadas con *Breaking Bad*).

**Arreglo:**
1. Juegos: añade por `additions/boardgame.json` (T2) los **~150 juegos de mesa más conocidos en España por el público general** (de familia, de fiesta, clásicos de toda la vida y los «de tienda» de gran consumo: los de arriba, más UNO, Monopoly, Risk, Scrabble, Dixit, Carcassonne, Catan, Código Secreto, Exploding Kittens, Time's Up, Story Cubes, Bang!, Saboteur, Virus!, Sushi Go…). Fuente de la lista: listas raspadas de los más vendidos en España (jugueterías y grandes superficies) más el LLM con búsqueda para completar. Títulos en español (`titles.es-ES`) para todos.
2. Series: añade las ~200 series más vistas en España de cada época (TV abierta española y plataformas), igual por `additions/series.json`.
3. Hasta que la reconocibilidad (R) de T8 use la notoriedad, **el resultado no cambiará en Decidir**. Además, el código actual saca los orientadores **de fuera del pool**, y el pool se queda con las 300 mejores, así que los orientadores son justo las menos conocidas. Por eso **adelanta T8 y la parte de orientadores de T9** (elegibles incluido el pool, sorteo con papeletas por R) en cuanto acabe T2b, sin esperar al bloque B.

**Hecho cuando:** en Decidir con un perfil nuevo, de 10 duelos de juegos y 10 de series, Igor reconoce al menos una de las dos obras en 9 de cada 10.

---

# Bloque B — El cerebro (MOTOR §2c)

> Lo más importante del encargo. Antes era «rellenar ejes»; ahora es construir un espacio único de contenido + comportamiento que aprende (decisión de Igor, 21/10/2026). **Lee MOTOR §2c entero antes de empezar.**
> Scripts nuevos en `app/scripts/brain/`. Si node2vec/item2vec va mejor en Python (`gensim`), se permite un `requirements.txt` ahí; si Python no está instalado, pídeselo a Igor.

## T4 — Evaluación con usuarios de prueba (va primero: es la línea base)

**Por qué:** sin una forma de medir, no sabremos si el cerebro mejora. Se construye antes de tocar nada.

1. `app/scripts/brain/test-users.mjs`: raspa ~2.000 perfiles públicos (≈ 1.000 de Letterboxd, ≈ 1.000 de Goodreads) con sus vistas, notas y fechas. Guarda solo un id interno anónimo (`u0001`…), nunca el nombre. Cruza las obras con nuestro catálogo por título + año + creador (y Wikidata cuando se pueda); descarta los perfiles con < 30 obras nuestras.
   - Archivo: `app/scripts/cache/eval/test-users.jsonl` (**no se versiona**; va a `.gitignore`).
   - Estos perfiles **no se usan para construir el grafo** de T6 (lista de exclusión compartida).
2. `app/scripts/brain/eval-brain.mjs` (`npm run brain:eval`): MOTOR §2c.6. Por cada usuario esconde el 20 % más reciente y mide recall@50, NDCG@50, hit@5 (con el simulador de §8.11) y AUC de R. Imprime una tabla por estantería y la añade a `app/scripts/cache/eval/historico.md` con fecha, `ENGINE_VERSION` y una nota.
3. Ejecuta la **línea base** con el sistema actual (vectores solo de texto).

**Hecho cuando:** `npm run brain:eval` saca la tabla de la línea base para pelis y libros (las demás estanterías, si hay perfiles; si no, se apuntan como «sin usuarios de prueba»).

---

## T5 — Capa 1: ficha de experiencia, ejes, temas y momentos

**Por qué:** hoy el 100 % de los ejes vale 3 y `conf = 0`. Los vectores son solo de la sinopsis. La ficha de experiencia da al espacio los matices que faltan (MOTOR §2c.1).

1. Amplía el esquema de `llm.mjs`: **una sola salida** por obra con la ficha de experiencia (6 apartados de MOTOR §2c.1, ≤ 1.200 caracteres), ejes, temas, momentos, `oneLiner` y `confidence`. Validador de §5.5 más: ficha con los 6 apartados, sin spoilers marcados, obras comparadas con nombre.
2. Contexto de entrada: E5 (`scripts/cache/context/`). **Nunca de memoria**: si el contexto es pobre, `confidence: 'baja'`.
3. **Muestra** · ⛔ revisión de Igor: 20 obras por estantería (100), en dos versiones: modo agente (tú) y, si Igor lo autoriza, por API con Haiku 5.5 y Sonnet 5.5. Tabla `app/scripts/cache/llm/sample.md` con las versiones lado a lado. Igor elige quién hace el lote.
4. Lote completo, una estantería por sesión, con la prueba de deriva de ENRIQUECIMIENTO §5b.3.
5. `embContent`: `vectors.mjs` vectoriza **ficha de experiencia + temas + momentos** (no la sinopsis sola). Guarda el vector completo en `app/scripts/cache/vectors/content/`.
6. Vecinos con LLM (E8, modo agente o API), eligiendo solo de las candidatas exportadas: dan el **motivo** en texto.
7. Rehaz los artefactos para los ids **actuales** del seed (faltan las obras añadidas después del 16/10).
8. `npm run brain:eval` → apunta el resultado.

**Hecho cuando:**
- ningún eje tiene más del 60 % de valores en 3; `conf: 'baja'` ≤ 15 % por estantería;
- QA de parejas (MOTOR §5.7) ≥ 85 % en ejes;
- los `ids` de cada `engine/<shelf>.json` coinciden con el seed;
- `brain:eval` mejora la línea base de T4 (si no mejora, para y avisa a Igor antes de seguir).

---

## T6 — Capa 2: grafo de co-consumo (comportamiento prestado)

**Por qué:** es lo que convierte esto en aprendizaje de verdad: «quien vio A también vio B» (MOTOR §2c.2). **Empieza el raspado cuanto antes**: tarda días y corre en segundo plano mientras haces T5.

1. **Clickstream de Wikipedia**: `app/scripts/brain/clickstream.mjs` descarga los dumps mensuales (es y en; últimos 6 meses), cruza artículos con nuestras obras por los sitelinks de Wikidata y escribe `cache/graph/cooc-wikiclick.jsonl` (`a`, `b`, `n`).
2. **Raspadores de listas** en `app/scripts/brain/scrapers/` (uno por web, misma interfaz): Letterboxd (listas), Goodreads (Listopia y estanterías), BGG (colecciones y «fans also like»), Last.fm («similar artists»).
   - ⛔ Antes de lanzar cada uno, Igor aprueba la web y el volumen (README en esa carpeta con la estimación de peticiones y días).
   - ≤ 1 petición/s por dominio, User-Agent propio, caché y reanudable; sin iniciar sesión.
   - **Solo recuentos agregados**: nunca se guarda quién hizo la lista.
   - Excluye los perfiles de prueba de T4.
3. Peso de cada arista: **PMI positivo** por fuente; luego se combinan las fuentes en `cache/graph/cooc.jsonl` con un peso por fuente (en `params`, ajustado con `brain:eval`).
4. Obras de las listas que no están en el catálogo → `outside.json`, ordenadas por número de conexiones (candidatas para ampliar el catálogo; Igor decide).
5. `embBehavior`: node2vec / item2vec sobre `cooc.jsonl` → `cache/vectors/behavior/`.
6. Informe `cache/graph/report.md`: aristas por fuente y estantería, % de obras con ≥ 10 conexiones, y los 10 vecinos por comportamiento de 20 obras conocidas (para revisar a ojo).

**Hecho cuando:** ≥ 70 % de las pelis y libros y ≥ 50 % de juegos y artistas tienen ≥ 10 aristas de comportamiento, y el informe está revisado por Igor.

---

## T7 — Capa 3: fusión en el espacio único

1. `app/scripts/brain/fuse.mjs`: `vec = normalizar(α·embContent ⊕ β·embBehavior ⊕ γ·embRelaciones)` con β según el soporte de cada obra (MOTOR §2c.3). `embRelaciones` = node2vec sobre las aristas duras de E4.
2. Búsqueda de α, β_max, γ y de los pesos por fuente de T6 con `brain:eval` (rejilla pequeña); se queda la mejor combinación y se apunta en `params.ts` y en `historico.md`.
3. `merge.mjs` usa `vec` para PCA (48-64 dimensiones), `nn`, `macro`/`micro`, `cross.json` y `sim()`.
4. `ENGINE_VERSION = 'm2.0-brain'`.

**Hecho cuando:** `brain:eval` mejora la línea base de T4 en ≥ 30 % de recall@50 en pelis y libros (si no llega, apunta lo conseguido y avisa a Igor), y los `engine/<shelf>.json` caben en ≤ 400 KB por estantería.

---

# Bloque C — Los tres motores sobre el cerebro

## T8 — Motor R: `lib/engine/recog.ts`

**Por qué:** una sola reconocibilidad para los duelos y para el cupo `seen_likely` del mazo, basada en datos y que aprende sin preguntar.

1. Módulo puro nuevo `app/src/lib/engine/recog.ts` con:
   - `recog(item, ctx)` exactamente como MOTOR §2b.4 (vista = 1, pendiente = 0.9, descartada no cuenta; `base` = `notoriety[country]`; `era`; `zona`; `social`);
   - `inferBirthYear(entries, items)` (MOTOR §2b.3); el `birthYear` declarado manda;
   - `eraFactor(year, birthYear, item)` leyendo `PARAMS.ERA_WINDOW`.
2. `params.ts`: `ERA_WINDOW`, `ERA_MEDIAN_AGE`, `R_W`, `NOTORIETY_W` (MOTOR §10). **Quita** las otras definiciones de la ventana: `lib/engine/deck.ts` (12-25), `lib/deck.ts` y `decide.ts` (10-35 y 12-35).
3. `deckLearn[shelf]` en el store (persistido; es el de MOTOR §7.6, que aún no existe en el código): por `macro` y década, `shown` y `seen` del mazo, con decaimiento ×0.8 al empezar sesión. Lo actualiza la acción de swipe, no el motor. Lo usan `adapt` del mazo, `zona` de R e `inferBirthYear` (que trabaja con la **tasa** por década, no con los años de lo visto: MOTOR §2b.3).
4. Borra `calcRecognizability` de `decide.ts` y todas las regex de idioma.
5. Tests (2-3): arranque en frío ordena antes una obra muy notoria en España de la época del usuario que una extranjera poco notoria; vista = 1; `inferBirthYear` da un año razonable con un historial de ejemplo.

**Hecho cuando:** `recog.ts` es la única fuente de R, no queda ninguna regex sobre títulos en `lib/`, y `npm test` pasa.

---

## T9 — Decidir: duelos, pool que se re-muestrea y propuesta

1. **Orientadores** según MOTOR §8.4 (v2):
   - elegibles = toda la estantería sin las enseñadas en la sesión (**incluido el `pool`**); se borra la «salvaguarda» de < 15;
   - suelo por percentil (`ORIENTER_R_PCT`, `ORIENTER_MIN`);
   - sorteo de parejas con papeletas ∝ `(R_a·R_b)^ORIENTER_K` (sin `slice(0, 80)`);
   - rotación entre sesiones (`ORIENTER_ROTATION`), guardando en el store los orientadores de las últimas 3 sesiones por estantería.
2. **Espacio único:** `pref` arranca en el vector de usuario `u` (T11; mientras no exista, en el centroide de tu top 20 %) y se mueve con los duelos sobre `vec`.
3. **Re-muestreo del pool** (MOTOR §2c.5): tras el 3.er duelo y en cada «Seguir buscando», vuelve a elegir en **todo el catálogo** las 300 más cercanas a `pref` que pasen los filtros, conservando la probabilidad de las que ya estaban.
4. **Parada adaptativa:** implementa `DECIDE_MODE = 'adaptive'` (§8.7) y deja `fixed` por defecto; `/metricas` compara las dos.
5. **Propuesta** (MOTOR §2b.5): quita `geoEraBoost` del `prior`; añade `TREND_BOOST·trend[país]` al `boost`.
6. **Evento**: `dec_duel` guarda `ms` (tiempo desde que aparece la pareja hasta que elige).
7. Actualiza `decide.test.ts`: quita el test de `calcRecognizability`; añade uno que compruebe que con la estantería de artistas siempre hay pareja.

**Hecho cuando:** 10 sesiones de Decidir por estantería en el móvil (guardadas en `app/scripts/cache/vec/decide-samples.md`) muestran orientadores que Igor reconoce y duelos `fine` «del mismo tipo»; el hit@5 de `brain:eval` mejora al de T7.

---

## T10 — Descubrir

1. `seen_likely` = `recog(item) · adapt` (MOTOR §2b.6), con el 5 % de plataforma.
2. `taste` = `cos(u, vec)` y `novelty` sobre el espacio único (MOTOR §2c.5).
3. `explore` y `friend_gem` con `popPct`; **exploración por muestreo de Thompson** en `explore` y en el 10 % de `social` (MOTOR §2c.4), con su estado en `deckLearn`.
4. `deck_shown` guarda `r` (el R de la tarjeta) y `s` (la puntuación del ranker).

**Hecho cuando:** con un perfil nuevo (sin nada), las 20 primeras tarjetas de cada estantería son reconocibles para alguien de España de la edad del perfil (revisión de Igor), y el recall@50 de `brain:eval` mejora al de T7.

---

## T11 — Capa 4: vector de usuario, modelo que aprende a ordenar y medición

1. **Vector de usuario** `u` por estantería (MOTOR §2c.4): `lib/engine/userVec.ts` (puro) con los pesos por acción y el decaimiento; el store lo recalcula en cada acción y lo persiste. ⛔ Con OK de Igor, migración de Supabase para guardarlo (`biblio_profiles` o tabla nueva).
2. **Ranker** `lib/engine/ranker.ts`: regresión logística por motor sobre las señales de MOTOR §2c.4, con los pesos a mano de partida en `params.ts`. R, A y D pasan a usarlo.
3. `scripts/engine/fit-ranker.mjs`: con los eventos exportados (≥ 2.000 por objetivo), reentrena y escribe un informe comparando los pesos a mano con los ajustados (AUC y `brain:eval`). **No cambia `params.ts` solo**: propone y Igor decide.
4. `metrics.ts` y `/metricas`: AUC de R (`deck_shown.r` vs `deck_swipe`), % de «la vi» en las 20 primeras tarjetas de sesiones nuevas, mediana de `dec_duel.ms`, abandono en duelos, y las métricas de §3.2; todo por `ENGINE_VERSION` y estantería.

**Hecho cuando:** `u` se actualiza al usar la app y sobrevive a recargar, los tres motores leen el ranker, `fit-ranker.mjs` funciona con eventos de ejemplo y `/metricas` enseña las métricas nuevas.

---

# Bloque D — Más metadatos (prioridad más baja: sirven para filtros y R, no para el gusto)

## T12 — Piloto de atributo «de búsqueda» de punta a punta

**Por qué:** demostrar que añadir un dato nuevo es una entrada en `ATTRS` y un comando, como pidió Igor («si mañana queremos saber si una peli estuvo más de un mes en cines…»).

- Atributo `schoolReading.ES` (libros que se leen en los institutos españoles). Útil para R: casi todo el mundo los reconoce.
- **Se raspan listas** (de lecturas de la ESO y Bachillerato), no se busca obra a obra: una lista cubre cientos de libros. Lo que no salga en ninguna lista, `false` con `src: 'scrape:listas'`.
- `fill-attr.mjs --attr schoolReading --shelf book --mode search --sample 30` solo para los dudosos → Igor revisa las 30 con su prueba → build → `recog` lo usa (MOTOR §2b.4, `era`).

**Hecho cuando:** el atributo está al 100 % en libros, cada `true` tiene `evidence`, y la tabla «Huecos» lo da por cubierto.

## T13 — Atributos nuevos por categoría (al registro, cuando acabe el bloque B)
Cada uno es una entrada en `ATTRS` y se rellena con `fill-attr.mjs`, **raspando listas antes que buscando obra a obra**:

| Categoría | Atributos | Para qué |
|---|---|---|
| Pelis | taquilla en España y semanas en cines (listas semanales de taquilla), reparto principal (Wikidata P161), edad recomendada, `providers.ES` | R, filtros de Decidir |
| Series | temporadas, episodios, duración del episodio, estado (TVmaze, gratis y sin clave: **hueco más fácil**); cadena original y si se emitió en TV abierta española | filtros, R |
| Libros | premios españoles (Planeta, Nadal…), si tiene adaptación (aristas `adapt`), saga y orden de lectura, horas de lectura | R, filtros |
| Juegos | edad mínima, peso, cooperativo/competitivo, mecánicas, edición en español, Spiel des Jahres | filtros duros de Decidir, R |
| Artistas | **décadas de éxito** (no solo el año de debut), oyentes, idioma en que canta, números 1 en España | R (`era`), `popPct` |
| Usuario | plataformas deducidas de lo que ve (se confirman en Decidir), respuestas habituales de Decidir recordadas y preseleccionadas, si acepta versión original | cero fricción, A |

---

## Orden y puntos de control con Igor

| # | Tarea | Depende de | ⛔ Para y pregunta a Igor |
|---|---|---|---|
| T0 | Guardar lo del 20/10 | — | antes de los commits |
| T1 | Portadas alojadas | T0 y el paso 0 de T2 | bucket y espacio de Storage |
| T2 | Catálogo durable | T0 | `revisar-es-book.md`, `sin-resolver.md`, subir a `biblio_catalog` |
| T3 | Registro de atributos + datos base | T2 | muestras de LLM (`notoriety`, calibraciones fallidas) |
| **T4** | **Evaluación con usuarios de prueba (línea base)** | T2 | qué webs y cuántos perfiles |
| **T5** | **Capa 1: ficha de experiencia + ejes** | T2, T4 | muestra de 100 y quién hace el lote |
| **T6** | **Capa 2: grafo de co-consumo** | T2 (**arranca el raspado pronto**, en paralelo a T5) | cada web y su volumen; el informe |
| **T7** | **Capa 3: fusión** | T5, T6 | si no llega al +30 % |
| T8 | Motor R | T3 | — |
| T9 | Decidir | T7, T8 | prueba en el móvil |
| T10 | Descubrir | T7, T8 | prueba en el móvil |
| T11 | Vector de usuario, ranker y medición | T9, T10 | migración de Supabase; cambios de pesos de `fit-ranker` |
| T12 | Piloto `schoolReading` | T3 | muestra de 30 |
| T13 | Atributos nuevos | bloque B | qué listas raspar |

T1 puede ir en paralelo a T2-T7. Nada de esto se despliega sin el OK de Igor.

## Lo que queda abierto (no lo decidas tú)
- Qué webs raspar (portadas, listas, perfiles de prueba): propón una lista corta en el README de cada carpeta de raspadores y espera el OK.
- Qué LLM hace el lote de T5 (modo agente, Haiku o Sonnet): lo decide Igor con la muestra.
- Pesos finales de R, de la fusión y del ranker: los deciden `brain:eval` y las métricas de T11.
- Qué mercados abrir después de España: cuando Igor lo diga, se calcula `notoriety[país]`, `trend[país]` y `titles[locale]` para ese país (MOTOR §2b.4).
- Licencias: aparcadas hasta que funcione con usuarios (MOTOR §2c.8). Mantén siempre la procedencia para poder sustituir fuentes.

---

# ⚠️⚠️ URGENTE (21/10/2026, noche) — T14: recuperar los pósteres reales

**Hazla antes que cualquier otra cosa.** Igor ve pósteres que no son pósteres: *Seven* enseña un canal de televisión australiano, *Malditos bastardos* una foto de Tarantino, *Casablanca* un fotograma, *Infiltrados* y *Nightcrawler* un logo, *Apocalypse Now* y *Forrest Gump* fotos sueltas. En los duelos a pantalla completa queda fatal.

## Qué pasó (no lo repitas)
- Hasta el commit `a2fd1f2` la semilla tenía pósteres reales: **IMDb** (`m.media-amazon.com`) en 994 pelis, **TVmaze** en 984 series, **Open Library** en 956 libros, **BGG** (`cf.geekdo-images.com`) en 1014 juegos y **Deezer** en 259 artistas.
- El commit `1e74270` (16/10, «complete full catalog enrichment») los **sustituyó por la imagen principal de Wikidata (P18)**, que en una obra suele ser cualquier cosa: una foto del director, un fotograma, un logo o, si el id estaba mal enlazado, otra cosa entera.
- Después, T1 (`covers.mjs`) subió esas imágenes malas a `biblio-covers`, porque usaba la `posterUrl` actual como primera fuente y P18 como alternativa.

## Lo que ya está hecho (por Claude, sin commitear)
- `app/scripts/cache/posters/original.json`: **4207 pósteres originales** (id → URL) sacados de `a2fd1f2`. Es la fuente buena. **Versiónalo.**
- `app/scripts/engine/restore-posters.mjs`: descarga el original, lo pasa a WebP de **600 px de ancho** (los de 342 px se ven borrosos a pantalla completa), lo sube a `biblio-covers/<tipo>/<slug>.webp` sustituyendo la imagen mala, pone `posterUrl` con `?v=2` (para saltarse la caché), `imageSrc` y `src.posterUrl`, y reescribe la caché local de `covers.mjs`. Las que ya tienen `?v=2` las salta. Resuelve los alias de `aliases.json`.
- **Pelis: 846 de 934 ya recuperadas** (están en `seed.json`, sin commitear). Quedaron 78 fallidas por tiempo de espera de IMDb y 10 sin original.
- `covers.mjs` usa ya `original.json` como **primera fuente** (paso 0).

## Lo que tienes que hacer
1. **Commitea** primero lo de arriba (`seed.json`, `original.json`, `restore-posters.mjs`, `covers.mjs`) con el mensaje `fix(portadas): recuperar los pósteres originales (IMDb, TVmaze, OL, BGG, Deezer)`.
2. **El resto de categorías**, de una en una:
   ```
   cd app
   node --env-file-if-exists=.env.local scripts/engine/restore-posters.mjs --only series
   node --env-file-if-exists=.env.local scripts/engine/restore-posters.mjs --only book
   node --env-file-if-exists=.env.local scripts/engine/restore-posters.mjs --only boardgame
   node --env-file-if-exists=.env.local scripts/engine/restore-posters.mjs --only artist
   node --env-file-if-exists=.env.local scripts/engine/restore-posters.mjs --only movie   # reintenta las 78
   ```
   Si siguen fallando por tiempo, baja los hilos de 6 a 2 y sube el tiempo de espera de 15 s a 30 s en el script.
3. **Las que no tienen original** (fallidas definitivas y obras añadidas después del 16/10, como los clásicos de T2c). Prueba estas fuentes **en este orden** y quédate con la primera que pase el control del punto 4:
   - **Pelis:** Wikidata **P3383** («cartel de la película»), nunca P18 → página de IMDb del `imdbId` (Wikidata P345): la imagen de `og:image` → si no, portada generada.
   - **Series:** TVmaze por `tvmazeId` o por título + año (`image.original`) → IMDb `og:image` → generada.
   - **Libros:** Open Library por `olid` (`-L.jpg`) o por ISBN → generada.
   - **Juegos:** página de BGG del `bggId`: `og:image` (es la caja) → generada.
   - **Artistas:** Deezer (`api.deezer.com/search/artist?q=`, `picture_xl`) → Wikidata P18 (aquí sí vale: es una foto de la persona o del grupo) → generada.
   - **Prohibido usar Wikidata P18 en pelis, series, libros y juegos.**
4. **Control de forma.** Mide cada imagen con `sharp().metadata()` antes de subirla:
   - pelis, series y libros: **alto/ancho entre 1,3 y 1,65** (vertical, de póster o de portada);
   - juegos: entre 0,7 y 1,5 (las cajas pueden ser cuadradas);
   - artistas: cualquiera.

   Si no cumple, se descarta y se prueba la siguiente fuente. Añade este control a `restore-posters.mjs` **y** a `covers.mjs`, y aplícalo también a las 846 pelis ya subidas: las que no cumplan, vuelven a la cola.
5. **Script de comprobación** `app/scripts/engine/check-posters.mjs`. Por categoría debe informar de:
   - cuántas obras tienen póster alojado en `biblio-covers`, cuántas portada generada y cuántas siguen sin `?v=2`;
   - la lista de las que no cumplen la forma (debe salir **vacía**);
   - el póster de estas obras, que **tiene que ser el oficial y vertical**: *Seven*, *Apocalypse Now*, *Forrest Gump*, *Casablanca*, *Malditos bastardos*, *Nightcrawler*, *Infiltrados*, *El señor de los anillos: La comunidad del anillo*, *Interstellar*, *Matrix*, *El caballero oscuro*. Para cada una imprime la URL de origen (`src.posterUrl`) y su proporción.
6. Ejecuta `check-posters.mjs` y pega su salida en `app/scripts/cache/posters/report.md`.
7. **Catálogo vivo:** sube los cambios de `posterUrl` a `biblio_catalog` con `catalog-upload.mjs` (Igor lo autoriza para esta tarea).
8. Commit: `fix(portadas): T14 pósteres reales y verticales en todas las categorías`.

**Hecho cuando:**
- `check-posters.mjs` da 0 imágenes con forma incorrecta;
- las 11 obras de la lista tienen su póster oficial;
- en la app (Comparar → duelos a pantalla completa) ninguna sale apaisada ni con una foto que no sea la portada;
- `npm run seed` no vuelve a estropearlo: `covers.mjs` usa `original.json` primero y el control de forma.

---

# T15 — Conectar: base de datos y función del servidor (22/10/2026, OK de Igor)

**Contexto:** la página Conectar ya está escrita (código sin commitear de Claude): `app/src/screens/Connect.tsx`, `app/src/lib/connect/*`, `supabase/functions/biblio-connect/index.ts` y `supabase/migrations/0008_biblio_connections.sql`. Diseño en `docs/CONECTAR.md`. **Igor da el OK para tocar Supabase en esta tarea.**

1. **Commit** primero del código de Conectar y de los duelos que hay sin commitear (`App.tsx`, `Connect.tsx`, `ConnectSpotify.tsx`, `ImportFlowView.tsx`, `lib/import/useImportFlow.ts`, `lib/import/storygraph.ts`, `lib/connect/`, `Import.tsx`, `Settings.tsx`, `useEvents.ts`, `SwipePair.tsx`, `DuelVariants.tsx`, `Compare.tsx`, `WhatToWatch.tsx`, `PlaceFlow.tsx`, `supabase/functions/biblio-connect/`, `supabase/migrations/0008_biblio_connections.sql`, `docs/CONECTAR.md`, `CLAUDE.md`) en commits separados por tema. **Revisa antes la migración:** numeración correcta respecto a las que ya hay, RLS en las cuatro operaciones (cada usuario solo ve y toca las suyas) y que no rompa nada de lo existente.
2. **Ejecuta la migración** `0008_biblio_connections.sql` en el proyecto `pvewnpemlwmvaduzhjso` con el mismo método que usaste para las anteriores (token en la memoria de Igor: `SUPABASE_ACCESS_TOKEN`). Comprueba que la tabla existe y que las políticas RLS están activas.
3. **Despliega** la función `biblio-connect`, con verificación de JWT igual que `biblio-catalog`. Pruébala con `curl`:
   - `?service=letterboxd&user=<un usuario público real>` → devuelve filas con título, año, nota y fecha;
   - `?service=goodreads&user=<id numérico de un perfil público>` → devuelve libros de la estantería `read`;
   - un usuario que no existe → error claro, no un 500.
4. Si algo falla en la función (formato del RSS, CORS), arréglalo en `index.ts` y vuelve a desplegar.

**Hecho cuando:** la tabla existe con RLS, la función responde con datos reales en los dos servicios y todo está commiteado. No despliegues la app en Vercel sin el OK de Igor.

---

# T16 — Comparar: pantalla inicial y duelos que no se repiten

Encargo completo en **`docs/TAREA_T16_COMPARAR.md`** (22/10/2026). Hazla después de T15.

---

# T17 — Decidir: duelos con obras que conoces y que se distinguen, y R arreglada

Encargo completo en **`docs/TAREA_T17_DECIDIR.md`** (22/10/2026). **Empieza por T17.0 y la parte A (datos y R) antes que T16:** no dependen de nada y arreglan también el mazo de Descubrir. Las partes B y C, después de T16.

---

# T18 — Conectar: que funcionen las plataformas importantes

Encargo completo en **`docs/TAREA_T18_CONECTAR.md`** (23/10/2026). Va después de T17.

---

# T19 — Duelos solo con obras conocidas, portadas, «ranking completo» y portada final de Comparar

Encargo completo en **`docs/TAREA_T19_AJUSTES.md`** (23/10/2026). **Va antes que las partes B y C de T17** y las corrige.

---

# T20 — Cerrar todo lo pendiente, sin atajos

Encargo completo en **`docs/TAREA_T20_CIERRE.md`** (23/10/2026). **Es lo siguiente que toca.** Sustituye a lo que quedaba abierto de T17, T18 y T19.

---

# T21 — Etiquetas de sensación y temas reales, sin API

Encargo completo en **`docs/TAREA_T21_ETIQUETAS_Y_TEMAS.md`** (24/10/2026). **Es lo siguiente que toca.** Sustituye a T20.5.
