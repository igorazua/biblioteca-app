# Plan de mejora de Decidir

> 15/11/2026. Pedido por Igor: «depurar al milímetro el Decidir: que las obras que salgan sean las mejores posibles en reconocibilidad y que sirvan para ajustar la obra que se recomienda». Lo ejecutan agentes Opus, Sonnet y Haiku, una tarea cada uno.
> Rama `native/fase-1`, worktree `.claude/worktrees/native`. El código de `packages/core` es el mismo que en `main`.
> Diagnóstico previo: `docs/REVISION_MOTORES.md` y las medidas del 15/11 que se resumen en §1.

## 0. Lo que apruebas al aprobar este plan (Igor)

Tres decisiones de producto van dentro de las tareas. Si alguna no te vale, dilo antes de lanzar su tarea.

1. **Un orientador ya no es la propuesta por defecto (cambia D19).** Si pides «algo nuevo», la propuesta descuenta la probabilidad de que ya la hayas visto. Un orientador puede seguir siendo la propuesta si destaca mucho, pero deja de ganar solo por haberlo elegido en un duelo. Tarea M1.
2. **El nivel de fama deja de ser un cupo de 40 por estantería (cambia T19 §1.1).** Pasa a ser un criterio: nivel 1 solo si de verdad la conoce casi todo el mundo. En juegos de mesa serán unas 10-15 obras, no 40. Tarea D6.
3. **Volver a estimar la fama de los juegos de mesa con un LLM**, con anclas fijas y una muestra de 30 que revisas tú. Lo hace el propio agente Haiku, sin coste de API aparte. Tarea D7.

## 1. Objetivo y cómo se mide

**Objetivo:** en 6 toques o menos, proponer una obra que el usuario acepte. Para eso cada duelo tiene que cumplir dos cosas: que conozca las dos obras al instante, y que su respuesta cambie qué candidata gana.

Medidas del 15/11/2026 con el catálogo real (usuario nuevo, 40 sesiones y 60 usuarios simulados por estantería). Son la línea de partida; la tarea B0 las deja como banco repetible.

| Medida | Pelis | Series | Libros | Juegos | Artistas | Meta |
|---|---|---|---|---|---|---|
| Acierto tras 6 duelos, conociendo todo | 37 % | 55 % | 50 % | 55 % | no medible | no baja más de 3 puntos |
| Acierto si responde al azar cuando no conoce una | 40 % | 40 % | 42 % | 25 % | — | juegos ≥ 40 % |
| Probabilidad de conocer las dos, duelos 4-6 | 0,67 | 0,65 | 0,67 | 0,51 | 0,61 | ≥ 0,75 |
| Sesiones en que sale el orientador más repetido (duelos 1-3) | 73 % | 85 % | 93 % | 83 % | 68 % | ≤ 35 % |
| La propuesta es un orientador enseñado en la sesión | frecuente, sin cifra | | | | | < 10 % si pide «nueva» |
| Rango de la puntuación previa (log) | 0,14 | — | 0,08 | — | 0,00 | que pese como un rasgo fuerte (≈ 1) |

«Acierto» = la propuesta está en el 10 % favorito del usuario simulado. En Artistas el usuario simulado no vale (sus géneros son 238 etiquetas sueltas): B0 lo arregla.

Lo que ya funciona y **no se toca**: el gusto por rasgos con incertidumbre (`observe`), la elección de pareja por valor de la información, «Pasar» no descarta, y solo propias o nivel 1 en los tres primeros duelos.

## 2. Reglas para todos los agentes

