# DIRECCIÓN DE ARTE — ESCRITORIO (≥ 1024 px)

> Encargo de Igor (17/11/2026): «en escritorio parece vibecodeada, no tiene personalidad». El móvil sí le gusta y **no cambia**: todo lo de aquí va con `lg:` (o en `@media (min-width: 1024px)`).
> Complementa `SISTEMA_DISENO.md` y `DISENO_ESCRITORIO.md`, que siguen mandando en estructura (barra lateral, rutas, 1120 px, atajos). Este documento manda en **aspecto**. Escrito a partir del código, sin capturas.

---

## 1. Diagnóstico: qué delata la plantilla

1. **Todo es una caja igual.** `rounded-3xl bg-surface border border-line` en las estanterías de Biblioteca (`Library.tsx:136`), en las tarjetas de Descubrir (`Discover.tsx:402`), en la columna de accesos de Perfil (`Profile.tsx:288`), en el estado vacío de amigos, en «Mis números»… Mismo radio, mismo borde y mismo fondo para cosas de distinto peso. Así se ve un panel de administración, no una revista.
2. **Rejillas uniformes de tarjetas.** Biblioteca: dos columnas iguales de cajas (`lg:grid-cols-2`). Descubrir: 3-4 columnas de tarjetas idénticas (`lg:grid-cols-3 xl:grid-cols-4`). Duelos: `lg:grid-cols-3` para «Otras estanterías» (`CompareHome.tsx:218`). Es el patrón de las tres columnas iguales, lo primero que delata la IA.
3. **Barra lateral genérica.** `SideNav.tsx`: fondo `surface` + borde, filas en pastilla `rounded-xl` con fondo `surface2` al estar activa, icono + texto en Inter y una raya ámbar. Es la barra de cualquier SaaS. La marca es un `text-title` sin intención. Además gasta el **ámbar** en todas las pantallas, así que la pantalla ya no puede tener su único acento (SISTEMA §4).
4. **Cabeceras sin jerarquía.** `ScreenTitle` sube a 40 px en escritorio y nada más: el título de Biblioteca («Hola, Igor.»), el de la Ficha y el de Ajustes pesan igual. En Descubrir el hub usa `text-2xl font-bold` + `text-[11px] font-bold text-accent` (`Discover.tsx:379-382`), fuera de la escala y con el acento en una etiqueta.
5. **El número del ranking se lee mal.** En la rejilla de la Estantería (`Shelf.tsx:330`) el `.rank-num` hueco va **encima del póster** a 48 px, con trazo blanco al 55 % y `drop-shadow`. Sobre una portada clara o con mucho detalle desaparece. En el móvil (`PosterTile`, `ItemRow.tsx:13-40`) funciona porque el número va **fuera** del póster, sobre el fondo, y el póster se le monta encima.
6. **Efectos sueltos de plantilla.** Cabecera de Estantería con `linear-gradient(160deg…)` metida en una caja `lg:rounded-2xl` (`Shelf.tsx:76`). Botones circulares con `backdrop-blur` (`Shelf.tsx:81`). Decidir: collage de pósteres al 30 % de opacidad bajo un degradado (`WhatToWatch.tsx:600-605`). Perfil: insignias circulares ámbar con el puesto (`Profile.tsx:198`) y un icono en cuadradito tintado (`Library.tsx:210`). Botón flotante «Ordenar» con `shadow-xl shadow-black/40`.
7. **Ámbar por todas partes.** Solo en Biblioteca: el «+», cada «Ver todo» (×5), el icono de votar y la raya de la barra. En Perfil: «Ranking completo», «Añadir», las insignias y los porcentajes.
8. **Fallo real:** `Discover.tsx:402` usa `hover:border-line2`, y `--color-line2` no existe. Ese hover no hace nada.

## 2. La idea: **el pliego**

El escritorio es **la doble página de una revista cultural impresa sobre papel oscuro**. El móvil ya tiene la tinta (Fraunces, el papel cálido `#1e1b17`, los números huecos, los sellos). Al escritorio le falta la **maqueta**. En una revista no hay cajas: hay **columnas, filetes finos y números grandes en el margen**.

