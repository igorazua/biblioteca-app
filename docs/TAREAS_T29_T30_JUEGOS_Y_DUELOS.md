# T29-T30 — Juegos de mesa a la medida de su portada y duelos largos y mezclados (25/10/2026)

> Encargos escritos por Claude con las decisiones de Igor del 25/10. **Los hace Gemini (Antigravity), uno detrás de otro y después de T28.8.** El orden entre T29 y T30 da igual: no comparten archivos. Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.
> Igor revisa en el móvil al acabar cada una y da su opinión.

---

## Normas comunes (las dos tareas)
1. **Cada tarea solo toca sus archivos** (tabla siguiente). Antes de empezar, `git status`: si un archivo que necesitas tiene cambios sin commitear que no son tuyos, **no los commitees**. Apúntalo en el registro y pregunta. Hoy hay dos cambios de Claude sin commitear en `DuelVariants.tsx` (pausa de la elegida) y `Discover.tsx` (mazo que ya no se rehace): **no los toques ni los deshagas**.
2. **Registro obligatorio:** `docs/registro/T29.md` y `docs/registro/T30.md`, con la **salida real, sin resumir,** de cada comprobación y **copiada del terminal**. Las cifras y los ejemplos del registro tienen que salir de los archivos generados: Claude los contrasta.
3. **Un commit por paso**, solo con tus archivos (`git add <archivo>`, nunca `git add -A`), con el mensaje `T29: …` / `T30: …`.
4. **Nada se inventa ni se rellena** con fórmulas, azar o valores por defecto que parezcan datos.
5. **Nadie edita `seed.json` a mano:** los datos entran por los scripts y `npm run engine:build`.
6. Al acabar: `node app/node_modules/typescript/bin/tsc -p app/tsconfig.json --noEmit` limpio y los tests indicados en verde, pegados en el registro.
7. **Sin revisión visual por tu parte** (sin capturas ni navegador) y **sin desplegar**. Al final, una lista corta de qué tiene que mirar Igor en el móvil.

| Tarea | Archivos que solo toca ella |
|---|---|
| **T29 · Juegos a la medida de su portada** | `app/scripts/engine/poster-ratios.mjs` (nuevo), `app/scripts/engine/covers.mjs` (solo para apuntar la proporción al subir una portada), `app/scripts/cache/attrs/posterRatio.jsonl` (nuevo, generado), `app/src/data/seed.json` (solo regenerado por `npm run engine:build`), `app/src/types.ts` (un campo), `app/src/lib/posterShape.ts`, `app/src/lib/posterShape.test.ts` (nuevo), `app/src/components/Poster.tsx`, `app/src/components/SwipeDeck.tsx` (solo `CardFace`), `app/src/screens/ItemDetail.tsx` (solo la cabecera con la portada) |
| **T30 · Duelos largos y mezclados** | `app/src/lib/ranking.ts`, `app/src/lib/ranking.test.ts`, `app/src/screens/CompareSession.tsx`, y solo para adaptar las llamadas a `planNextDuel`: `app/src/screens/CompareHome.tsx` y `app/src/lib/compareOverview.ts` |

---

## T29 — La ficha y la tarjeta del mazo de los juegos toman la forma de su portada

### Por qué
Las cajas de los juegos tienen formas muy distintas. Claude midió las 1.018 portadas guardadas en `app/scripts/cache/covers/boardgame/`:

| Forma (ancho / alto) | Juegos |
|---|---|
| Vertical (< 0,8) | 323 |
| Casi 3:4 (0,8 – 0,95) | 34 |
| Cuadrada (0,95 – 1,05) | 496 |
| Apaisada (> 1,05) | 165 |

Hoy todas se meten en un hueco vertical 2:3 con relleno difuminado, así que una caja cuadrada o apaisada se ve pequeña y rodeada de borrón. **Igor quiere que la tarjeta se adapte a la portada.**

### Lo que decidió Igor con Claude
- **Se adapta:** la **ficha del juego** (cabecera de `ItemDetail`) y la **tarjeta grande del mazo de Descubrir** (`CardFace` de `SwipeDeck`).
- **No cambia:** rejillas, listas, miniaturas, perfil, listas públicas y duelos. Ahí se mantiene el hueco vertical 2:3 con la imagen entera y el relleno difuminado de ahora, porque con alturas distintas las rejillas se descuadran.
- **Nunca se recorta la caja:** la imagen se ve entera (`object-contain`) y, si sobra algo de hueco, se rellena con la propia imagen difuminada, como ahora. Cuando el hueco tiene la forma exacta de la portada, no sobra nada y no se ve borrón.
- **Solo juegos de mesa.** Pelis, series y libros siguen verticales; artistas y canciones, cuadrados (T27).