- Trabaja solo en `C:\Users\igora\.gemini\antigravity\scratch\biblioteca-app\.claude\worktrees\native`. No toques `main` ni otros worktrees. Gemini trabaja a la vez en la carpeta principal.
- Lee solo tu tarea de este documento, los archivos que nombra y lo que necesites de ellos. No abras los JSON de datos (`app/src/data/shelves`, `engine`, `seed.json`): pesan megas. Para ver datos usa `node packages/core/scripts/muestra-datos.mjs` o un test corto.
- **Primero el test que falla, luego el arreglo.** Un commit por tarea, solo con tus archivos: `git commit -m "…" -- <rutas>`. Sin push. Pie del commit: `Co-Authored-By: Claude <modelo> <noreply@anthropic.com>`.
- **Nunca relajes ni borres una expectativa** de un test existente. Si crees que un test está mal, para y explícalo.
- Antes de dar la tarea por hecha: `cd packages/core && npx tsc --noEmit && npx vitest run`, y si tocaste algo fuera de core, lo mismo en `app` y en `apps/native`. Pega la salida real en tu informe.
- **Tareas de motor (M):** ejecuta el banco de B0 antes y después y pega las dos tablas. Si una medida empeora más de lo que permite la meta, no commitees: informa.
- Todo número nuevo va en `packages/core/src/lib/engine/params.ts` con un comentario. Si cambia el resultado del motor, sube `ENGINE_VERSION` y dilo en el commit.
- Sin revisiones visuales, sin navegador y sin subagentes.
- Informe final en 15 líneas como mucho: qué cambiaste, medidas antes y después, qué no pudiste comprobar.

## 3. Tareas

### Bloque 0 — Medir

**B0 · Banco de Decidir repetible · Sonnet**
- Archivos: nuevo `packages/core/src/lib/engine/decide2.bench.test.ts`; mueve el usuario simulado de `decide2.sim.test.ts` a `packages/core/src/testing/simUsers.ts` para compartirlo. Nuevo `docs/DECIDIR_MEDIDAS.md`.
- Solo se ejecuta con `BENCH=1` (como `SIM=1` en el banco actual). Por estantería (pelis, series, libros, juegos, artistas), con semilla fija:
  1. **Censo de orientadores**, 40 sesiones de usuario nuevo y 40 de usuario con 30 obras propias: por número de duelo, R media y mínima, media de `rA·rB`, reparto por nivel de fama y propias, y las 15 obras más repetidas en los duelos 1-3.
  2. **Curva de acierto** tras 0…6 duelos, 60 usuarios, en cuatro modos de respuesta: `sabe` (conoce todo), `azar` (si no conoce alguna, con probabilidad 1−R cada una, responde al azar), `pasa` (en ese caso pulsa «Pasar», `skipDuelUnknown`) y `ruido` (siempre al azar).
  3. **Propuesta = orientador:** porcentaje de propuestas que son una obra enseñada en un duelo de esa sesión, y R media de la propuesta.
  4. **Peso de la previa:** máximo, mediana y mínimo de `st.base`, y calidad media (percentil de `voteAvg` en la estantería) de la propuesta.
- El usuario simulado de Artistas no puede basarse en géneros (solo «Música» llega a 25 obras): usa década y vecinos del vector (`sim` de `features.ts`) como gusto.
- Escribe la tabla en `docs/DECIDIR_MEDIDAS.md` con fecha y commit, **añadiendo** una sección por ejecución (no sobrescribe).
- **Hecho cuando:** `BENCH=1 npx vitest run src/lib/engine/decide2.bench.test.ts` tarda menos de 3 minutos, da los mismos números dos veces seguidas y la primera sección de `DECIDIR_MEDIDAS.md` queda dentro de ±5 puntos de la tabla de §1.

### Bloque M — Motor (en orden, uno detrás de otro: todos tocan `decide2.ts`)

**M1 · Separar orientar de proponer · Opus** · depende de B0
- Problema medido: gana The Beatles a AC/DC → propone The Beatles; gana Drácula → propone Drácula. Para quien pide «algo nuevo» son obras con R 0,98 que casi seguro ha visto y no ha apuntado.
- Archivos: `lib/engine/decide2.ts` (`utility`, `ranked`, `getProposal`, `scorePairsRaw`), `params.ts`, tests.
- Qué hacer: cuando la bolsa no es estricta (`seen !== 'vista'` y `source !== 'pendientes'`), la utilidad con la que se ordena la propuesta descuenta `pVista(obra)`:
  - obra con entrada pendiente → 0 (la guardó para verla);
  - sin entrada → `R · PARAMS.SEEN_GIVEN_KNOWN[estantería]` (de partida: pelis 0,7 · series 0,5 · libros 0,3 · juegos 0,5 · artistas 0,9);
  - si ganó un duelo en esta sesión, `pVista` no baja de 0,85 (la eligió porque la conoce).
  - Forma de partida: `uPropuesta = u + PARAMS.NOVELTY_W · ln(1 − pVista·0,95)`. Ajusta `NOVELTY_W` con el banco.
