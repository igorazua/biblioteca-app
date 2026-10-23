# T19 — Duelos solo con obras conocidas, portadas que faltan, «ranking completo» y portada final de Comparar (23/10/2026)

> Encargo para Gemini, tras la prueba de Igor del 23/10. **Va antes que las partes B y C de T17** y las corrige: hazlas ya con lo que dice aquí. Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.

---

## 1. Los duelos de Decidir: que el usuario conozca SIEMPRE las dos obras

**Lo que pasa:** en libros salen enseguida obras de nicho. Igor: *«tenemos que haber hecho bastantes elecciones entre las más famosas antes de que salgan las de nicho; si no, tendremos que poner el botón de "no las conozco"»*.

**Por qué pasa (medido el 23/10, después de la parte A de T17):** el nivel de fama 1 está casi vacío.

| Estantería | Obras de nivel 1 | Nivel 2 |
|---|---|---|
| Pelis | 53 | 35 |
| Series | 6 | 4 |
| **Libros** | **2** | 1 |
| Juegos | 8 | 4 |
| Artistas | 3 | 0 |

Sin obras de nivel 1, el duelo cae enseguida en el nivel 3, donde están las 500 obras «normales» de cada estantería. Las partes B y C de T17 aún no están hechas.

### 1.1 Niveles de fama por cupo, no por umbral
Sustituye a la definición de `fameTier` de T17 §A.3. En cada estantería y país, se ordena por `notoriety.ES`:

| Nivel | Cupo | Condición extra |
|---|---|---|
| **1** | las **40 primeras** (y como mínimo el 4 %) | `fameLlm ≥ 0.5` |
| **2** | las **80 siguientes** | `fameLlm ≥ 0.25` |
| **3** | el siguiente 30 % | — |
| **4** | el resto | — |

- Una obra que no cumple la condición extra baja al nivel siguiente, y su hueco lo ocupa la siguiente.
- La lista de oro de T17 §A.5 sigue valiendo: todas sus obras de nivel 1 tienen que quedar dentro de las 40.
- **Revisa a mano las 40 de nivel 1 de libros, series, juegos y artistas** y pégalas en `app/scripts/cache/attrs/nivel1.md` para que Igor les eche un vistazo. Si alguna no la conoce casi todo el mundo en España, hay que corregir su `fameLlm`.

### 1.2 Se avanza de fase por decisiones tomadas, no por número de duelo
Sustituye a la tabla de T17 §C.2:

| Fase | Obras | Se pasa a la siguiente cuando… |
|---|---|---|
| **F1 · solo conocidas** | las del usuario (vistas, valoradas, comparadas o en su ranking) + nivel 1 | ha respondido **al menos 5 duelos en F1** **y** tiene al menos 2 dimensiones cerradas |
| **F2 · muy conocidas** | F1 + nivel 2 | ha pulsado **«Seguir buscando» al menos una vez** |
| **F3 · conocidas** | F2 + nivel 3 con `R ≥ 0.6` | — |

- **Nivel 4: nunca, en ninguna fase.**
- Dentro de F1, **siempre que haya pareja posible con obras propias, al menos 1 de las 2 es del usuario**. Si tiene 8 o más obras en la estantería, **las 2** lo son en 2 de cada 3 duelos.
- Si F1 no da para una pareja de la dimensión que toca, **se cambia de dimensión antes que de fase.**

### 1.3 Red de seguridad sin botón
Sale de lo que ya medimos en `dec_duel.ms`:
- Si un duelo tarda **más de 6 segundos**, se entiende que alguna de las dos no le sonaba. Las dos obras quedan marcadas como «dudosas» para ese usuario (`R × 0,5` durante 90 días) y **el siguiente duelo sale solo de sus obras propias o de las 20 más famosas de nivel 1**.
- En `/metricas`, el porcentaje de duelos lentos por fase y estantería. Objetivo: menos del 5 % en F1.