### 29.1 El dato: la proporción de cada portada (`posterRatio`)
- `posterRatio` = ancho / alto de la portada guardada, con 3 decimales (por ejemplo, `1.000` o `0.712`). Se mide **en los scripts**, nunca en el navegador, para que la tarjeta salga con su tamaño desde el primer momento y no dé un salto al cargar la imagen.
- **Nuevo `app/scripts/engine/poster-ratios.mjs`:**
  1. Recorre `app/scripts/cache/covers/<estantería>/*.webp` de **todas** las estanterías. Lo usarán solo los juegos, pero el dato sirve para todo y cuesta lo mismo.
  2. Mide cada imagen con `sharp` (`metadata()` → `width / height`).
  3. Relaciona el archivo con su obra: el nombre del archivo es el slug del id (`1775-rebellion-2013.webp` → `boardgame:1775-rebellion-2013`). **Antes de escribir nada**, comprueba esa relación contra `seed.json` y apunta en el registro cuántos archivos no casan con ninguna obra y cuántas obras con portada real no tienen archivo. Si no casan más de 5 juegos, para y apúntalo.
  4. Escribe `app/scripts/cache/attrs/posterRatio.jsonl`, una línea por obra, con el mismo formato que los demás atributos: `{"id":"boardgame:1775-rebellion-2013","value":0.712,"src":"measured","conf":1,"at":"2026-10-25"}`.
  5. Las obras con póster generado (sin imagen real) **no llevan** `posterRatio`.
- `npm run engine:build` lo mete en `seed.json` (`build.mjs` ya fusiona todos los `attrs/*.jsonl`). Comprueba que `measured` no se pisa ni pisa nada por la jerarquía de fuentes de `attrs.mjs`. Si hace falta, añade `measured` a esa lista y apúntalo.
- **`covers.mjs`:** cuando sube o cambia una portada, mide la imagen y añade su línea a `posterRatio.jsonl`, para que el dato no se quede viejo.
- En `types.ts`, `Item.posterRatio?: number` con el comentario `/** ancho / alto de la portada guardada (medido en scripts) */`.
- **Añádelo al script `npm run engine`** para que se regenere solo (por ejemplo, `engine:ratios` antes de `engine:build`).

**En el registro:** cuántos juegos tienen `posterRatio`, del total de juegos con portada real (tiene que ser el 100 %), la misma tabla de formas de arriba sacada del `seed.json` regenerado y 10 juegos con su proporción (5 verticales, 5 apaisados).

### 29.2 La regla, en una sola función pura
En `app/src/lib/posterShape.ts`:
```ts
/** Cómo se pinta la portada de un juego de mesa en la ficha y en la tarjeta del mazo (T29). */
export type BoardgameLayout =
  | { mode: 'portrait' }                  // como ahora: hueco vertical a sangre, imagen entera y relleno difuminado
  | { mode: 'top'; aspect: number }       // imagen arriba a todo el ancho con esta proporción (ancho / alto) e información debajo

export const BOARDGAME_RATIO = { deckTopFrom: 0.9, deckMin: 1, deckMax: 1.6, detailMin: 0.75, detailMax: 1.6 }

export function boardgameDeckLayout(ratio?: number): BoardgameLayout
export function boardgameDetailAspect(ratio?: number): number | null
```
- **Mazo, `boardgameDeckLayout`:**
  - sin `ratio` o `ratio < 0.9` → `{ mode: 'portrait' }`, exactamente como hoy;
  - `ratio ≥ 0.9` → `{ mode: 'top', aspect: clamp(ratio, 1, 1.6) }`.
  
  ¿Por qué 0,9? La tarjeta del mazo mide siempre lo mismo (2 / 3,15) y, con una imagen casi vertical arriba, no cabría la información debajo. Las cajas verticales ya encajan bien a sangre, como un póster.
- **Ficha, `boardgameDetailAspect`:** sin `ratio` → `null` (la cabecera se queda como hoy, `h-[430px]`). Con `ratio` → `clamp(ratio, 0.75, 1.6)`. El mínimo de 0,75 evita que una caja muy alargada ocupe la pantalla entera: en un móvil de 390 px de ancho, la cabecera mide como mucho 520 px de alto. El máximo de 1,6 evita una tira demasiado fina.
- Las cifras van en `BOARDGAME_RATIO` y no se repiten en ningún otro sitio.
- **Test** (`posterShape.test.ts`, pocos casos):
  - `undefined` → portrait / `null`;
  - `0.71` → portrait en el mazo y `0.75` en la ficha;
  - `0.9` → top 1;
  - `1.0` → top 1;
  - `1.3` → top 1.3;
  - `2.4` → top 1.6 en el mazo y 1.6 en la ficha.