- El valor de la información (`decU`, `bestU`) tiene que usar esa misma utilidad: los duelos deben aclarar entre las candidatas que de verdad se pueden proponer.
- Los motivos (`reasonsFor`) no cambian.
- **Hecho cuando:** en el banco, «propuesta = orientador» < 10 % en las cinco estanterías para usuario nuevo; el acierto en modo `sabe` no baja más de 3 puntos; con `seen: 'vista'` o `source: 'pendientes'` el resultado es idéntico al de antes (test).

**M2 · Que la calidad pese · Sonnet** · depende de M1
- Problema medido: la previa se mueve 0,14 en pelis y 0,00 en artistas; un duelo mueve ≈ 1. Y la calidad compara recuentos de votos de fuentes distintas contra un 200 fijo (REVISION_MOTORES M8), el ánimo se casa por texto exacto con géneros en dos idiomas (M10) y `trend` se lee como mapa cuando es un número (B3).
- Archivos: `lib/engine/decide.ts` (`initDecideSession`, líneas 313-377), `decide2.ts` (cálculo de `base`, líneas 278-284), `traits.ts` (exportar `translate`/`norm`), `params.ts`, tests.
- Qué hacer:
  1. Calidad global por **percentil dentro de la estantería**: percentil de `voteAvg` encogido hacia 0,5 según el percentil de votos (pocos votos → cerca de 0,5). Obra sin `voteAvg` → percentil de `notoriety`·0,5 + 0,25. Sin umbrales absolutos.
  2. Ánimo: comparar géneros normalizados con `translate`/`norm` en los dos lados.
  3. `trend`: aceptar número o mapa por país.
  4. En `decide2`, `base` pasa a ser la previa **tipificada** dentro de la bolsa (media 0, desviación 1) por `PARAMS.PRIOR_W` (de partida 0,6), en lugar de `log(prior) − media`.
- **Hecho cuando:** en el banco, la calidad media de la propuesta sube al menos 10 puntos de percentil en pelis y libros sin que el acierto en modo `sabe` baje más de 3; test: dos obras con los mismos rasgos y distinta calidad → se propone la mejor; test: género «Comedy» y «Comedia» puntúan igual en ánimo.
- Ojo: `decide.ts` lo comparte el motor v1 del banco viejo. Si un test de v1 cambia de resultado, no lo relajes: para e informa.

**M3 · Fases y suelos de reconocibilidad · Sonnet** · depende de M2
- Problema medido: desde el cuarto duelo entran obras de nivel 3 con R desde 0,55 (probabilidad de conocer las dos: 0,51 en juegos). Todas las de nivel 1 tienen R 0,97-1 sea cual sea la edad del usuario (un nacido en 2005 recibe *Urgencias*). La pareja se pondera con la raíz de `R_a·R_b`.
- Archivos: `lib/engine/decide2.ts` (filtro de `cands` en `scorePairsRaw` y `known`), `lib/engine/recog.ts` (suelo de época del nivel 1), `params.ts`, tests.
- Qué hacer (T17 §C.1-C.2, que el v2 no cumple):
  1. Conjuntos: **F1** = propias, o nivel 1 con R ≥ 0,8. **F2** = F1 + nivel ≤ 2 con R ≥ 0,65. **F3** = F2 + nivel 3 con R ≥ 0,55. Nunca nivel 4.
  2. Duelos 1-3 → F1; duelos 4 en adelante de la primera ronda → F2; a partir de «Seguir buscando» (`round > 1`) → F3. Tras un «Pasar» que marque dudosa (`preferFameOrOwn`) → F1.
  3. Si el conjunto tiene menos de 12 obras, se completa con las mejores del siguiente por R, nunca con nivel 4.
  4. `known = R_a · R_b` (sin raíz).
  5. `recog.ts`: el suelo de época del nivel 1 baja de 0,95 a `PARAMS.ERA_FLOOR_TIER1` (0,8). Así una obra de nivel 1 fuera de la generación del usuario se queda por debajo del 0,8 de F1 y solo entra en F2. Sin año de nacimiento no cambia nada.