Tres consecuencias, y todo lo demás sale de aquí:
- **Filetes en vez de cajas.** Las secciones se separan con una línea de 1 px y aire, no con tarjetas.
- **Una columna de margen.** Cada sección pone su título (serif) en una columna estrecha a la izquierda y el contenido a la derecha, como los ladillos de una revista. Esa asimetría es la personalidad.
- **El número es tipografía.** Los puestos del ranking son el folio de la página: grandes, huecos, sobre el papel y nunca sobre la imagen.

## 3. Reglas

### 3.1 Tipografía
| Token | Escritorio | Uso |
|---|---|---|
| `text-hero` (nuevo) | Fraunces 400, 64 / 0.95, `-0.03em`, `opsz 144`; 56 en `lg`, 64 en `xl` | **Uno por pantalla y solo en las de entrada:** saludo de Biblioteca, nombre de la Estantería, título de la Ficha, nombre en Perfil |
| `text-display` | 40, **peso 400** en `lg:` (hoy 500) | título de las demás pantallas (Duelos, Decidir, Descubrir, Ajustes) |
| `text-section` (nuevo) | Fraunces 400, 28 / 1.1, `-0.02em` | título de sección en la columna de margen |
| `text-title`, `text-item` | mismo tamaño, **peso 400** en `lg:` | |
| `text-body`, `text-meta`, `text-label` | igual | sin cambios |

- **Cursiva (Fraunces italic):** solo en (a) **títulos de obra dentro de una frase** o de una pregunta («*Dune* o *Arrival*», como ya hace `CompareHome.tsx:192`), (b) el **nombre propio del saludo** («Hola, *Igor*.») y (c) el **logotipo** de la barra lateral. Nunca en botones, navegación, etiquetas ni párrafos.
- **Serif:** títulos, números grandes y nombres de estantería. Inter para todo lo que se lee de corrido o se pulsa.
- **Pesos:** serif a 400 en todo el texto (más fina que el 500 del móvil, porque es más grande); 800 **solo** en los números huecos (`.rank-folio`, `.rank-num-xl`); Inter a 400/500. Fuera los `font-bold` y `font-semibold` de los títulos.
- **Etiquetas en mayúsculas (`text-label`):** como mucho una por bloque, en `mute`, nunca en ámbar.

### 3.2 Composición
- **Rejilla editorial `ed-grid`:** 12 columnas, hueco de 32 px, dentro del ancho de 1120 px. La disposición base es **margen 3 + cuerpo 9**: título de sección, contador y enlace en las columnas 1-3; contenido en las 4-12.
- **Asimetría deliberada:** el título de pantalla (`text-hero`) arranca en la columna 1 y el subtítulo se alinea con la columna 4 (`lg:col-start-4`), en la línea base del título. Nada centrado salvo los estados vacíos y el mazo.
- **Aire:** 64 px entre secciones (nuevo valor, ver §6), 24 entre el filete y el contenido, 48 px por encima del título de pantalla.
- **Lo que se rompe a propósito:** el carrete de la Estantería sangra a todo el ancho de la zona de contenido (sin radio), y el `text-hero` se monta 24 px sobre su borde inferior. Ese es el único solape de la app.
- **Medida de lectura:** 62ch como máximo (sinopsis y comentarios).

### 3.3 Superficies
- **Por defecto, nada:** el contenido va sobre `bg`. Las secciones se separan con `rule-t` (filete superior de 1 px `--color-rule`).
- **Sí borde (1 px `line`):** campos de texto, botones secundarios y la carta del mazo.
- **Sí fondo `surface`:** solo lo que flota (hojas, diálogos, avisos) y las tarjetas de respuesta de Decidir y las de duelo (son cartas físicas, decisión de Igor).
- **Prohibido en `lg:`:** sección dentro de una caja con borde y fondo a la vez; `rounded-3xl`. Los radios quedan en 10 px para pósteres, 12 para botones y campos, 18 para cartas de duelo y 24 para hojas.

### 3.4 Barra lateral con carácter (el índice)
Es **el índice de la revista**, no un menú de SaaS:
- Mismo `bg` que la página (fuera `bg-surface`), separada solo por un filete vertical `--color-rule`.
- Arriba, el logotipo «*Biblioteca*» en Fraunces italic a 28 px (`text-section italic`), a 32 px del borde superior.
- Las cuatro secciones en **Fraunces 20 px** sin icono, cada una con su folio a la izquierda en `text-label` tabular («01», «02»…, color `faint`). Filas de 44 px, sin fondo ni radio.
- **Activa:** texto `ink` y un filete `ink` de 16 × 1 px delante del folio. **Inactiva:** `mute`. **Hover:** `ink` en 160 ms. **Sin ámbar**: el acento es de la pantalla.
- Abajo, el perfil igual que hoy (avatar 32 + nombre), sin fondo al estar activo: nombre en `ink` y filete delante.

