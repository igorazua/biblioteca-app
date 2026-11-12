# Encargo: revisión y depuración de los motores (Fable)

> 12/11/2026. Pedido por Igor. Se lanza **cuando C1 esté en `main`**: entonces los motores viven en un solo sitio (`packages/core`) y la PWA y la app nativa los usan los dos.
> Objetivo: encontrar fallos reales y arreglarlos con pruebas, **gastando lo mínimo**. Primero se revisa y se informa. Solo se arregla después del visto bueno de Igor.

## 1. Lo que hay que saber (y solo esto)

- **Qué es la app:** guardar, valorar y comparar pelis, series, libros, juegos de mesa y artistas en estanterías. Tres motores:
  - **Descubrir:** mazo de cartas con swipe en tres direcciones.
  - **¡Duelos!:** ranking por comparación A/B con Elo/Bradley-Terry.
  - **Decidir:** propone qué ver haciendo preguntas y duelos.
  - Debajo de los tres está **el cerebro**: vectores de obra y de usuario.
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

- **No abras los JSON de datos**: `app/src/data/seed.json`, `catalog-index.json`, `shelves/*`, `engine/*` y `anchors/*`. Pesan megas. Si necesitas su forma, mira el tipo en `types.ts` o en `features.ts`.
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
