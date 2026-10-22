# T16 — Comparar: pantalla inicial (4 diseños con selector) y duelos que nunca se repiten (22/10/2026)

> Encargo para Gemini, diseñado por Claude con las decisiones de Igor. Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.

**Decisiones de Igor:**
- Comparar deja de abrir directamente un duelo con las categorías arriba. Ahora abre una **pantalla inicial** que explica cómo funciona y deja elegir qué estantería ordenar.
- Se programan **los 4 diseños** que propuso Claude, con un selector de pruebas como el del duelo.
- Comparar sirve para **dos cosas a la vez**: colocar las obras nuevas (sin ordenar) y **seguir puliendo** el ranking ya ordenado, con parejas que **nunca se hayan enfrentado antes**. Si un día salió *El padrino* contra *Origen*, esa pareja no vuelve a salir nunca; cada una sí puede salir contra otras.

Sigue `docs/SISTEMA_DISENO.md` (estilo editorial sobria) al pie de la letra.

## Parte 1 — Lógica: historial de duelos y mezcla de colocar y pulir

### 1.1 Lo que pasa hoy (para entenderlo)
En `screens/Compare.tsx` y `lib/ranking.ts`:
- en cada sesión se colocan primero **todas** las obras sin ordenar (búsqueda binaria con `startPlacement`) y solo después se refina con `nextRefinePair`;
- `nextRefinePair` solo evita repetir **la última pareja** (`st.last`). No guarda nada entre sesiones, así que las mismas parejas vuelven a salir.

### 1.2 Historial de duelos (nuevo)
- En el store (`useStore`, persistido; sube la versión de la persistencia con su migración): `duels: Record<ShelfType, Record<string, DuelRecord>>`, donde la clave es `pairKey(a, b)` = los dos ids ordenados alfabéticamente y unidos con `|`, y `DuelRecord = { w: string /* id ganador */, at: number }`.
- Se registra **en todos los duelos de Comparar y de colocar una obra** (`PlaceFlow`): arranque (`boot`), colocación (`place`) y refinado (`refine`). Los duelos de **Decidir no cuentan** (no son de ranking).
- **Deshacer** borra también el registro de ese duelo.
- **Nube:** tabla nueva `biblio_duels` (`user_id`, `shelf`, `a`, `b`, `winner`, `at`) con RLS (cada usuario solo lo suyo). Migración `0009_biblio_duels.sql` (Igor ha dado el OK para el trabajo de base de datos). Se sincroniza como las entradas en `lib/sync.ts` (subir lo local y bajar lo de la nube). Estos datos son oro para el cerebro (T11: ganador y perdedor de cada duelo).
- `useStore.lastCompared: Record<ShelfType, number>`: fecha de la última sesión por estantería (para ordenar la pantalla inicial).

### 1.3 Elegir el siguiente duelo (`lib/ranking.ts`, funciones puras)
Nueva función `planNextDuel(input) → Duel | null`, que **no modifica nada**; la pantalla inicial también la usa para enseñar el próximo duelo (diseño 2). Entrada: el ranking de la estantería, las sin ordenar, el historial `duels[shelf]`, las comparaciones por obra (`cmp`), el estado de la sesión y el generador aleatorio.

**Reparto de la sesión (7 duelos):**
- Si hay obras sin ordenar **y** el ranking tiene 6 o más obras: se intercalan colocar y pulir en el patrón **C C P C C P P**. Si una colocación necesita más duelos, sigue con ella aunque el patrón diga P; lo que no cabe pasa a la siguiente sesión.
- Si hay obras sin ordenar y el ranking tiene menos de 6: solo colocar.
- Si no hay obras sin ordenar: solo pulir.
- **Colocar** sigue igual (búsqueda binaria), pero si el rival que toca ya se enfrentó a esa obra, se usa el resultado guardado sin preguntar y se avanza al siguiente rival.

