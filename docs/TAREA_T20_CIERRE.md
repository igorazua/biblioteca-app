# T20 — Cerrar todo lo pendiente, sin atajos (23/10/2026)

> Encargo para Gemini, escrito por Claude tras comprobar el estado real el 23/10 (`tsc`, `vitest`, `coverage.mjs` y conteos sobre `seed.json`). Sustituye a lo que quedaba abierto de T17, T18 y T19. Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.
> **Objetivo:** que `coverage.mjs` pase **en verde entero** y que Conectar y los textos estén terminados.

---

## 0. Cómo se trabaja en esta tarea (obligatorio, porque antes se dio por hecho lo que no estaba)
1. **Una tarea solo está hecha si su comprobación pasa.** Cada paso de abajo tiene un **«Comprueba»** con un comando y el **número exacto** que debe salir.
2. **Registro:** al acabar cada paso, pega la salida del comando de comprobación (sin resumirla) en `docs/T20_REGISTRO.md`, con la fecha. Si no está pegada, el paso no está hecho.
3. **Prohibido** escribir en `PROJECT_CONTEXT.md` o en un mensaje que algo está «completado y verificado» sin que su comprobación esté en el registro.
4. **Nadie edita `seed.json` a mano.** Todo dato entra por `scripts/cache/attrs/*.jsonl` y `npm run engine:build` (o `npm run seed`). Si el build no aplica un dato, se arregla el build. Pasó con las portadas el 23/10: el build no aceptaba fuentes `scrape:` y lo arregló Claude en `attrs.mjs`.
5. **Un commit por paso**, solo con sus archivos (`git add <archivo>`, nunca `git add -A`), con el mensaje `T20.N: …`.
6. Si un paso no se puede cumplir, **para y escríbelo en el registro** con el motivo. No lo des por hecho ni lo sustituyas por otra cosa.
7. **Sin revisión visual:** la hace Igor en el móvil. Sí `tsc` y los tests.
8. **Al final de cada paso:** `npx tsc -p app/tsconfig.json --noEmit` sin errores y `npx vitest run` en verde.

---

## Estado medido el 23/10 (el punto de partida)
| Estantería | Obras | Con `wikidataId` | Con visitas de Wikipedia | Sin portada real | Ejes de relleno (> 60 % en un valor) |
|---|---|---|---|---|---|
| Pelis | 935 | 803 | 786 | 3 | 6 de 11 |
| Series | 998 | 866 | 822 | 7 | 8 de 13 |
| Libros | 988 | **427** | **209** | 7 | **10 de 10** |
| Juegos | 1018 | 708 | 443 | 0 | 6 de 8 |
| Artistas | 410 | 400 | **4** | 0 | 5 de 7 |

Además:
- El catálogo tiene **obras basura**: *Kokuritsu kokkai toshokan shozō Meijiki kankō tosho maikuro-ban shūsei* (un microfilm de biblioteca japonés), *Seporsi mie ayam sebelum mati*, *Esquire's the new rules for men*, *Slednecks*, *Eric Greenspan is hungry*… Salen en Descubrir y en los duelos.
- Los artefactos del motor de juegos tienen 1015 obras y el seed 1018 (faltan las nuevas).
- Conectar: 12 servicios en «Próximamente» de 21.

---

## T20.1 — Limpiar el catálogo de obras basura
**Por qué:** una obra que no conoce nadie y que ni siquiera es una obra para el público estropea Descubrir y los duelos.
1. **Candidatas** (`app/scripts/engine/junk-candidates.mjs`): obras que cumplen **las tres** cosas:
   - `fameLlm.ES == 0`;
   - menos de 50 visitas de Wikipedia al año en total, o sin visitas;
   - **o** sin `wikidataId`, **o** con un tipo de Wikidata que no es de su categoría.

   Más las que el LLM marque como «no es una obra de consumo» (catálogos de biblioteca, documentos técnicos, programas de relleno de TV). Para eso hace falta un atributo nuevo `isConsumerWork` (bool) en `ATTRS`, `llm-infer`, con anclas fijas en el prompt: el microfilm japonés = `false`, *Slednecks* = `false`, *Sin noticias de Gurb* = `true`.