### 3.5 Los números del ranking en la rejilla
Se copia la relación del móvil (`PosterTile`): **el número va fuera del póster.**
- **Celda nueva `rank-cell`:** el póster arriba; debajo, una fila con el número a la izquierda y el título y el año a la derecha. El número es `.rank-folio`: Fraunces 800, 56 px, `line-height 0.8`, hueco con trazo de 1.25 px de `--rank-stroke` y sobre `bg`. (`.rank-num`, el del móvil, **no se toca**.) Así siempre se lee.
- **Podio:** las tres primeras van en **una fila propia encima de la rejilla** (no `col-span`, porque `posterBox()` da proporciones variables y la música es cuadrada). Son tres celdas de 1/3 del cuerpo con `.rank-num-xl` (120 px) **a la izquierda del póster y por detrás de él**, exactamente como el `PosterTile` del móvil (número sobre `bg` y póster montado encima). El nº 1 lleva el número relleno en `ink` (`.rank-num-solid`) y el 2 y el 3 hueco.
- Del 4 en adelante: `PosterGrid` normal con `rank-cell`. Hover: el número pasa de hueco a relleno `ink` en 240 ms.
- Las «Nuevas» (sin puesto) no llevan número: un guion largo `—` en `faint` donde iría.

### 3.6 Hover y movimiento
- Curva única: `--ease-pliego: cubic-bezier(0.22, 1, 0.36, 1)`. Duraciones: **160 ms** (color, subrayado), **240 ms** (desplazamiento, relleno del número) y **400 ms** (entrada de pantalla).
- **Póster:** sube 3 px (`hover-lift`, con la nueva curva) y el título de debajo se subraya. Sin escala ni sombra.
- **Enlaces de texto (`link-ed`):** el subrayado de 1 px crece de izquierda a derecha (`background-size` de 0 a 100 %) en 160 ms.
- **Filas con filete:** el texto pasa de `mute` a `ink`. Sin fondo.
- **Entrada:** al montar una pantalla, las secciones aparecen escalonadas (opacidad 0 → 1 y y 8 → 0 px, 30 ms entre secciones, como mucho 6). Solo la primera vez por ruta. Con `prefers-reduced-motion`, nada.

### 3.7 Lista anti-slop (prohibido en `lg:`)
- Cajas `bg-surface border border-line rounded-2xl/3xl` como contenedor de sección.
- Rejillas de tarjetas iguales de 2, 3 o 4 columnas para elegir estantería (Biblioteca, Descubrir, Duelos, Decidir).
- Pastillas con fondo como estado activo de navegación. Iconos dentro de cuadraditos tintados (`bg-accent/15`).
- Más de un elemento ámbar por pantalla, ámbar en etiquetas, en «Ver todo» o en porcentajes.
- Insignias circulares con el puesto. Número del ranking encima de la imagen.
- Degradados decorativos (`linear-gradient` de color de estantería), collages a baja opacidad bajo un degradado, `backdrop-blur` en botones y `shadow-xl` en botones.
- `hover:scale`, `hover:opacity-90` y `group-hover:translate-x` en flechas.
- `font-bold` en títulos, `text-[Npx]` sueltos, títulos centrados y emojis.
- **Excepciones que se quedan** (SISTEMA §1.3, decisiones de Igor): el resplandor ámbar de «No conozco ninguna», el borde iluminado azul/dorado de la carta elegida (`DuelVariants.tsx:501`) y el fondo difuminado de juegos y artistas. Los sellos del swipe tampoco se tocan.

## 4. Por pantalla

**Barra lateral (`SideNav.tsx`)**: lo de §3.4. 1) Fuera `bg-surface` y `border-line`: `bg-bg` y `border-r` en `--color-rule`. 2) Logotipo `text-section italic`. 3) Filas `nav-ed` con folio, sin icono ni fondo. 4) Sin ámbar.