**Pulir: cualquier pareja que nunca se haya jugado, con mezcla de fáciles y difíciles.**
Decisión de Igor (22/10/2026): **no tienen que ser obras cercanas en el ranking.** Unas veces elegir será fácil y otras costará; no puede ser todo el rato dudar. Así que cada duelo de pulir sale de uno de dos sorteos:
1. **Pareja libre (60 % de las veces):** cualquier pareja de la estantería que **no esté en el historial**, a cualquier distancia. Se sortea con probabilidad ∝ `novedad`, para que las obras con menos duelos salgan más.
2. **Pareja dudosa (40 % de las veces):** solo entre las no jugadas con `|i − j| ≤ 3`, con probabilidad ∝ `novedad · peso_arriba`. Son las que más afinan el orden.
   ```
   novedad     = 1 / (1 + min(cmp_a, cmp_b))           (la que menos duelos lleva sale más)
   peso_arriba = 1.5 si las dos están en el 20 % de arriba (es lo que se ve en «Lo que más me marcó»), si no 1
   ```
3. Nunca salen **dos parejas dudosas seguidas** si hay libres disponibles. Si en un sorteo no queda ninguna candidata (por ejemplo, ya no quedan dudosas), se usa el otro.

   Los porcentajes van en `params.ts` (`POLISH_FREE_SHARE = 0.6`) para poder ajustarlos.
4. Las rachas (`jumpUp`/`jumpDown`, 3 victorias o derrotas seguidas) se mantienen, pero también saltan las parejas ya jugadas: se busca el rival más cercano a la posición objetivo que no esté en el historial.
5. Si no queda ninguna pareja posible (estantería pequeña con todo jugado): `null` → estado «Tu ranking de X está completo».
6. **Al aplicar el resultado de una pareja libre (lejana):**
   - si confirma el orden actual (gana la que ya estaba más arriba), el ranking no cambia;
   - si lo contradice, **la ganadora sube hasta justo encima de la perdedora** (con `insertAt`, no un intercambio, que movería dos obras lejos de golpe), y la obra pasa a ser el sujeto de una racha para que los siguientes duelos ajusten su sitio exacto.

   En las parejas dudosas (vecinas) se mantiene el intercambio actual.
7. Si un resultado contradice un duelo anterior directo (A ganó a B y ahora B queda por encima por un intercambio), manda el más reciente. El anterior se queda en el historial (no se borra), y la pareja ya no vuelve a salir.

### 1.4 Datos para la pantalla inicial (`lib/compareOverview.ts`, función pura + hook `useCompareOverview()`)
Por estantería: `sinOrdenar` (vistas sin ordenar o provisionales), `enRanking`, `pulido` y `ultima` (`lastCompared`).
- `pulido` (0-100) = porcentaje de parejas vecinas `(i, i+1)` del ranking que se han enfrentado directamente.
- `disponible`: hay al menos 2 vistas, o 1 sin ordenar y un ranking de al menos 1.
- `total` (para el diseño 4) = la media de `pulido` de todas las estanterías con ranking, ponderada por `enRanking`. Las obras sin ordenar cuentan como 0 % pulido.

### 1.5 Tests (zona de riesgo de datos: sí hacen falta)
En `lib/ranking.test.ts`:
- En 1.000 sorteos de pulir, entre el 50 % y el 70 % son parejas libres (lejanas) y nunca hay dos dudosas seguidas si quedan libres.
- `planNextDuel` **nunca devuelve una pareja que ya está en el historial**: simula 300 duelos sobre un ranking de 30 obras con respuestas al azar y comprueba que no se repite ninguna pareja.
- Con todas las parejas jugadas devuelve `null`.
- La colocación salta a los rivales ya jugados y usa su resultado.
- Deshacer quita el registro.
- La migración del store conserva las entradas y los rankings y crea `duels` vacío.

## Parte 2 — Pantalla inicial de Comparar (4 diseños con selector)