- **Hecho cuando:** en el banco, la media de `rA·rB` en los duelos 4-6 es ≥ 0,75 en pelis, series, libros y artistas (juegos depende de los datos, D6-D7); ningún duelo con nivel 3 en la primera ronda; test: un nacido en 2005 no recibe en los duelos 1-3 una obra de nivel 1 de 1994 que no sea canon; ninguna sesión se queda sin duelos.

**M4 · Que no salga siempre el mismo duelo · Sonnet** · depende de M3
- Problema medido: para un usuario nuevo, *Dune* sale en 37 de 40 sesiones de libros y el primer duelo es siempre *El hombre en busca de sentido* contra *Drácula*.
- Archivos: `lib/engine/decide2.ts` (`nextDuel`, memoria `pairMemo`, tanteo de rasgos decisivos), `params.ts`, tests.
- Qué hacer:
  1. En lugar de «una de las 3 mejores», sortear entre todas las parejas con puntuación ≥ `PARAMS.DUEL_NEAR_BEST` (0,8) de la mejor, con probabilidad proporcional a la puntuación.
  2. El tanteo de un rasgo decisivo (cooperativo, no ficción) no fuerza una pareja fija: entra en el sorteo cualquier pareja que separe ese rasgo y esté en el conjunto de la fase.
  3. `bestKG` (que usa un azar fijo) no debe dejar en la memoria una lista que `nextDuel` reutilice: separa la memoria de la puntuación de la del sorteo (REVISION_MOTORES B4).
- **Hecho cuando:** en el banco, el orientador más repetido en los duelos 1-3 aparece en ≤ 35 % de las sesiones de usuario nuevo en las cinco estanterías, y el acierto en modo `sabe` no baja más de 3 puntos; con la misma semilla, `nextDuel` da lo mismo se llame o no antes a `shouldPropose`.

**M5 · Que R aprenda de lo que ya registramos · Opus** · depende de M4 y de D6. *Se lanza solo si Igor lo pide: con pocos usuarios aporta poco.*
- Señales que ya se guardan y no se usan para R: «Pasar» por obra, duelos lentos (`ms`), y «la vi» / «no me interesa» del mazo por nivel de fama.
- Qué hacer: diseñar y escribir en `docs/` (sin código todavía) cómo se corrige R por usuario (tasa de «la vi» por nivel de fama en `deckLearn`) y por obra entre usuarios (tasa de «Pasar» agregada en Supabase), con qué mínimos de datos, y qué eventos faltan.

### Bloque D — Datos (el build, `app/scripts/engine/`)

Los tres informes (D1-D3) solo leen y escriben en `docs/datos/`: pueden ir en paralelo con el bloque M. Las tareas que regeneran datos (D4-D8) van **después** del bloque M y una detrás de otra, porque cambian los JSON con los que corren los tests.

**D1 · Informe: ids de Wikidata equivocados · Haiku**
- Visto en la muestra: *Brazil* = Q155 (el país), *Planet Earth* = Q2, *La La Land* = Q65, *Hierro* = Q677, *Hung* = Q28, y en juegos *Village*, *Friday*, *Lisboa*, *Cuba*, *London*, *Earth*, *Nippon*, *Indonesia*, *Jamaica*…
- Qué hacer: ejecutar `node app/scripts/engine/check-wikidata-type.mjs` (lee antes su cabecera para ver cómo se usa) o, si no cubre todas las estanterías, un script corto que consulte la clase (P31) de cada `wikidataId` y la compare con la estantería. No corrijas nada.
- Entrega: `docs/datos/wikidata-erroneos.md` con una tabla: obra, id actual, qué es en realidad, nivel de fama actual.