**Si con esto sigue fallando, la decisión de añadir un botón discreto es de Igor. No lo añadas por tu cuenta.**

### 1.4 Tests
- Usuario nuevo en libros: los 5 primeros duelos solo tienen obras de nivel 1.
- Usuario con 10 libros propios: en F1, al menos 1 de cada pareja es suya.
- Un duelo lento: las dos obras quedan marcadas como dudosas y el siguiente duelo sale de las 20 más famosas.

---

## 2. Portadas que faltan
**Medido el 23/10:** obras con portada generada (sin imagen real):

| Estantería | Sin portada real |
|---|---|
| **Libros** | **219** (por ejemplo, *Sin noticias de Gurb* y *El juego del ángel*) |
| Juegos | 78 |
| Pelis | 19 |
| Series | 14 |

Amplía `restore-posters.mjs` y `covers.mjs` (con el mismo control de forma vertical de T14) con estas fuentes, **en orden**:
- **Libros:**
  1. Open Library por ISBN y por `olid` (`-L.jpg`); descarta la imagen de 1×1 que devuelve cuando no tiene portada.
  2. **Google Books API** (`volumes?q=intitle:…+inauthor:…`, sin clave): `imageLinks`, en el tamaño más grande, y `&zoom=0` si la URL lo admite.
  3. Raspado de la ficha en Casa del Libro o Amazon.es (`og:image`).

  Para títulos en español, **prefiere la portada de la edición española**.
- **Juegos:** página de BGG del `bggId` (`og:image`); si no hay `bggId`, búsqueda por nombre y año.
- **Pelis y series:** IMDb `og:image` por `imdbId` (Wikidata P345) y, en series, TVmaze.
- Se sube a 600 px, como en T14.

**Hecho cuando:** quedan menos de 10 sin portada real por estantería, *Sin noticias de Gurb* y *El juego del ángel* tienen la suya, y `check-posters.mjs` pasa.

---

## 3. «Ranking completo» que no lo está
**Lo que ve Igor:** Comparar dice que su ranking de libros está completo, pero en la estantería solo hay 3 libros numerados de 6.

**Causa:**
1. En `lib/compareOverview.ts` y `CompareSession.tsx`, «sin ordenar» se calcula con la marca `entry.ranked`, pero la estantería numera según el **array del ranking** (`rankings[shelf]`). Hay entradas marcadas `ranked: true` que **no están en el array** (datos de ejemplo, importaciones y sincronización), así que cuentan como ordenadas sin estarlo.
2. `completo` también se da cuando `pulido === 100`, es decir, cuando todas las parejas **vecinas** se han enfrentado. Eso no significa que esté completo: quedan parejas sin jugar.

**Arreglo:**
- La fuente de verdad es el array: **sin ordenar = vista y no está en `rankings[shelf]`** (o está provisional), en todos los sitios (`compareOverview`, `CompareSession`, `planNextDuel` y la estantería).
- **Reparación al cargar** (migración del store y también tras sincronizar): las entradas `ranked: true` que no están en el array pasan a `ranked: false`, y las ids del array que no son una vista se quitan. Test en la zona de riesgo de datos.
- `completo` **solo** cuando no queda nada sin ordenar **y** `planNextDuel` devuelve `null` (no queda ninguna pareja sin jugar). Quita la condición `pulido === 100`.
- Texto, cuando de verdad está completo: «Has comparado todas tus [pelis] entre sí. Cuando marques más, seguimos.»
- **En la estantería:** ver §4.3.

---

## 4. Diseño final de Comparar (decisión de Igor)
### 4.1 Duelo: se queda el diseño 3 (abanico)
- En Comparar, al colocar una obra y en Decidir se usa **siempre el abanico**. **Quita el selector de diseño** y el código de los diseños 1 y 2 (`SwipePairDiagonal`, `entero` y lo que solo usen ellos).
- **En Decidir se mantiene el selector de texto A·B·C** (aún se están probando los textos): una pastilla pequeña «Texto A ›».

