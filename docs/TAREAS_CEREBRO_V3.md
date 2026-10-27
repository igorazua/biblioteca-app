# Encargos del cerebro, v3 (27/10/2026)

> Lo que falta para que los motores funcionen al máximo sobre el espacio de vectores y grafo. Estado actual en
> `docs/MOTOR.md` §2c.9 y §8b. Cada tarea va a **Haiku, Sonnet o Gemini** (lo decide Igor; al lado va la recomendación).
> Se pueden lanzar en paralelo salvo donde se indica.

## Reglas comunes (para cualquier agente)

1. Lee antes `docs/MOTOR.md` §2c.9 y `PROJECT_CONTEXT.md`.
2. **No toques `app/src`** salvo que la tarea lo diga. **No hagas commits.** Nada de navegador ni revisiones visuales.
3. Ids: escribe siempre el id conservado (`app/src/data/aliases.json` mapea id antiguo → conservado).
4. **Raspado:** como mucho 1 petición por segundo por dominio, User-Agent `BibliotecaApp/1.0 (biblioteca-social.vercel.app)`,
   reintento con espera ante 429/503, caché por petición en `app/scripts/cache/graph/sources/<fuente>/` y reanudable.
   Sin iniciar sesión. **Solo recuentos agregados**, nunca quién hizo una lista.
5. Salida de una fuente de comportamiento: `app/scripts/cache/graph/cooc-<fuente>.jsonl`, una línea por par no
   ordenado (`a < b`): `{"a","b","source","n"}`. No se versiona.
6. **Medir siempre:** `cd app && PYTHONIOENCODING=utf-8 python scripts/brain/build_space.py --eval`. Pega en el informe
   las líneas de la estantería. Si mejora y el encargo lo dice, `--eval --write`.
7. Comprueba `npx tsc -p app/tsconfig.json --noEmit` y `cd app && npx vitest run src/lib/engine` si tocas código de la app.
8. Informe final: cobertura (obras con ≥ 1 y ≥ 10 aristas), 10 ejemplos legibles (título → 5 vecinos), dudas y cifras.

---

## C1 — Series: comportamiento desde JustWatch España y Trakt · ⛔ raspado: Igor aprueba · **Sonnet**

**Por qué:** series es la única estantería sin comportamiento real (solo clickstream: 0,2 % de las series con ≥ 10
aristas). Por eso está bloqueada en `scripts/brain/space-params.json` → `hold`.

**Fuentes (probadas el 27/10/2026):**
- **JustWatch España** — `https://www.justwatch.com/es/serie/<slug>` (200) trae el bloque «A las personas a las que les
  gustó {title} también les gustó» (`similarTitles`) y la API GraphQL pública `https://apis.justwatch.com/graphql` (200).
  Son **usuarios españoles**: lo más cercano al gusto de nuestra gente. Los objetos traen ids externos (tmdb/imdb) →
  cruce por `tmdbId` (706 de 966 series lo tienen) o `imdbId`; si no, por título + año.
- **Trakt** — `https://app.trakt.tv/shows/<slug>/related` (200, trae Better Call Saul en la de Breaking Bad).

**Volumen estimado:** unas 1.000 peticiones por fuente (~17 min cada una a 1/s). Pelis también (opcional, ver abajo).

**Pasos:**
1. `app/scripts/brain/sources/justwatch.mjs`: por cada serie, su ficha en JustWatch ES (por GraphQL si da los similares;
   si no, la página) → similares → cruce con el catálogo → `cooc-justwatch.jsonl` (`source: "justwatch-es"`, `n` según la
   posición en la lista: el primero vale más).
2. `app/scripts/brain/sources/trakt.mjs`: igual con «related» → `cooc-trakt.jsonl`.
3. Opcional, si sale bien: JustWatch ES también para **pelis** (mismo script con `--shelf movie`): añade gusto español
   encima de MovieLens.
4. Mide con `build_space.py --eval`. Si series mejora en enlaces escondidos **y** los vecinos a ojo de *Breaking Bad*,
   *La casa de papel*, *Merlí*, *Los Serrano*, *The Office* y *Juego de tronos* tienen sentido, quita `series` de `hold`
   en `space-params.json` y escribe (`--write`).

**Hecho cuando:** ≥ 60 % de las series con ≥ 10 aristas y vecinos razonables en esas 6; `hold` sin series.

---

## C2 — Series (y pelis): relaciones por metadatos · **Haiku**

**Por qué:** además del comportamiento, «misma gente detrás» (creador, guionistas, reparto principal, cadena) es una
buena señal de parecido, sobre todo para series españolas que no estarán en JustWatch con muchas conexiones.

**Fuentes (sin clave):**
- **TVmaze** — `https://api.tvmaze.com/lookup/shows?imdb=<tt>` o `/singlesearch/shows?q=<título>` para el id;
  `/shows/<id>/cast` y `/shows/<id>/crew` (probado: 200).
- **Wikidata** (SPARQL, por `wikidataId`, 854 de 966 series): creador (P170), guionista (P58), reparto (P161),
  cadena (P449), basada en (P144), ambientación (P840), tema principal (P921).

**Pasos:**
1. `app/scripts/brain/sources/tv-relations.mjs` → `app/scripts/cache/graph/edges-tv.jsonl` con
   `{"a","b","kind","w","src"}`: `kind` ∈ `creator` (w 1), `writer` (0,6), `cast` (0,3 por actor compartido, máx. 1,
   solo los 5 primeros del reparto), `network` (0,1, solo cadenas con < 40 series), `basedOn` (1), `setting` (0,3).
