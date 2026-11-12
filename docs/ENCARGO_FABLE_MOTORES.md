# Encargo: revisión y depuración de los motores (Fable)

> 12/11/2026. Pedido por Igor. Se lanza **cuando C1 esté en `main`**: entonces los motores viven en un solo sitio (`packages/core`) y la PWA y la app nativa los usan los dos.
> Objetivo: encontrar fallos reales y arreglarlos con pruebas, **gastando lo mínimo**. Primero se revisa y se informa. Solo se arregla después del visto bueno de Igor.

## 1. Lo que hay que saber (y solo esto)

- **Qué es la app:** guardar, valorar y comparar pelis, series, libros, juegos de mesa y artistas en estanterías. Tres motores:
  - **Descubrir:** mazo de cartas con swipe en tres direcciones.
  - **¡Duelos!:** ranking por comparación A/B con Elo/Bradley-Terry.
  - **Decidir:** propone qué ver haciendo preguntas y duelos.
  - Debajo de los tres está **el cerebro**: vectores de obra y de usuario.
- **Objetivo de producto** (Igor, 21/10/2026): cero fricción y **los mejores tres motores que existan**, sobre la ficha de obra con más metadatos posible. Cada motor tiene su puntuación y su trabajo (`docs/MOTOR.md` §2b.0, léelo entero, es corto):
  - **R — reconocibilidad** (`recog.ts`): probabilidad de que *este usuario* conozca la obra. Elige los orientadores de los duelos y ordena el cupo `seen_likely` del mazo. Una obra que el usuario no conoce no sirve para un duelo.
  - **A — propuesta** (`decide2.ts`): qué obra proponer hoy en Decidir (encaje × calidad). **No lleva reconocibilidad**: una propuesta desconocida puede ser justo el descubrimiento.
  - **D — posición en el mazo** (`deck.ts`): orden de Descubrir por cupos (§7), para que cada carta merezca el gesto: ni todo famoso ni todo raro.
  - **Ranking** (`ranking.ts`): ordenar lo visto con pocos duelos, colocar una obra nueva en 2-4 duelos y no repetir parejas sin necesidad.
  - Principios que el código debe cumplir: señales pasadas a **percentil dentro de su estantería** (nada de umbrales absolutos), nada deducido del texto del título y todo número ajustable en `params.ts`.
- **Los datos de cada obra:** qué campos tiene una ficha y de dónde salen está en `docs/MOTOR.md` §2b.1 (tabla). Para **ver datos reales sin abrir los JSON**, ejecuta `node packages/core/scripts/muestra-datos.mjs` (unos 17 KB en total) o `… book 5` para una sola estantería con 5 ejemplos. Saca la cobertura de cada campo por estantería, la obra más famosa, una del medio y la menos conocida, y la forma de los datos del motor (`engine/<estantería>.json`: ejes, vectores, vecinos y clústeres). Si un hallazgo depende de los datos (un campo vacío, mal escalado, un valor imposible), apúntalo también: los datos malos estropean el mejor motor.
- **Dónde está el código:** `packages/core/src`, TypeScript puro, sin navegador ni React. Mapa en `packages/core/src/index.ts`. Los motores:
  - `lib/engine/` — `deck`, `decide2` (el vivo), `decide` (v1, usado por v2), `recog`, `features`, `userVec`, `traits`, `anchors`, `cleanup`, `metrics`, `params`, `ranker`, `dimensions` y `axes`.
  - `lib/ranking.ts`, `rank.ts`, `deck.ts`, `recommend.ts`, `affinity.ts` y `nudges.ts`.
- **Diseño de cada motor**, en `docs/MOTOR.md`. Lee **solo** la sección del motor que revisas:
  - §2b — los tres motores.
  - §7 — Descubrir.
  - §8 — Decidir v1.
  - §8b — Decidir v2.
  - §9 — Limpieza.
  - §10 — Parámetros.
  - §2c.9 — el cerebro.