### 29.3 Cómo se pinta
1. **Tarjeta del mazo (`CardFace`), solo juegos:**
   - `portrait` → igual que hoy.
   - `top` → la misma estructura que la tarjeta cuadrada de música (imagen arriba e información debajo, sobre `bg-surface`), pero la caja de la imagen usa `style={{ aspectRatio: aspect }}` en vez de `aspect-square`. Dentro, la portada se ve entera, con el relleno difuminado detrás. Las burbujas de amigos van arriba a la derecha de la imagen, como en música.
   - El tamaño de la tarjeta no cambia, ni los gestos, ni los sellos.
2. **Ficha (`ItemDetail`), solo juegos con `posterRatio`:** la cabecera pasa de `h-[430px]` a `w-full` con `style={{ aspectRatio: boardgameDetailAspect(r) }}`. El degradado inferior, el título y los datos encima siguen igual.
3. **`Poster.tsx`:** la rama de `boardgame` (imagen entera y relleno difuminado) sirve para todos los huecos. No hace falta tocarla salvo que el relleno difuminado se vea cuando no sobra hueco. En ese caso, no lo pintes si la proporción del hueco y la de la portada se diferencian en menos de un 2 %.
4. **El póster que vuela** del mazo a la ficha (`layoutId`) tiene que seguir funcionando: los dos tienen una forma parecida, así que el vuelo queda natural.
5. **Rejillas, listas, miniaturas y duelos:** no se tocan.

### 29.4 Hecho cuando
- El 100 % de los juegos con portada real tienen `posterRatio` en `seed.json`, y el dato se regenera solo con `npm run engine`.
- El test de `posterShape.test.ts` está en verde y tsc está limpio.
- En el registro, **qué tiene que mirar Igor en el móvil**, con 3 juegos concretos y su id, para abrirlos en la ficha y encontrarlos en el mazo: uno vertical (debe verse como hoy), uno cuadrado (imagen cuadrada arriba, sin borrón) y uno apaisado (imagen apaisada arriba, sin borrón).

---

## T30 — Duelos largos y mezclados, con cada obra siempre en su lado

### Por qué (lo que pasa hoy)
En `CompareSession.tsx` y `lib/ranking.ts`:
1. **La sesión se corta a los 7 duelos** (`PAIRS_PER_SESSION = 7`). Al volver a Duelos, solo da tiempo a colocar una o dos obras más.
2. **La misma obra sale hasta 4 veces seguidas.** Colocar una obra nueva es una búsqueda binaria de hasta 4 comparaciones (`PLACEMENT_MAX_COMPARISONS = 4`), y `planNextDuel` sigue con la colocación activa hasta terminarla (`activePlacement`). Da la sensación de clasificar los juegos uno a uno.
3. **La obra que se repite cambia de lado en cada duelo** (`flip = count % 2 === 1`).

### Lo que quiere Igor
- **Sesiones mucho más largas:** se sigue hasta que el usuario decida parar.
- **Ordenar todo a la vez** (Igor, 25/10): *«no quiero que se escojan x pelis no colocadas y se coloquen mediante 3-4 duelos; quiero que de entre todas las obras sin colocar y las ya colocadas se vayan formando pares y vayamos ordenando todo a la vez»*.
- **Si una obra se repite contra varias, siempre en el mismo lado** durante la sesión: si empezó a la izquierda, siempre a la izquierda.

### 30.1 Sin límite de duelos
- Fuera `PAIRS_PER_SESSION` como corte. La sesión sigue mientras `planNextDuel` devuelva un duelo.
- **Cómo se para:**
  - Con una acción visible **«Terminar»** en la cabecera (junto a deshacer), que abre el resumen de siempre («Sesión completada», cuáles subieron, cuáles bajaron y cuáles entraron).
  - Con la flecha de volver: si ya hay algún duelo, también enseña el resumen. Si no hay ninguno, vuelve directamente.
  - Si no quedan duelos posibles, se ve el estado de ahora («completo» o «necesitas más obras»).