**Biblioteca (`Library.tsx`)**
1. Cabecera: `text-hero` «Hola, *Igor*.» y el subtítulo «214 en tu biblioteca · 38 pendientes» en `text-meta` alineado a `col-start-4`. El «+» pasa a botón de texto «Añadir» con icono (es el único ámbar de la pantalla, en `text-accent`) y el avatar desaparece (ya está en la barra).
2. Fuera la rejilla de dos cajas. Cada estantería es una **fila `ed-grid` con `rule-t`**: columnas 1-3 con el nombre en `text-section`, el recuento en `text-meta` y un `link-ed` «Ver todo» en `ink`; columnas 4-12 con el carrete de `PosterTile` que ya existe (números huecos fuera del póster, el mismo patrón del móvil).
3. Estantería vacía: en el cuerpo, una frase en `text-body` y dos `link-ed` («Descubrir», «Importar»), sin cajas `surface2` ni pósteres inclinados.
4. «Vota nuevas estanterías»: una fila con filete al final, sin icono en cuadradito.

**Estantería (`Shelf.tsx`)**
1. Cabecera: el carrete sangra a todo el ancho de la zona de contenido, 240 px de alto, **sin radio y sin el degradado de color**. Solo queda el oscurecido inferior hacia `bg` (`from-transparent to-bg`). El nombre va en `text-hero`, montado 24 px sobre el borde. Debajo, en una línea de `text-meta`: «48 obras · 62 % ordenado» (el porcentaje en `ink`, no en `pctColor`).
2. Volver y «+» sin `backdrop-blur` ni círculo: texto «← Biblioteca» (`link-ed`) e icono «+» de 24 px.
3. Podio de 3 + rejilla `rank-cell` (§3.5). La etiqueta «NUEVAS · 5» con `rule-t` encima.
4. Pestañas: se quedan (subrayado de 2 px), pero en `ink` en vez de ámbar.
5. «Ordenar» sigue **flotando** (decisión de Igor: a mano con 200 obras). En `lg:` va abajo a la derecha de la zona de contenido, sin `shadow-xl`. Es el único ámbar.

**Ficha (`ItemDetail.tsx` + `DetailTwoCol`)**
1. Título en `text-hero` (sin cursiva: es el título de la página, no una cita); encima, `text-label` «PELÍCULA · 1999».
2. Los `Tag` de géneros y plataformas se sustituyen por una **ficha técnica** `dl` con filetes, **solo con los campos que ya existen**: Año (`year`), Autor (`creator`, con su enlace a `artistId` si lo hay), Datos (`itemFacts(item)`), Géneros (`genres`, separados por « · ») y Dónde (`platforms`). Etiqueta en `text-label` a la izquierda (140 px) y valor en `text-body`. El enlace de Spotify de las canciones se queda, como última fila.
3. Sinopsis con `lg:text-lead` (17 px, 62ch, §5).
4. «Tu estado»: los tres botones se quedan, sin `rounded-2xl` grandes: segmentos de 44 px con radio de 12 y el activo relleno de `ink` con texto `bg`. **El único ámbar de la Ficha es el estado activo de «Tu estado»** si hoy lo es; si no, ninguno.
5. Amigos: lista con filete, el puesto de cada amigo como `.rank-folio-sm` a la izquierda. Las caras sobre el póster (`posterFooter`) se quedan (decisión de Igor).

**Descubrir (`Discover.tsx`)**
1. Hub: fuera las tarjetas. **Índice de estanterías**: filas con `rule-t`, nombre en `text-section`, «212 por ver» en `text-meta` y, a la derecha, el abanico de 3 pósteres a color (52 px de ancho), que se abre 4° más en hover (240 ms). La etiqueta «EXPLORAR CATÁLOGO» pasa a `text-label` `mute`, y el título a `text-display` 400.
2. Mazo: cabecera a la izquierda (columnas 1-3) con el nombre de la estantería en `text-display` y la leyenda de teclas en vertical, una tecla por línea (`text-meta`, tecla en `kbd`). Carta centrada en las columnas 4-12.
3. Chips de estantería: como texto con subrayado de 2 px en la activa (igual que las pestañas de Estantería), no `Chip`.
4. Arreglar `hover:border-line2`: se quita.