- **Tests:** `cd packages/core && npx vitest run`. Hoy dan **295 pasados, 17 fallos esperados (`it.fails`, deliberados: documentan lo que aún no se cumple) y 6 saltados**.
  - `src/data/songsDeck.test.ts` tarda unos 25 s en la ejecución completa; es normal.

## 2. Para gastar poco (obligatorio)

- **No abras los JSON de datos** (`app/src/data/seed.json`, `catalog-index.json`, `shelves/*`, `engine/*`, `anchors/*`): pesan megas. Para verlos, usa `muestra-datos.mjs` (arriba) o un `node -e` corto que imprima solo lo que necesitas (un campo, un recuento, una obra por id).
- **No abras** `app/scripts/cache/**`, `node_modules`, `apps/native` ni `app/src/screens`. La revisión es de los motores, no de las pantallas.
- **No leas archivos enteros si no hace falta:**
  - Usa `grep` para encontrar usos y llamadas.
  - Lee por rangos de líneas.
  - Empieza por las funciones exportadas y sigue solo los caminos que se usan.
- **No ejecutes la evaluación del cerebro** (`scripts/brain/*`, `build_space.py`, `brain:eval`) salvo que un fallo concreto lo pida, y dilo antes.
- **Tests:** una ejecución completa al principio y otra al final. En medio, solo el archivo que toques (`npx vitest run src/lib/engine/deck.test.ts`).
- **Sin subagentes.**
- **Sin navegador ni capturas.**

## 3. Fase 1: revisar (solo leer y escribir el informe)

Por cada motor, en este orden: `ranking.ts`, `deck.ts`, `decide2.ts` + `decide.ts`, `recog.ts`, `features.ts` + `userVec.ts`, `cleanup.ts`, `nudges.ts` y `recommend.ts`.

1. **Fallos de corrección:**
   - divisiones por cero, `NaN` que se propagan, empates mal resueltos;
   - índices fuera de rango, mutaciones de estado compartido;
   - azar sin semilla donde debería ser reproducible;
   - casos vacíos (estantería sin obras, usuario sin entradas, una sola obra);
   - ids de alias sin canonizar (`canonicalId`).
2. **Incoherencias con `docs/MOTOR.md`:** lo que el documento dice que hace y el código no.
3. **Rendimiento en caliente:** lo que se ejecuta en cada gesto o en cada duelo (`nextCards`, `fitRatings`, `recomputeVectorForShelf` y la propuesta de Decidir).
4. **Código muerto o duplicado:** por ejemplo, lógica de Elo repetida, o parámetros de `params.ts` que nadie usa.

Escribe `docs/REVISION_MOTORES.md` con una tabla por hallazgo:
- gravedad (alta, media o baja);
- `archivo:línea`;
- qué falla;
- un escenario concreto (con qué datos de entrada sale mal);
- el arreglo propuesto;
- el test que lo demostraría.

Al final, una lista de lo revisado **sin** hallazgos, para que se vea que se ha mirado.

**Para ahí y avisa a Igor.** No toques código en esta fase.

## 4. Fase 2: arreglar (solo lo que Igor apruebe)

- **Un arreglo por commit.** Primero el test que falla y después el arreglo. Ese test pasa a verde y los demás siguen igual.
- **Nunca relajes ni borres una expectativa.** Si un test existente estaba mal, explícalo en el informe antes de tocarlo.
- **Si cambia el resultado de un motor** (otro mazo, otra propuesta u otro ranking con los mismos datos), dilo explícitamente: la app nativa y la web lo notarán.
- **Comprobación final**, con la salida real pegada en el informe:
  - `cd packages/core && npx tsc --noEmit && npx vitest run`
  - `cd app && npx tsc --noEmit && npx vitest run`
  - `cd apps/native && npx tsc --noEmit && npx vitest run`
- **Sin push.** Commits solo con tus archivos (`git commit -- <rutas>`) y el pie `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