2. Escribe la lista en `app/scripts/cache/junk/candidatas.md`: id, título, año, por qué. **⛔ Para y espera el OK de Igor** sobre la lista.
3. Con el OK: atributo `hidden: true` (por `attrs/hidden.jsonl`). **No se borran** (puede haber entradas de usuarios con esos ids). Las obras ocultas:
   - no salen en Descubrir, en los duelos de Decidir ni en las propuestas;
   - siguen saliendo en la biblioteca de quien ya las tenga;
   - **no cuentan** en `coverage.mjs`.

**Comprueba:** `node app/scripts/engine/coverage.mjs` imprime una línea nueva «Ocultas por estantería: …» y en `npx vitest run` pasa un test nuevo: «una obra oculta no sale en `nextCards` ni en `nextDuel`».

## T20.2 — Ids de Wikidata de los libros (≥ 75 %)
1. `npm run engine:books` (`enrich-books-wikidata.mjs`), ampliado con tres vías **en este orden**:
   - `olid` (obra de Open Library) → Wikidata P648;
   - ISBN → P212 / P957, y de la edición se sube a la obra con P629 («edición de»);
   - SPARQL por título (en español y en el original) + autor + año ±2, **con el control de tipo** de `check-wikidata-type.mjs`: libro o obra literaria, **nunca una edición, una persona o una ciudad**.
2. Lo dudoso (varias candidatas o parecido < 0,85) va a `app/scripts/cache/books/ambiguos.md`, no al catálogo.

**Comprueba:** `coverage.mjs` → «book wikidataId ≥ 75 %» (de las no ocultas). Y `node app/scripts/engine/check-wikidata-type.mjs app/src/data/seed.json /tmp/x.json` → **0** libros mal enlazados.

## T20.3 — Visitas de Wikipedia (≥ 90 % de las obras con id, en todas las estanterías)
1. Investiga **por qué los artistas tienen 4 de 400**. Suele ser que los sitelinks de las personas y los grupos se piden mal, o que el script salta la estantería. Escribe la causa en el registro.
2. `npm run engine:pageviews` para libros, juegos y artistas. Usa la API de visitas de Wikimedia, por meses, 12 meses, `agent=user`, idiomas es, en, fr, de, it y pt.
   - User-Agent propio y como mucho 50 peticiones por segundo; reintento con espera si da 429.
   - Si una obra no tiene artículo en ninguno de los 6 idiomas, se guarda `pageviews: {}` con `src: 'wikimedia-api'` (consultada y vacía), para que no vuelva a la cola.

**Comprueba:** en `coverage.mjs`, el apartado «1. Cobertura de pageviews» sale **✓ en las 5 estanterías**.

## T20.4 — Volver a calcular la fama y comprobar la lista de oro
1. `npm run engine:build`. Recalcula `popPct`, `notoriety`, `fameTier` y `nivel1.md`.
2. Revisa `nivel1.md`: si en el nivel 1 de alguna estantería sale algo que no conoce casi todo el mundo en España, corrige su `fameLlm` (en `attrs/fameLlm.jsonl`, `src: 'manual'`) y vuelve a construir.

**Comprueba:** en `coverage.mjs`, los apartados 3 y 4 (ids y reglas de la lista de oro) salen **✓ en todas**. Pega en el registro las 10 primeras de nivel 1 de cada estantería.

## T20.5 — Ejes de sensación reales en las 5 estanterías
**Es lo más largo y lo que más cuesta hacer bien.** Sin esto, las dimensiones de los duelos de Decidir (T17 §B) fuera de pelis funcionan casi a ciegas.
1. **Método:** modo agente de ENRIQUECIMIENTO §5b (`llm.mjs --mode agent` → tú escribes → `--mode import` valida), **obra a obra con su contexto** (`scripts/cache/context/…`), **nunca de memoria**.
   - Si Igor pone `ANTHROPIC_API_KEY` en `app/.env.local`, se puede hacer por lotes con Haiku 5.5 (unos 3 $). Pregúntale antes de empezar cuál prefiere.