**Duelos (`CompareHome.tsx`, `CompareSession.tsx`)**
1. Home `ed-grid`: columnas 1-5 con el próximo duelo (cartas a 200 × 300, la «o» a 48 px y los títulos «*A* o *B*» en `text-title italic`); columnas 7-12 con «Otras estanterías».
2. «Otras estanterías» deja de ser `grid-cols-3`: es una **tabla con filetes**. Nombre en `text-section`, porcentaje en Fraunces 400 a 28 px tabular en `ink` y alineado a la derecha, barra de 1 px debajo y la tira de pósteres pequeños solo en hover.
3. Sesión: la pregunta en `text-display` con los títulos en cursiva, y el aviso de hito y el cambio de puesto (`flash`) en `text-meta` sobre `bg`, sin pastilla.
4. Resumen: las cuatro `MoveList` en dos columnas con filete y botones alineados a la izquierda, no a todo el ancho.

**Decidir (`WhatToWatch.tsx`)**
1. Fase de estantería: fuera el collage al 30 % y el degradado. **Lista numerada**: «01» en `.rank-folio-md`, el nombre en `text-section`, la pregunta («¿Qué peli vemos?») en `text-meta` y, a la derecha, 3 pósteres a color de 40 px. Filete entre filas.
2. Preguntas: la pregunta en `text-display` y las respuestas **siguen siendo tarjetas** (decisión de Igor) en `surface`, con radio 18 y sin borde. La elegida lleva borde de 1 px en `ink`.
3. Resultado: `DetailTwoCol` con el título en `text-hero` y el motivo en `text-lead`.
4. La columna de 640 px se mantiene.

**Perfil (`Profile.tsx`)**
1. Nombre en `text-hero`. Contadores como una línea tipográfica: números en Fraunces 400 a 40 px y la palabra en `text-meta` debajo, alineados a la izquierda con 48 px de hueco (fuera la rejilla centrada de 3).
2. «Lo que más me marcó»: `ed-grid` margen + cuerpo. El puesto va con `.rank-folio` fuera del póster (fuera la insignia circular ámbar).
3. «Mis números»: **libro de cuentas**. Filas con filete, nombre a la izquierda y número a la derecha en Fraunces tabular. Sin cajas.
4. Amigos: filas con filete; afinidad como número serif a la derecha y barra de 1 px en `ink`. «Añadir» como `link-ed`.
5. Columna de accesos: sin caja, lista de `link-ed` bajo un `text-label` «CUENTA». «Ajustes» de la cabecera pasa a icono de 24 px.

**Ajustes y Público** (menor): índice de Ajustes con el mismo estilo `nav-ed` que la barra lateral. En Público, `text-hero` para el título de la lista, `rank-cell` en la rejilla y `PublicHeader` con el logotipo en cursiva en lugar de la etiqueta ámbar.

## 5. Tokens y clases nuevos (`index.css`)

| Nombre | Valor | Genera / uso |
|---|---|---|
| `--color-rule` (en `@theme`) | `#38322b` | `border-rule`: filetes de sección y de la barra lateral (más suave que `line`, que se queda para campos) |
| `--color-faint` (en `@theme`) | `#8c8478` | `text-faint`: folios de la barra y guion de «Nuevas». Solo decorativo o en ≥ 20 px |
| `--ease-pliego` (en `@theme`) | `cubic-bezier(0.22, 1, 0.36, 1)` | `ease-pliego` en todas las transiciones de escritorio |
| `--dur-fast` / `--dur-base` / `--dur-slow` (en `:root`, no en `@theme`: Tailwind 4 no tiene espacio de nombres de duración) | `160ms` / `240ms` / `400ms` | `duration-(--dur-fast)` etc. |
| `--rank-stroke` (en `:root`) | `rgb(244 239 230 / 0.6)` | trazo de `.rank-folio` y `.rank-num-xl`. **No** se aplica a `.rank-num` (móvil) |
| `--spacing-section` (en `@theme`) | `64px` | `lg:mt-section`, `lg:gap-y-section`: separación entre secciones |
| `@utility text-hero` | Fraunces 400, 56/0.95 (`xl`: 64), `-0.03em`, `font-variation-settings: 'opsz' 144`. Debajo de `lg`, igual que `text-display` | título de entrada, uno por pantalla |
| `@utility text-section` | Fraunces 400, 28/1.1, `-0.02em`. Debajo de `lg`, igual que `text-title` | título de sección en la columna de margen y logotipo |
| `@utility text-lead` | Inter 400, 17/1.55, `max-width: 62ch` | sinopsis y motivo de Decidir en escritorio |
| `.ed-grid` | `lg:` `display:grid; grid-template-columns: repeat(12, minmax(0,1fr)); column-gap: 32px` | composición margen 3 + cuerpo 9 |
| `.rule-t` | `lg:` `border-top: 1px solid var(--color-rule); padding-top: 24px` | separar secciones sin cajas |
| `.rank-folio` | Fraunces 800, `line-height .8`, `color: transparent`, `-webkit-text-stroke: 1.25px var(--rank-stroke)`, `opsz 144`, 56 px. Variantes `.rank-folio-sm` (32 px), `.rank-folio-md` (40 px) y `.rank-num-xl` (120 px, para el podio) | número fuera del póster en rejilla, amigos y Decidir |
| `.rank-num-solid` | `color: var(--color-ink); -webkit-text-stroke: 0` | nº 1 del podio y hover de `rank-cell` |
| `.rank-cell` | celda: póster + fila `flex items-end gap-3` con `.rank-folio` y título | rejilla de Estantería y Público |
| `.link-ed` | `background: linear-gradient(currentColor,currentColor) 0 100% / 0 1px no-repeat; transition: background-size var(--dur-fast) var(--ease-pliego)`; hover `background-size: 100% 1px` | enlaces de texto en escritorio |
| `.nav-ed` | fila de 44 px, Fraunces 20, `mute` → `ink`; `[aria-current=page]` en `ink` con filete `::before` de 16×1 | barra lateral e índice de Ajustes |
| `kbd` (base, `lg:`) | Inter 11, 500, `border 1px line`, radio 4, padding 2×6 | leyenda de teclas |
| `hover-lift` (cambia) | `translateY(-3px)`, `var(--dur-base) var(--ease-pliego)` | pósteres |