### 2.1 Flujo
- La pestaña **Comparar** abre `/comparar` = la **pantalla inicial**. Al elegir una estantería se va a `/comparar/:shelf` = los duelos.
- **En los duelos desaparecen los chips de categorías.** La cabecera (`ScreenTitle`) queda así: etiqueta «COMPARAR · SERIES», contador «3 de 7», flecha para volver a la pantalla inicial, título «¿Cuál te gustó más?» y «Deshacer» como acción de texto.
- **Al acabar los 7 duelos**, el resumen actual (suben / bajan / nuevas) con dos botones: principal «Seguir con Series» (otra sesión) y de texto «Elegir otra estantería».
- Con el ranking completo y nada sin ordenar: «Tu ranking de Series está completo», con un botón de texto para volver.

### 2.2 Selector de pruebas
Como el del duelo: una pastilla pequeña abajo a la derecha, **«Portada n/4 ›»**, que abre un menú con 1 · 2 · 3 · 4. Se guarda en `localStorage` con la clave `biblioteca-compare-home` (por defecto 2). Va encima de la barra inferior, sin tapar el botón principal.

### 2.3 Elementos comunes a los 4 diseños
- La cabecera usa `ScreenTitle` sin flecha (es una pestaña principal), etiqueta «COMPARAR».
- **Orden de las estanterías** (diseños 1, 3 y 4; en el 2, para las «otras»): control de pestañas de texto **«Más por ordenar · Recientes · Fijo»**:
  - pestaña activa en `ink` con una línea de 1,5 px en `accent` debajo; el resto en `mute`;
  - *Más por ordenar* = `sinOrdenar` de mayor a menor y, si empatan, menos `pulido` primero;
  - *Recientes* = `ultima`, de la que llevas más tiempo sin comparar a la última;
  - *Fijo* = Pelis, Series, Libros, Artistas, Juegos.

  Se guarda en `localStorage` (`biblioteca-compare-order`). Por defecto, *Más por ordenar*.
- Estantería **no disponible**: con opacidad 0,45 y el texto «Marca alguna en Descubrir», que lleva a `/descubrir`.
- Estantería **completa** (sin nada sin ordenar y sin parejas por pulir): «todo ordenado» en `mute`, sin flecha.
- Datos de `useCompareOverview()`. **Nada de cifras inventadas.**
- Medidas de `SISTEMA_DISENO.md`: margen lateral de 20 px, títulos en serif Fraunces 500 y el resto en Inter. Sin desenfoques, brillos ni degradados.

### 2.4 Diseño 1 · «Índice de revista»
- Cabecera: título «Ordena lo que has visto» (`text-display`, en dos líneas). Debajo, la entradilla en `text-body` y `mute`, con un máximo de 270 px de ancho: «Dos obras, eliges la que más te gustó y tu ranking se ordena solo. Siete duelos, un minuto.»
- 24 px más abajo, las pestañas de orden y una línea `line` de 1 px a todo el ancho del contenido.
- **Una fila por estantería**, separadas por líneas de 1 px y con 16 px de padding vertical:
  - a la izquierda, **el número de `sinOrdenar`** en serif de 38 px (interlineado 1), en una columna fija de 52 px. Es **ámbar solo en la primera fila** y `ink` en el resto;
  - en el centro, el nombre de la estantería en serif de 18 px y, debajo, `text-meta`: «sin ordenar · 34 en tu ranking»;
  - si `sinOrdenar` es 0 pero queda por pulir, el número es el `pulido` con «%» y el texto, «pulido · 34 en tu ranking»;
  - a la derecha, un chevrón `mute`. Toda la fila se puede tocar (mínimo 64 px de alto).