2. **Calibración en cada bloque de 40:** los 3 ejemplos fijos de `axes.mjs` al principio, y la instrucción de **usar toda la escala del 1 al 5**: en un bloque variado, cada valor debería salir al menos alguna vez en casi todos los ejes.
3. **Por estantería**, cuando acabes: distribución de cada eje y prueba de deriva (repuntúa 20 al azar; si más del 25 % difiere en 2 o más, se rehace la estantería).
4. Después: `npm run engine:context && npm run engine:vectors && npm run engine:merge` para que **los artefactos del motor tengan exactamente las obras del seed** (hoy faltan 3 juegos).

**Comprueba:** en `coverage.mjs`, el apartado «2. Concentración de ejes» **sin ningún ❌** (todos ≤ 60 %), y una línea nueva «ids del motor = ids del seed» en las 5 estanterías.

## T20.6 — Las 17 portadas que faltan
| Estantería | Obras |
|---|---|
| Pelis | `soorarai-pottru-2020`, `kami-kodomo-no-ame-to-yuki-2012`, `t-ky-goddof-z-zu-2003` |
| Series | `elite-2018`, `puente-de-resund-2011`, `heartstopper-2022`, `misa-de-medianoche-2021`, `slednecks-2014`*, `eric-greenspan-is-hungry-2014`*, `wrestling-with-death-2015`* |
| Libros | `el-hombre-en-busca-de-sentido-1946`, `el-legado-en-los-huesos-2013`, `esquire-s-the-new-rules-for-men-2016`*, `seporsi-mie-ayam-sebelum-mati-2025`*, `heli-hogu-karana-2003`*, `the-gita-for-gen-z-2025`*, `kokuritsu-kokkai-…-1991`* |

\* Probablemente se ocultan en T20.1; en ese caso no hace falta su portada.
- Para el resto: las fuentes de T19 §2. Para series, TVmaze por título y año (*Élite*, *El puente*, *Heartstopper* y *Misa de medianoche* están seguro). Para pelis, IMDb `og:image` por `imdbId`.

**Comprueba:** `node app/scripts/engine/check-posters.mjs` → 0 sin portada real entre las no ocultas.

## T20.7 — Conectar sin claves (T18 completa)
Sigue `docs/TAREA_T18_CONECTAR.md` §«Lo que se puede hacer ya». En `lib/connect/services.ts`, estos pasan de `soon` a `file`, cada uno con su parser, sus instrucciones y su test con un ejemplo en `lib/import/__fixtures__/`:

| Servicio | Archivo | Parser |
|---|---|---|
| Spotify (además de la conexión) | `StreamingHistory_music_*.json` / `Streaming_History_Audio_*.json` (también dentro de un ZIP) | `lib/import/spotify-history.ts` |
| YouTube Music | Takeout `watch-history.json` (entradas con `header: "YouTube Music"`) | `lib/import/youtube-music.ts` |
| Apple Music | `Apple Music Play Activity.csv` | `lib/import/apple-music.ts` |
| Prime Video | `Digital.PrimeVideo.Viewinghistory.csv` | `lib/import/prime-video.ts` |
| Kindle | `Digital Items.csv` | `lib/import/kindle.ts` |

- Los que no dan exportación (Disney+, Max, Movistar+, Filmin, SkyShowtime y Crunchyroll) **siguen en `soon`**, con la línea «Mientras tanto, márcalas en Descubrir».
- **Orden de la lista:** Netflix, Spotify, Prime Video, Letterboxd, Goodreads, YouTube Music, IMDb, Kindle y después el resto.
- **Función `biblio-connect`:** pruébala con `curl` (con la clave anónima) usando un usuario público real de Letterboxd y el id de un perfil público de Goodreads, y pega las dos respuestas, recortadas, en el registro. Si falla, arréglala.