- **Progreso:** en lugar de «3 / 7», un contador sin total («12 duelos»). Cada **25 duelos**, un aviso discreto que **no bloquea** («Llevas 25. Sigue o pulsa Terminar») y que se va solo, como el `flash` de ahora. El 25 va en una constante (`DUEL_MILESTONE`).
- Deshacer sigue funcionando como hoy.

### 30.2 Ordenar todo a la vez: una nota por obra que aprende de todos los duelos
**La idea:** se acaba lo de «colocar» una obra con una búsqueda de 3-4 duelos y luego «pulir». Cada obra de la estantería, colocada o no, tiene una **nota interna** que sale de **todos** los duelos del historial. En cada turno se elige, de entre **todas** las obras, la pareja que más ayuda a ordenar. El ranking es simplemente la lista ordenada por esa nota. Es el método clásico de Bradley-Terry, el mismo tipo de idea que el Elo del ajedrez, pero recalculado con todo el historial.

1. **Qué obras entran:** todas las vistas (`status === 'seen'`) de la estantería, estén ya en el ranking o no.
2. **Punto de partida de cada obra** (lo que se cree antes de mirar sus duelos):
   - **Ya en el ranking:** una nota que respeta su posición actual (la 1.ª, la más alta; el resto, repartidas de forma uniforme hacia abajo) con **poca incertidumbre**. Así el orden que ya tiene el usuario no se pierde de golpe y solo cambia cuando los duelos lo piden.
   - **Sin colocar con estrellas:** la nota del centro de su franja de estrellas en el ranking actual (`starBand`), con **mucha incertidumbre**.
   - **Sin colocar y sin estrellas:** la nota del centro del ranking, con **mucha incertidumbre**.
3. **Ajuste:** función pura `fitRatings(items, duels, prior)` en `ranking.ts`, que calcula la nota de cada obra con todos los duelos del historial de la estantería más el punto de partida (máximo a posteriori de Bradley-Terry con una prior normal; unas 50 iteraciones de un método de punto fijo o de gradiente bastan). Devuelve, por obra, `rating` e `uncertainty` (por ejemplo, 1 / √(duelos + peso de la prior)). Tiene que tardar menos de 30 ms con 500 obras y 3.000 duelos: mídelo en el test y pégalo en el registro.
4. **Ranking:** tras cada duelo se vuelve a ajustar y el array de ranking pasa a ser **todas las obras que ya han jugado al menos un duelo, ordenadas por nota**, más las que ya estaban en el ranking aunque no tengan duelos. Se guarda con `applyRanking`, como ahora.
   - **Estrellas:** a las obras que cambian de puesto se les ajustan las estrellas con `clampStars`, igual que hace hoy el pulido con sus `movers`.
   - **Obras nuevas:** una obra sin colocar entra en el ranking en cuanto juega su primer duelo y queda `provisional` hasta tener `RANK_DUELS_FOR_DONE` (3) duelos. Después se marca colocada (`markPlaced`), como ahora.
5. **Qué pareja toca** (función pura `planNextDuel`, con la misma forma de entrada y salida para no romper `CompareHome` ni `compareOverview`; añade `recent: string[]` a la entrada):
   - **Candidatas:** para cada obra, sus vecinas por nota (las 8 de arriba y las 8 de abajo) más 4 obras al azar de toda la estantería, para que también salgan parejas lejanas que comprueben el orden general.
   - **Utilidad de cada pareja:** `cercanía × incertidumbre × novedad`, donde
     - `cercanía` = lo dudoso que es el resultado según las notas (máxima cuando las dos tienen la misma nota),
     - `incertidumbre` = la suma de las incertidumbres de las dos (así las obras sin colocar salen a menudo, pero mezcladas con las demás),
     - `novedad` = 1 si la pareja nunca se ha jugado y 0,1 si ya se jugó.
   - Se descartan las parejas con alguna obra dentro de la **ventana sin repetición** (punto 6).
   - Se elige al azar entre las **5 mejores**, para que haya variedad.
   - Se devuelve `{ kind: 'rank', a, b, subject, opponent }`, donde `subject` es la de más incertidumbre de las dos.