### 2.5 Diseño 2 · «El próximo duelo» (por defecto)
- Etiqueta «COMPARAR · SERIES», con la estantería recomendada (la primera según el orden elegido).
- Título `text-display` en dos líneas: «12 series esperan su sitio». Si no hay ninguna sin ordenar, «Seguimos puliendo tus series».
- 24 px más abajo, **el próximo duelo real** (`planNextDuel`, sin consumirlo):
  - dos pósteres de 118 × 177 px (2:3), el de la izquierda girado −5° y el de la derecha +5°, solapados 14 px y centrados;
  - en medio, un círculo de 34 px con fondo `bg`, borde `line` y una «o» en serif de 14 px en `mute`.
- Debajo, a 14 px: «*Breaking Bad* o *La cúpula*», con los títulos en serif de 15 px y la «o» en `text-meta`.
- 20 px más abajo, el **botón principal** a todo el ancho del contenido: «Empezar · 7 duelos». Al pulsarlo se entra en los duelos **empezando por ese mismo duelo**.
- 24 px más abajo, la etiqueta «O ELIGE OTRA ESTANTERÍA» y, a 10 px, **chips** (`rounded-full`, borde `line`, 13 px) con el nombre y su cifra `sinOrdenar` en `mute`: «Pelis 8». Las no disponibles no aparecen; las completas salen con «✓» en lugar de cifra.
- **No hay explicación**: el duelo de muestra ya lo explica. La primera vez, debajo del botón, una línea `text-meta`: «Elige la que más te gustó. Tu ranking se ordena solo.» (se guarda que ya se vio).

### 2.6 Diseño 3 · «Estanterías con lomos»
- Título `text-display`: «¿Qué ordenamos hoy?». Debajo, `text-meta`: «Elige una estantería. Siete duelos, un minuto.»
- Las pestañas de orden, a 20 px.
- Una sección por estantería, separadas 20 px:
  - fila de cabecera: nombre en serif de 18 px a la izquierda y `text-meta` a la derecha: «12 sin ordenar» (o «78 % pulido» si no queda ninguna sin ordenar);
  - a 9 px, **una fila de pósteres pequeños** (46 × 69 px, `rounded-md`, separados 6 px) con las obras **sin ordenar** (si no hay, las de la próxima pareja por pulir). Caben las que entren en el ancho; la última casilla es un cuadro `surface2` con «+N» en `text-meta` si sobran;
  - toda la sección se puede tocar.
- Si la lista no cabe, la pantalla hace scroll; la cabecera no se queda fija.

### 2.7 Diseño 4 · «Mapa de tu ranking»
- Título `text-display` con el total: «Tu ranking, al 78 %» (`total` de §1.4, redondeado). Debajo, `text-meta`: «Cada duelo coloca una obra en su sitio.»
- Las pestañas de orden.
- Una fila por estantería disponible, separadas 18 px:
  - nombre en serif de 17 px a la izquierda y, a la derecha, «34 de 46» en `text-meta` (ordenadas y pulidas de un total);
  - a 8 px, **barra** de 6 px de alto, `rounded-full`, fondo `surface2`, con el relleno al `pulido` de esa estantería contando las sin ordenar como 0. **Solo la barra de la estantería con más camino por recorrer va en `accent`**; las demás, en `ink`;
  - toda la fila se puede tocar.
- 26 px más abajo, el botón principal: «Completar Series» (la de la barra en ámbar).
- Cuando una estantería llega al 100 %, su barra se queda en `ink` con «✓» al lado del nombre.

## Hecho cuando
- La pestaña Comparar abre la pantalla inicial; los 4 diseños funcionan con datos reales y se cambian con la pastilla.
- En los duelos ya no hay chips de categorías; el resumen final tiene «Seguir con…» y «Elegir otra estantería».
- `planNextDuel` mezcla colocar y pulir según §1.3 y **no repite nunca una pareja**, también entre sesiones y tras recargar.
- El historial se guarda en el móvil y en `biblio_duels`.
- Los tests de §1.5 pasan, `tsc` está limpio y hay un commit por parte (lógica y pantalla).
- Sin revisión visual por tu parte: la hace Igor en el móvil.