**Comprueba:**
- `npx vitest run` pasa los 5 tests nuevos de parsers;
- `grep -c "method: 'soon'" app/src/lib/connect/services.ts` da **10** como mucho (los 6 sin exportación y los 4 que esperan clave: Trakt, Last.fm, MyAnimeList y BGG);
- en el registro, las dos respuestas de `biblio-connect`.

## T20.8 — Textos de toda la app (tarea D)
Aplica esta guía a **todas** las pantallas. Haz una lista de cada texto cambiado (antes → después) en `docs/T20_TEXTOS.md` para que Igor lo revise.

**Guía de textos**
- **Tú, cercano y directo,** como un amigo que sabe de cine y libros. Frases cortas. Nada de tecnicismos («motor», «ranking A/B», «sincronizar con la nube» → «guardado en tu cuenta»).
- **Verbos de acción en los botones,** de 1 a 3 palabras: «Empezar», «Guardar», «Seguir buscando», «Ver la ficha». Nada de «Aceptar», «OK» ni «Enviar» a secas.
- **Las mismas palabras en toda la app:**

  | Concepto | Se dice | No se dice |
  |---|---|---|
  | cada peli, serie, libro, juego o artista | **obra** (o el nombre concreto: «peli», «libro») | ítem, elemento, título, contenido |
  | cada categoría | **estantería** | categoría, sección |
  | los tres gestos | **«La vi»** (o «La leí» / «Lo jugué» / «Lo escuché» según la estantería), **«Pendiente»**, **«No me interesa»** | visto, guardado, descartar |
  | ordenar por parejas | **comparar** / «¿Cuál te gustó más?» | duelo, A/B, versus |
  | tu lista ordenada | **tu ranking** o **tu top** | lista, orden |
  | lo que te propone Decidir | **«Te proponemos…»** | recomendación del algoritmo |

- **Sin emojis en la interfaz.** Sin signos de exclamación salvo en celebraciones de verdad («¡Tu top está listo!»).
- **Errores:** qué ha pasado y qué hacer, en una frase: «No hemos podido conectar. Revisa tu conexión y vuelve a intentarlo.» Nunca un error técnico a la vista.
- **Vacíos:** una invitación, no una disculpa. «Aún no tienes libros. Márcalos en Descubrir y aparecerán aquí.»
- **Números:** «12 sin ordenar», «85 % ordenado», «3 de 7». Siempre con espacio antes de «%».
- **Mayúsculas:** solo la primera letra de la frase, salvo las etiquetas `text-label`, que van en mayúsculas por diseño.

**Comprueba:**
- `docs/T20_TEXTOS.md` con la lista completa, ordenada por pantalla;
- `grep -rn "ítem\|item\b\|duelo\|A/B" app/src/screens app/src/components --include=*.tsx` → **0 resultados en textos visibles** (en nombres de variables no importa).

## T20.9 — Cierre
1. `npm run engine:build`, `npx tsc -p app/tsconfig.json --noEmit`, `npx vitest run` y `node app/scripts/engine/coverage.mjs`.
2. **`coverage.mjs` sale sin un solo ❌.** Pega la salida completa en el registro.
3. Actualiza el apartado «Estado real» de `PROJECT_CONTEXT.md` **solo con lo que diga el registro**.
4. Commit final y **no despliegues**: Igor lo pide cuando quiera.

---

## Lo que necesita Igor (y lo que pasa si no lo hace)
- **T20.1:** el OK a la lista de obras basura. Sin él, se quedan visibles.
- **T20.5:** elegir modo agente (gratis, más lento) o Haiku por API (unos 3 $, necesita `ANTHROPIC_API_KEY`).
- **Opcional:** claves de Spotify, Trakt, Last.fm, MyAnimeList y BGG (`docs/TAREA_T18_CONECTAR.md`). Sin ellas, esos servicios siguen en «Muy pronto».
- **T20.8:** revisar `docs/T20_TEXTOS.md`.