## 6. Qué enmienda (solo en `lg:`)
- **SISTEMA §2, cursiva:** se permite en títulos de obra dentro de frase (ya encaja en «título citado»), en el nombre del saludo y en el logotipo.
- **SISTEMA §2, escala:** se añaden `text-hero`, `text-section` y `text-lead`. **Pesos:** la serif de escritorio va a 400, y el 800 de los números huecos no cuenta como tercer peso.
- **SISTEMA §3, espacio:** se añade 64 px (`--spacing-section`).
- **SISTEMA §4:** el `bg` real es `#1e1b17`, no `#100e0c` (el documento está desfasado).
- **DISENO_ESCRITORIO §2.1:** barra en `bg` sin iconos ni ámbar. **§3.2:** el número sale del póster y se añade el podio. **§1.3:** el hover pasa de 2 a 3 px y la tarjeta deja de cambiar a `surface2`, porque ya no hay tarjetas. **§1.1:** se usan las 12 columnas (margen 3 + cuerpo 9).

## 7. Orden de aplicación
1. **Tokens y clases** de §5 en `index.css` (sin tocar los existentes salvo `hover-lift`; `.rank-num` queda igual). `ScreenTitle` gana una variante `size="hero"` con la maquetación de escritorio (`text-hero` en columnas 1-9 y subtítulo en `lg:col-start-4`), para que Biblioteca, Perfil y las demás no la monten a mano. `tsc`.
2. **Barra lateral**: cambia todas las pantallas a la vez y libera el ámbar.
3. **Estantería** (podio + `rank-cell`): el problema que Igor ve más.
4. **Biblioteca**, 5. **Ficha**, 6. **Perfil**, 7. **Duelos**, 8. **Descubrir**, 9. **Decidir**, 10. Ajustes y Público.

Un commit por pantalla, sin cambiar lógica, con `npx tsc -p app/tsconfig.json --noEmit`.

**No tocar:** nada por debajo de 1024 px (toda clase nueva con `lg:` o dentro de su `@media`; si una utilidad cambia el móvil, está mal). Tampoco la lógica, las rutas, los atajos, `SwipeDeck` y sus sellos, `DuelVariants` (borde iluminado y confirmación), los colores `shelf-*` ni las excepciones de SISTEMA §1.3. Las decisiones de Igor marcadas en el código («Igor, dd/mm») se restilan, pero no se quitan.

**Para que decida Igor (no se aplica sin su sí):**
- Un grano de papel muy sutil (ruido al 3 %) sobre el `bg` de escritorio. Refuerza la idea, pero contradice «sin efectos».
- Un bloque «Estanterías» en la barra lateral, bajo las secciones: una línea por estantería con su recuento tabular a la derecha, como el sumario de una revista. Es estructura nueva (amplía DISENO_ESCRITORIO §2.1), no solo aspecto.