6. **Ventana sin repetición:** una obra no sale en dos duelos seguidos y, si se puede, tampoco dentro de los últimos `NO_REPEAT_WINDOW = 2` duelos. En estanterías con muy pocas obras se relaja: primero a 1 y después a 0. La pantalla guarda `recent` (ids de los últimos duelos de la sesión) y se lo pasa a `planNextDuel`.
7. **Cuándo no quedan duelos:** `planNextDuel` devuelve `null` cuando todas las obras tienen al menos 3 duelos y ninguna pareja candidata supera `MIN_UTILITY` (ajústalo con la simulación de 30.4). Así siguen funcionando los estados «completo» y «necesitas más obras» de `CompareHome` y `compareOverview`.
8. **Lo que se quita de la sesión de Duelos:** `activePlacement`, el patrón `C C P C C P P`, los duelos `place` / `boot` / `refine` y las rachas. **No borres** `startPlacement`, `answerPlacement` ni `finishPlacement`: los sigue usando `PlaceFlow.tsx` (colocar una obra al marcarla como vista), que **no se toca** en esta tarea. Borra solo lo que deje de usarse (búscalo con `grep`).
9. **Deshacer:** borra el duelo del historial y vuelve a ajustar. El ranking vuelve a quedar como estaba antes de ese duelo; el test de 30.4 lo comprueba.
10. Las constantes (`NO_REPEAT_WINDOW`, `DUEL_MILESTONE`, el número de vecinos, el de candidatas al azar, la novedad de una pareja repetida, `MIN_UTILITY` y los pesos de la prior) van exportadas al principio de `ranking.ts`, con un comentario cada una.

### 30.3 Cada obra, siempre en su lado
- La pantalla guarda, para la sesión, el lado de cada obra que ya ha salido: `sides: Record<itemId, 'L' | 'R'>`. Se vacía al empezar una sesión nueva o cambiar de estantería.
- **Al pintar un duelo (a, b):**
  1. si una de las dos ya tiene lado, se queda en él y la otra va al contrario;
  2. si las dos tienen lado y coinciden (las dos «izquierda»), se queda la que **más veces ha salido en la sesión** (empate: la que se está colocando o puliendo, `subject`). La otra va al lado contrario **solo en este duelo**: su lado guardado no cambia;
  3. si ninguna tiene lado, la obra que se coloca o se pule (`subject`) va al lado donde haya menos obras guardadas hasta ahora (empate: izquierda). Las dos quedan guardadas.
- Fuera el `flip = count % 2`. `leftIsSubject` se calcula de verdad a partir del lado que quedó.
- Esta regla es una función pura y testeable (`assignSides(a, b, subject, sides, seenCount)` en `ranking.ts`).
- **Solo en Comparar.** Decidir y el onboarding usan otros duelos y no se tocan.

### 30.4 Tests (`ranking.test.ts`, pocos y de riesgo de datos)
1. **Simulación de usuario:** 60 obras con un orden «real» escondido; 40 ya en el ranking, pero con 8 desordenadas a propósito, y 20 sin ordenar (10 con estrellas, 10 sin). El usuario simulado responde según ese orden, y en el 10 % de los duelos se equivoca. Se juegan 300 duelos con `planNextDuel` y se comprueba:
   - cada obra aparece **exactamente una vez** en el ranking final, sin perder ni duplicar ninguna;
   - las 20 sin ordenar acaban en el ranking y con al menos 3 duelos;
   - **ninguna obra sale en dos duelos seguidos**;
   - **mezcla:** en los primeros 30 duelos aparecen al menos 12 obras sin ordenar distintas y al menos 10 de las ya colocadas;
   - el ranking final se parece al orden real **más** que con el sistema de ahora con los mismos 300 duelos. Mide la tau de Kendall con los dos sistemas también a los 50 y a los 150 duelos, y pega la tabla en el registro.
2. **Deshacer:** tras 10 duelos, deshacer el último deja el mismo ranking que había después del noveno.
3. **Lados (`assignSides`):** una obra que se repite 4 veces contra rivales distintos sale siempre en el mismo lado; también se comprueba el caso de conflicto de 30.3.2.

Pega la salida real de estos tests en el registro. No hacen falta tests de componentes.

### 30.5 Hecho cuando
- Una sesión de Duelos no se corta sola; «Terminar» y volver enseñan el resumen.
- En la simulación, ninguna obra sale dos veces seguidas, las obras sin colocar salen mezcladas con las colocadas desde el principio y el orden final mejora al de ahora.
- Cada obra que se repite mantiene su lado.
- tsc está limpio y los tests de 30.4 están en verde, pegados en el registro.
- En el registro, **qué tiene que mirar Igor en el móvil:** una sesión de unos 30 duelos en Juegos de mesa con obras sin ordenar, fijándose en que salgan mezcladas obras nuevas y ya colocadas, en que no salga la misma seguida, en que la que se repite no cambie de lado, en el aviso de los 25 duelos y en el resumen al pulsar «Terminar».