### 4.2 Portada de Comparar: mezcla del diseño 2 y el 3
Una sola pantalla (`CompareHome.tsx`); quita el selector de portada y el código de los diseños 1, 3 y 4 que no se reutilice.

#### 4.2.1 El «% ordenado» de cada estantería (nuevo; decisión de Igor)
Igor quiere ver junto a cada estantería cuánto le falta por ordenar («Pelis 85 %», «Series 100 %»). Ver lo que falta empuja a ordenar más, porque da rabia no llegar al 100 %. Sustituye a `pulido` en todo lo que se enseña al usuario:
```
bien_ordenada(obra) = está en rankings[shelf]  Y  ha jugado ≥ 3 duelos de ranking   (historial de T16)
ordenado(shelf)     = round(100 · nº de vistas bien ordenadas / nº de vistas)
```
- **Sí puede llegar al 100 %:** basta con que todas tus vistas tengan sitio y al menos 3 duelos. Cada obra nueva que marques lo baja un poco, y eso es lo que da ganas de volver.
- El umbral de 3 va en `params.ts` (`RANK_DUELS_FOR_DONE = 3`).
- `pulido` (parejas vecinas) se queda solo como dato interno para desempatar; el usuario ya no lo ve.
- Se añade a `useCompareOverview()` como `ordenado`, con su test (zona de riesgo de datos).
- Al terminar una sesión, el resumen enseña el avance: «Pelis: del 78 % al 85 %».

#### 4.2.2 Maqueta de la pantalla (de arriba abajo)
Medidas en px, siguiendo `SISTEMA_DISENO.md`. El margen lateral es de 20 px en toda la pantalla.

**1. Cabecera** (`ScreenTitle`, sin flecha):
- etiqueta «COMPARAR»;
- título `text-display` en un máximo de 2 líneas, «12 series esperan su sitio», con la estantería **recomendada** (la primera de la lista de abajo);
- si en ninguna estantería queda nada sin ordenar: «Seguimos puliendo tus series», con la de menor `ordenado`;
- si todas están al 100 %: «Todo en su sitio», con el subtítulo `text-meta` «Marca más en Descubrir y seguimos».

**2. El próximo duelo** (24 px bajo el título):
- dos cartas de 118 × 177 (2:3, `rounded-[10px]`, sin borde): la izquierda girada −5° y la derecha +5°, solapadas 14 px y centradas;
- en medio, un círculo de 34 px con fondo `bg`, borde `line` y una «o» en serif de 14 px en `mute`;
- a 14 px, «*Título A* o *Título B*», con los títulos en serif de 15 px, una sola línea cada uno y puntos suspensivos si no caben;
- a 20 px, el botón principal a todo el ancho del contenido: «Empezar · 7 duelos». Entra en la sesión **empezando por ese mismo duelo**.

**3. Otras estanterías** (32 px bajo el botón):
- etiqueta `text-label` «OTRAS ESTANTERÍAS» y una línea `line` de 1 px a 10 px;
- una sección por estantería **disponible**, sin la recomendada, ordenadas por más sin ordenar y, si empatan, menor `ordenado`. **No hay forma de cambiar el orden.** Separadas 20 px, y toda la sección se puede tocar (entra en sus duelos):
  - **fila del nombre** (alto 24): a la izquierda, el nombre en serif de 18 px; **a su derecha, a 8 px, el `ordenado` en `text-meta`**: «85 %», en `ink` si es 100 % y en `mute` si no. A la derecha del todo, «12 sin ordenar» en `text-meta` o «todo en su sitio» si no queda ninguna. Ejemplo:
    ```
    Pelis  85 %                                   12 sin ordenar
    ```
  - **barra fina** de 2 px a 8 px, a todo el ancho, fondo `surface2`, relleno `ink` al `ordenado` (y `accent` si es la que más falta de esta lista);
  - **fila de pósteres** a 10 px: 46 × 69 (`rounded-md`, separados 6 px) con las obras **sin ordenar** (si no hay, las de la próxima pareja por pulir). Caben las que entren en el ancho; si sobran, la última casilla es un cuadro `surface2` con «+N» en `text-meta`.