2. Que `build_space.py` lo lea igual que `edges.jsonl` (añade `edges-*.jsonl` en `behavior_edges` como fuente `relations`).
   Este es el único cambio de código permitido.
3. Mide con `--eval` (series y pelis) y apunta el resultado.

**Hecho cuando:** `edges-tv.jsonl` existe y se ha medido. No escribas motores (eso lo decide C1).

---

## C3 — Contenido en español: modelo de texto multilingüe · **Sonnet**

**Por qué:** los vectores de contenido salen de `all-MiniLM-L6-v2`, un modelo **inglés** sobre sinopsis en español.
Eso explica parte de los vecinos flojos de lo español. Es el arreglo más barato de la capa de contenido.

**Pasos:**
1. Comprueba que Hugging Face es accesible y que `@xenova/transformers` (ya en el proyecto) carga
   `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (384 d) o `Xenova/multilingual-e5-small`.
2. `app/scripts/engine/vectors.mjs --model <nombre> --out cache/vectors/content-ml/` (añade la opción; no borres lo actual).
3. `build_space.py --content-dir content-ml` (añade la opción) y compara con el actual en las 5 estanterías.
4. Si mejora con usuarios reales (pelis y libros) y no empeora enlaces en ninguna: pásalo a la carpeta por defecto y escribe.

**Hecho cuando:** hay una tabla actual frente a multilingüe y se queda el mejor.

---

## C4 — Contenido: fichas de experiencia escritas por un LLM (T5) · **Gemini** (lote grande) · depende de C3

**Por qué:** la sinopsis cuenta la trama, no cómo se vive la obra (ritmo, tono, para quién es). La ficha de
experiencia es la capa 1 del cerebro (MOTOR §2c.1). Hoy `scripts/cache/llm/enriched/` está vacía.

**Pasos:** los de `docs/TAREAS_MOTOR_V2.md` §T5, con dos cambios:
1. Empieza por una **muestra de 20 obras por estantería**, que Igor revisa, antes del lote completo.
2. La ficha se vectoriza con el modelo que gane en C3, y se mide con `build_space.py --eval` (no con `brain:eval`,
   que usa perfiles sintéticos). Se queda solo si mejora a C3.

**Hecho cuando:** fichas para todo el catálogo, vectorizadas, medidas y, si mejoran, escritas.

---

## C5 — Libros: cruzar más obras con goodbooks · **Sonnet**

**Por qué:** solo 480 de 988 libros del catálogo están cruzados con goodbooks-10k, así que la mitad no tiene
comportamiento. Muchos fallan por el idioma del título o por años erróneos (ver C6).

**Pasos:**
1. Revisa `app/scripts/cache/graph/sources/goodbooks/informe-cruces.md` y `app/scripts/brain/sources/goodbooks.mjs`.
2. Mejora el cruce: títulos en inglés de Wikidata (`en-titles.json` ya descargado), ISBN de Open Library por `olid`
   (el catálogo lo tiene en 1.915 obras), autor normalizado sin depender del año.
3. Vuelve a generar `cooc-goodbooks.jsonl` y `real-users-books.jsonl`, y mide.

**Hecho cuando:** ≥ 650 libros cruzados con < 5 % de cruces falsos (revisa 30 a mano) y medido.

---

## C6 — Catálogo: años imposibles · **Sonnet** · ya propuesta como sesión aparte

*Lolita* 1777, *Macbeth* 1508, *Interview with the Vampire* 1672… Distorsionan la década en Decidir y en los metadatos
del espacio. Encargo completo en la sesión propuesta «Arreglar años erróneos del catálogo de libros». Al cambiar un año
cambia el id: el antiguo va a `aliases.json`.

---

## C7 — Medir Descubrir con el cerebro · **Sonnet**

**Por qué:** Descubrir usa ahora los vectores por primera vez y no se ha medido.

**Pasos:** banco offline como `app/src/lib/engine/decide2.sim.test.ts`, pero para el mazo (`lib/engine/deck.ts`). Con
los usuarios reales de `cache/eval/real-users-{movies,books}.jsonl`, simula los swipes de cada uno (sabe qué ha visto y
qué le gustó) y mide, en las 20 primeras tarjetas, cuántas ha visto y cuántas le gustan, con el espacio m1.1
(`git show 4eaf8bf:app/src/data/engine/<shelf>.json`) y con el actual. Solo test nuevo; no cambies el mazo.

**Hecho cuando:** tabla m1.1 frente a cerebro en pelis y libros.

---

## Para Igor (no son de agente)

- **Automejora nocturna — PAUSADA hasta que haya usuarios (decisión de Igor, 27/10/2026).** Está hecha y probada:
  `node app/scripts/brain/nightly.mjs` (lee co-gustos agregados de Supabase, reconstruye, evalúa y deja el cambio sin
  commit) y la tarea programada «Biblioteca: automejora del cerebro», desactivada. **Activarla** cuando haya unos 50
  usuarios con cuenta o 200 sesiones con datos: en la app de Claude, Programadas → activar (o pasarla al Programador de
  tareas de Windows para no gastar cuota). Lo que sí funciona ya, por usuario y dentro de la app, es que Decidir
  recuerde lo que aprendió de cada uno (`decideTaste`).
- **Migración `0009_biblio_duels`** sin aplicar en Supabase: con cuentas, los duelos no se sincronizarán. Es un despliegue.
- **Subir a producción** los commits del cerebro (hoy siguen en local).