**D2 · Informe: obras repetidas · Haiku**
- Vistas: *El truco final* / *El truco final (El prestigio)*, *The Office* / *The Office (EE. UU.)*, *Pokémon* / *Pokémon (anime)*, *Sapiens*, *La guerra de las galaxias* / *Star Wars: Una nueva esperanza*, y juegos con su traducción (*Azul: Summer Pavilion* / *Azul: Pabellón de Verano*, *Gloomhaven: Jaws of the Lion* / *Fauces del León*, *Clank!*).
- Qué hacer: script corto que agrupe por estantería las obras con mismo año (±1) y título parecido (mismo título original, o uno contenido en el otro, o mismo `wikidataId`). Marca cuál conservar (la que tiene más datos).
- Entrega: `docs/datos/repetidas.md`: grupo, obra que se conserva, obras que se fusionan, dudas. Igor lo revisa antes de D5.

**D3 · Informe: títulos sin traducir en obras conocidas · Haiku**
- Vistos en nivel 1 de libros: «Анна Каренина», «Animal Farm», «Lord of the Flies», «Romeo and Juliet», «The Handmaid's Tale», «Le mythe de Sisyphe», «White Nights».
- Qué hacer: listar las obras de nivel 1 y 2 de libros, pelis y series cuyo título mostrado en español (`local.es.title`, o `title` si no hay) no está en español, y las de año claramente erróneo (*White Nights* 2016, *A Little Life* 2008).
- Entrega: `docs/datos/titulos.md`: obra, título actual, título en español propuesto y de dónde sale (etiqueta `es` de Wikidata u Open Library).

**D4 · Corregir los ids equivocados · Sonnet** · depende de D1 y del bloque M
- Con la tabla de D1: resolver el id correcto (título + año + creador) o quitarlo si no hay. Usa `fix-wikidata-types.mjs` si sirve. Regenera con `npm run engine:build` dentro de `app`.
- **Hecho cuando:** `check-wikidata-type` no da errores, `node scripts/engine/coverage.mjs` pasa y el banco se vuelve a ejecutar.

**D5 · Fusionar las repetidas · Sonnet** · depende de D2 revisado por Igor
- Añadir las fusiones a los alias (`packages/core/src/data/aliases.ts` y el paso `scripts/dedupe-twins.mjs` del build). Las entradas de usuario de la obra fusionada pasan a la conservada (ya lo hace `canonicalId`).
- **Hecho cuando:** los grupos de D2 aprobados quedan en una sola obra visible y los tests de `aliases` pasan.

**D6 · Nivel de fama por criterio, no por cupo · Sonnet** · depende de D4
- Hoy (`build.mjs` líneas 442-489): nivel 1 = las 40 primeras por notoriedad con `fameLlm ≥ 0,5`. Y la lista de oro se fuerza a notoriedad 0,98 (líneas 400-440), así que su prueba pasa por construcción.
- Qué hacer:
  1. Nivel 1 = `fameLlm ≥ 0,75` **y** (`max(visW, visES) ≥ 90` o no hay visitas y `fameLlm = 1`). Nivel 2 = `fameLlm ≥ 0,5` y `max(visW, visES) ≥ 70`. Nivel 3 = `fameLlm ≥ 0,25` o `max(visW, visES) ≥ 50`. Resto, nivel 4. Sin mínimo de obras por nivel.
  2. Quitar el forzado de la lista de oro: si una de esas obras no llega a nivel 1, se arregla su dato.
  3. Ampliar la lista de «tienen que ser bajas» de `coverage.mjs` con juegos de aficionado que hoy están en nivel 1: *Maracaibo*, *Bora Bora*, *Barrage*, *Rococo*, *Coimbra*, *Bus*, *QE*, *Maquis*, *Belfort*, *Yokohama*.
- **Hecho cuando:** `coverage.mjs` pasa sin forzar nada; nivel 1 de juegos tiene entre 8 y 20 obras; el motor no se queda sin orientadores en ninguna estantería (banco: 0 sesiones sin duelo).