- **Estanterías no disponibles** (menos de 2 vistas): al final, en una sola línea `text-meta` y `mute`: «Juegos y Artistas: marca alguna en Descubrir para empezar», con enlace a `/descubrir`.

**4. Final:** 24 px de aire sobre la barra inferior.

### 4.3 Estantería (`Shelf.tsx`) con obras sin ordenar
- Las numeradas, como ahora.
- Debajo, separada 24 px, la etiqueta `text-label` «SIN ORDENAR · 3» y, a la derecha, el enlace de texto «Ordenar» (`accent`), que lleva a `/comparar/:shelf`.
- Las filas sin ordenar son iguales que las numeradas, pero **sin número** (columna en blanco del mismo ancho) y con «sin ordenar» en `text-meta` bajo el autor.
- En la cabecera, junto al recuento: «6 obras · 50 % ordenado».

### 4.4 Sesión completa de verdad
Cuando no queda nada sin ordenar ni ninguna pareja sin jugar:
- título `text-title`: «Has comparado todas tus pelis entre sí»;
- `text-body` en `mute`: «Cuando marques más, seguimos ordenando.»;
- botón principal «Ir a Descubrir» y de texto «Elegir otra estantería».

---

## 5. Reparto en 3 tareas paralelas sin pisarse
Cada tarea **solo toca sus archivos**. Si una necesita algo de otra, lo pide y **no lo toca**. **Nadie edita `seed.json` a mano.**

| Tarea | Qué | Archivos que solo toca ella |
|---|---|---|
| **A · Motor de Decidir** | §1 entero + T17 partes B y C | `lib/engine/` (`decide.ts`, `dimensions.ts`, `recog.ts`, `params.ts`, `metrics.ts` y sus tests), `screens/WhatToWatch.tsx`, `screens/Metrics.tsx`, `scripts/engine/build.mjs` (niveles de fama), `scripts/engine/coverage.mjs`, `scripts/cache/attrs/nivel1.md` |
| **B · Portadas** | §2 entero | `scripts/engine/restore-posters.mjs`, `covers.mjs`, `check-posters.mjs`, `scripts/cache/posters/`, el bucket `biblio-covers`. **No escribe `seed.json`:** deja las URL nuevas en `scripts/cache/attrs/posterUrl.jsonl` (registro de atributos); las mete en el seed el build de A, o `npm run seed` al final |
| **C · Comparar y ranking** | §3, §4 y el % ordenado | `lib/compareOverview.ts` (+ test), `lib/ranking.ts` (+ test), `store/useStore.ts` (migración), `lib/sync.ts`, `screens/CompareHome.tsx`, `screens/CompareSession.tsx`, `screens/Shelf.tsx`, `components/SwipePair.tsx`, `components/DuelVariants.tsx`, `components/PlaceFlow.tsx` |

- **Orden de los commits:** cada una commitea **solo sus archivos** (`git add <archivo>`, nunca `git add -A`) y con un mensaje que empieza por su letra: `feat(A): …`, `fix(B): …`.
- **Cuando acaben las tres:** `npm run seed` (mete las portadas de B y los niveles de A), `npm test`, `tsc` y `coverage.mjs`, con un último commit.
- **Después, tarea D · Textos** (repaso del copy de toda la app con la guía que preparará Claude). No va en paralelo, porque toca todas las pantallas.

---

## Hecho cuando
- Las tres tareas, con sus commits.
- Los tests de §1.4, §3 y §4.2.1 pasan y `tsc` está limpio.
- `coverage.mjs` pasa, con la lista de oro y las portadas.
- Sin revisión visual por vuestra parte: la hace Igor en el móvil.