**D7 · Volver a estimar la fama de los juegos de mesa · Haiku** · depende de D6
- La notoriedad de juegos sale de BoardGameGeek (jugones): *Maracaibo* 0,86 por encima de *Ticket to Ride* 0,75.
- Qué hacer: con `fame-llm.mjs` en modo agente, estimar `fameLlm.ES` de los juegos en 5 escalones con estas anclas en cada lote: 1 = Monopoly, UNO, Parchís, Trivial Pursuit, ajedrez · 0,75 = Catan, Risk, Scrabble, Cluedo, Jenga · 0,5 = Dixit, Carcassonne, ¡Aventureros al tren!, Virus! · 0,25 = Azul, Wingspan, 7 Wonders · 0 = Ra, Maracaibo, Barrage. Pregunta: «¿qué parte de los adultos de España reconocería este juego por su nombre o su caja?».
- Entrega: valores con procedencia `llm-infer` y `docs/datos/fama-juegos-muestra.md` con 30 juegos al azar para que Igor los revise antes de regenerar.

**D8 · La nota no puede ser una copia de la popularidad · Sonnet** · depende de D4
- Medido: `voteAvg` = `popularity`/10 en 813 de 839 series y en los 701 juegos que tienen nota; 110 de 789 pelis.
- Qué hacer: localizar en el build dónde se rellena así y dejar de hacerlo (sin fuente, sin `voteAvg`). Guardar la procedencia en `src.voteAvg`. En juegos, la nota de BGG sí es una fuente: se conserva con su procedencia.
- **Hecho cuando:** menos del 5 % de las obras con `voteAvg` cumplen `voteAvg === popularity/10`, salvo las que tienen procedencia de una fuente.

### Bloque P — Pendientes de la revisión de motores

**P1 · El duelo manda sobre las estrellas (A5) · Sonnet** · independiente del bloque M (toca `ranking.ts` y el store)
- Decidido por Igor el 15/11. Hoy `applyDuelToRanking` ordena solo por Elo, pero `starBand` (colocación al marcar «vista», importación) sigue suponiendo franjas de estrellas contiguas.
- Archivos: `lib/ranking.ts`, `lib/import/apply.ts`, y los usos de `starBand`/`clampStars` en `app/src/store/useStore.ts` y `apps/native/src/store/useStore.ts`.
- Qué hacer: la obra nueva o importada con estrellas entra por su Elo inicial (`getInitialElo` ya lo da por estrellas) en el punto del ranking que corresponde a ese Elo, no en una franja. Las estrellas quedan como dato de partida y no se corrigen con los duelos.
- **Hecho cuando:** test: ranking [A 5★, B 5★, C 4★, D 2★], D gana a A, se importa una obra con 2★ → no queda por encima de las de 5★ que no han perdido.

**P2 · Descubrir usa lo aprendido en el mazo · Sonnet** · independiente
- `Discover.tsx` y `apps/native/src/app/(tabs)/descubrir.tsx` no pasan `deckLearn` a `nextCards`, así que el arreglo A1 no se nota en el mazo. Al pasarlo, la tasa de «la vi» contaría dos veces en `seen_likely` (zona de `recog` y `adapt` de `deck.ts`): deja `adapt` solo para lo aprendido en la sesión actual.
- **Hecho cuando:** test en `deck.test.ts`: con `deckLearn` de una década muy vista, sus obras suben en `seen_likely`.

**P3 · Poner `MOTOR.md` al día · Haiku** · al final de todo
- §8b describe el v2 de antes de este plan; §8.4-8.5 y T17 Parte C describen fases que el v2 no seguía. Reescribir §8b con lo que queda tras M1-M4 y D6, y marcar como sustituido lo que ya no aplica. Solo documentación.

## 4. Orden

1. **Ahora, en paralelo:** B0 (Sonnet) y los informes D1, D2 y D3 (Haiku). No dependen de ninguna decisión.
2. **Motor, de uno en uno:** M1 (Opus) → M2 → M3 → M4 (Sonnet). P1 y P2 pueden ir a la vez que el motor: no tocan los mismos archivos.
3. **Datos, de uno en uno:** D4 → D5 → D6 → D7 → D8, y banco otra vez.
4. **Cierre:** P3, y M5 solo si lo pides.

Tras cada tarea, quien coordina comprueba el commit (`tsc`, tests y banco) antes de lanzar la siguiente.
