# MEDIDAS NATIVA: medidas sacadas del código web

> Fuente: `app/src/components` y `app/src/screens` de la PWA (rama `native/fase-1`, partida de `520462e`). Se leyó el TSX; **no se ha abierto la app ni se ha mirado a ojo**.
> Cada dato lleva `archivo:línea`. Lo que depende de una condición va marcado como **(condicional)**. Lo que la web no fija en código va marcado como **(no fijado)**.
> Los `hover:` no se portan (D21). Lo que es solo de escritorio (marco `.frame`, `.desk-bg`) no entra.

## Cómo leer las medidas

- **Unidades.** Tailwind usa 1 unidad = 4 px: `p-4` = 16, `gap-3` = 12, `h-12` = 48, `w-9` = 36. Las cifras entre corchetes son px literales (`text-[10.5px]` = 10.5). En nativo, px pasa a pt sin escalar (D23).
- **Texto.** Los tamaños de `text-xs`, `text-sm`… son los de Tailwind: `text-xs` 12/16, `text-sm` 14/20, `text-base` 16/24, `text-xl` 20/28, `text-2xl` 24/32. Los de `text-title`, `text-display`, `text-item`, `text-body`, `text-meta` y `text-label` están en `packages/tokens/src/index.ts`.
- **Radios.** `rounded-md` 6, `rounded-lg` 8, `rounded-xl` 12, `rounded-2xl` 16, `rounded-3xl` 24, `rounded-full` pastilla.
- **Pósteres en `cqw`.** 1 cqw = 1 % del ancho del contenedor del póster (`containerType: inline-size`, `Poster.tsx:130`). En RN hay que medir el ancho del contenedor y multiplicar.
- **Interlineado.** Las clases `leading-*` valen `leading-tight` 1.25, `leading-snug` 1.375, `leading-relaxed` 1.625.

## Lista de comprobación de tokens

- Los nombres de la web (`text-display`, `text-title`, `text-item`, `text-body`, `text-meta`, `text-label`, `label-caps`, `rank-num`, `glass`) están en `packages/tokens/src/index.ts`.
- `serif font-semibold` (600) y `serif font-medium` (500) usan `Fraunces72-600` y `Fraunces72-500`. `font-black` (900) en los sellos del mazo usa `Inter-900`. `font-bold` (700) usa `Inter-700`.
- Clases de la web **sin definición en `@theme`** y que no hacen nada: `hover:border-line2` (`Discover.tsx:364`, `:640`). Se ignoran.

---

## TabBar (`app/src/components/TabBar.tsx`)

- Barra: `nav` con `glass` (fondo `rgb(15 14 13 / 0.78)`, blur 18), `border-t` blanco al 6 %, `safe-bottom`. `TabBar.tsx:15`. Nativo: fondo opaco en Android (D9).
- Lista: `px-1` (4), `pt-1.5` (6), `pb-1.5` (6), ítems `flex-1`. `TabBar.tsx:16-18`.
- Enlace: `min-h-[48px]`, `gap-0.5` (2), contenido alineado abajo. `TabBar.tsx:19`.
- Pastilla del icono: `w-12 h-7` (48 × 28), `rounded-full`. Activa: fondo `bg-accent/15`. `TabBar.tsx:30`.
- Icono: 22 px. Activo: `text-accent`; inactivo: `text-mute`. `TabBar.tsx:31`.
- Etiqueta: `text-[10.5px] font-medium`, activa `text-accent`, inactiva `text-mute`. `TabBar.tsx:33`.
- Variante central (botón 56 × 56, `rounded-[20px]`, `-mt-6`, `border-4`, icono 26): **(condicional)** solo si `t.center`. Ninguna pestaña lo tiene (`TabBar.tsx:5-11`), así que es código muerto hoy.
- Pestañas actuales: Biblioteca `/` (icono `library`), Descubrir `/descubrir` (`cards`), `WIZARD_NAME` = Decidir `/decidir` (`sparkle`), ¡Duelos! `/comparar` (`scale`), Perfil `/perfil` (`user`). `TabBar.tsx:6-10`.

## ScreenTitle (`app/src/components/ScreenTitle.tsx`)

- Cabecera: `px-5` (20). Padding superior `max(env(safe-area-inset-top), 22px)`. Padding inferior `pb-6` (24). `ScreenTitle.tsx:27`.
- Fila superior: `min-h-[24px]`, `mb-3` (12). `ScreenTitle.tsx:29`.
- Botón volver: `p-1` (4), `-ml-1` (-4), icono 20. `ScreenTitle.tsx:32-37`. **(condicional)** solo si hay `onBack`.
- Etiqueta: `text-label` (11 px, mayúsculas). Separación con el botón volver `gap-2` (8). `ScreenTitle.tsx:30`, `:40`.
- Derecha (contador + acción): `gap-3` (12). El contador es `text-meta tabular-nums`. `ScreenTitle.tsx:42-47`. **(condicional)** solo si hay `step`.
- Barra de progreso: `h-[2px]`, `mb-4` (16), `rounded-full`, relleno `bg-accent`, transición 300 ms. `ScreenTitle.tsx:54-58`. **(condicional)** solo si hay `step`.
- Título: `text-display` (30 px), `text-ink`, `text-balance`. `ScreenTitle.tsx:65`, `:69`.
- Con `titleAction`: fila `flex` con `gap-3` (12) y el título `min-w-0`. Acciones `shrink-0`, `gap-2` (8). `ScreenTitle.tsx:63-67`. **(condicional)**.
- Subtítulo: `text-meta`, `mt-1.5` (6), `text-balance`. `ScreenTitle.tsx:73`. **(condicional)**.

## Poster (`app/src/components/Poster.tsx`)

**Constantes de fondo y grano**
- Paletas: 8 pares de colores oscuros (`PALETTES`, `Poster.tsx:16-25`).
- Grano: teselas de 140 × 140 px, `opacity-[0.22]`, `mix-blend-overlay`. `Poster.tsx:31`, `:126`. En nativo, `mix-blend` no existe (D10).
- Viñeta: degradado radial, `transparent 55%` a `rgb(0 0 0 / 0.55)`. `Poster.tsx:125`.
- Vuelo: muelle `stiffness 420, damping 40, mass 0.9`. `Poster.tsx:28`.

**Sin portada (esqueleto)**
- `skeleton border border-line`, forma y tamaño heredados del contenedor. `Poster.tsx:56`.

**Juegos de mesa con imagen (`type === 'boardgame'`)**
- Relleno difuminado: imagen a `absolute inset-0`, `object-cover`, `scale-125`, `blur-xl` (24 px), `opacity-70`. `Poster.tsx:71`. **(condicional)** solo si no hay `posterRatio`.
- Imagen principal: `absolute inset-0`, `object-contain`. `Poster.tsx:79`.

**Portada de red (resto de estanterías)**
- `object-cover`, `w-full h-full` heredado. `Poster.tsx:94`.

**Portada generada (sin imagen o con error)**
- Tamaño de la composición según el ancho del contenedor (`containerType: inline-size`). `Poster.tsx:117`.
- Forma geométrica (elegida por hash del `id`, `Poster.tsx:102-105`):
  - círculo de 62 cqw, `opacity 0.55` (`Poster.tsx:120`),
  - arco de 110 cqw con borde de 1.6 cqw, `opacity 0.35` (`Poster.tsx:121`),
  - franja de altura 22 %, `opacity 0.32` (`Poster.tsx:122`).
- Bloque de texto: `absolute inset-0`, `flex-col justify-end`. Padding `p-[8cqw]` (portada) o `p-[6.5cqw]` (cuadrada). `Poster.tsx:129`.
- Etiqueta del tipo: `uppercase`, `tracking-[0.24em]`, `text-white/60`, `font-semibold`, tamaño 4.6 cqw (cuadrada 4.2 cqw). `Poster.tsx:130`.
- Título: serif, `font-semibold`, `leading-[1.02]`, `mt-[2.5cqw]`, `break-words`, `hyphens-auto`, `lang="es"`. `Poster.tsx:131`.
- Tamaño del título según su longitud (`Poster.tsx:108-110`):

| Longitud del título | Portada vertical | Cuadrada (música) |
|---|---|---|
| hasta 10 | 16 cqw | 15 cqw |
| 11 a 18 | 13.5 cqw | 12.5 cqw |
| 19 a 30 | 11.5 cqw | 10.5 cqw |
| más de 30 | 9.5 cqw | 8.5 cqw |

- Línea divisoria: `h-px`, `w-[18cqw]`, `mt-[3cqw]`, `opacity 0.8`. `Poster.tsx:134`.
- Metadatos (año · creador): `text-white/65`, `mt-[2.5cqw]`, `truncate`. Tamaño 5 cqw (cuadrada 4.5 cqw). `Poster.tsx:135`.
- Proporciones del contenedor: lo fija quien lo llama (`posterBox`, `posterAspectClass`). Ver «Proporciones» al final.

## PosterCard (`app/src/components/PosterCard.tsx`)

**Contenedor**
- `group cursor-pointer select-none`. Si es un juego de mesa con `posterRatio` y no está en rejilla mixta: `flex-col justify-end h-full`. `PosterCard.tsx:35-37`.

**Rama normal (la más usada)**
- Hueco: `w-full`, forma de `posterBox` (2:3 o cuadrada, o `aspectRatio` del juego de mesa), `rounded-[10px]`, `overflow-hidden`, fondo `bg-surface`. `PosterCard.tsx:91`.
- Imagen: `object-cover`, o `object-contain` si es juego de mesa con forma. `PosterCard.tsx:97`.
- Placeholder sin imagen: `p-3`, `text-center`, fondo `bg-surface2`, `text-meta text-mute`. `PosterCard.tsx:100`.
- Distintivo (badge): `absolute top-2 right-2`, `bg-bg/85`, `px-2` (8) `py-0.5` (2), `rounded-md` (6), `text-[11px] font-medium`, `tabular-nums`. `PosterCard.tsx:106-110`. **(condicional)** solo si hay `badge`.

**Rama cuadrada en rejilla mixta** (`mixed` y música)
- Hueco 2:3 (`aspect-[2/3]`, `rounded-[10px]`), con imagen cuadrada arriba (`aspect-square`) y texto debajo (`p-2`). `PosterCard.tsx:43-44`, `:58`.
- Tipo (si `showType`): `text-[10px] uppercase tracking-wide`. `PosterCard.tsx:59`.
- Título: `serif text-xs font-semibold leading-tight line-clamp-2`. `PosterCard.tsx:60`.
- Creador: `text-[11px] text-mute mt-0.5 truncate`. `PosterCard.tsx:61`.

**Rama de juego de mesa en rejilla mixta**
- Hueco 2:3 con la carátula centrada (`object-contain`, `max-w-full max-h-full`), sin relleno difuminado. `PosterCard.tsx:71-78`.

**Debajo de la portada (no en la rama cuadrada mixta)** `PosterCard.tsx:115-131`
- Bloque `mt-2` (8).
- Tipo: `text-label text-mute mb-0.5`. **(condicional)** `showType`.
- Título: `text-item text-ink line-clamp-2`, `lang="es"`. `PosterCard.tsx:122`.
- Año · creador: `text-meta line-clamp-1 mt-0.5` (2). `PosterCard.tsx:126`.

## SwipeDeck (`app/src/components/SwipeDeck.tsx`)

**Constantes del gesto** `SwipeDeck.tsx:16-19`
- Horizontal: se confirma al pasar el 30 % del ancho (`H_THRESHOLD = 0.3`).
- Vertical (arriba): se confirma al pasar el 20 % del alto (`V_THRESHOLD = 0.2`).
- Velocidad de «golpe»: 600 px/s (`FLICK`), con desplazamiento mínimo de 40 px.
- Giro según el desplazamiento horizontal: de -15° a 15° entre -260 y 260 px. `SwipeDeck.tsx:113`.
- Vuelo al confirmar: 260 ms, hasta `1.5 × ancho` horizontal, o `-1.35 × alto` vertical. `SwipeDeck.tsx:124-134`.
- Vuelta al centro: muelle `stiffness 420, damping 28`. `SwipeDeck.tsx:137`.
- Vibración «tick» al cruzar el umbral, «tap» al confirmar (`haptic`, D22). `SwipeDeck.tsx:127`, `:166`.

**Caja de la baraja** `SwipeDeck.tsx:143`
- `relative h-full max-w-full mx-auto`, relación de aspecto `2 / 3.15`. Ningún póster se hace más ancho que su 2:3 más el hueco de 30 px del montón.

**Montón de cartas detrás** `SwipeDeck.tsx:145-156`
- Todas las cartas: `absolute inset-x-0 top-0 bottom-[30px]`. El hueco de 30 px deja ver las cartas de atrás.
- Carta 3 (la más atrás): escala 0.9 a 0.95, desplazada 28 a 14 px en vertical. `SwipeDeck.tsx:145`, `:118-121`.
- Carta 2: escala 0.95 a 1, desplazada 14 a 0 px. `SwipeDeck.tsx:150`.
- Carta de arriba: `cursor-grab`, `touch-none-all`, arrastrable. `SwipeDeck.tsx:156`.

**Ficha de carta (`CardFace`)** `SwipeDeck.tsx:22-77`
- Carta normal (no cuadrada, no juego de mesa con forma):
  - Contenedor `rounded-[28px]`, `overflow-hidden`, `border border-line`, `shadow-2xl shadow-black/60`. `SwipeDeck.tsx:59`.
  - Degradado inferior: `h-3/5` (60 %), de `black/95` a `black/55` a transparente. `SwipeDeck.tsx:61`.
  - Degradado superior: `h-24` (96), de `black/45` a transparente. `SwipeDeck.tsx:62`.
  - Amigos (burbujas): `absolute top-3 right-3` (12). `SwipeDeck.tsx:63`. **(condicional)** `bubbles`.
  - Bloque de texto: `absolute bottom-0 inset-x-0 p-5 pb-4` (20/16). `SwipeDeck.tsx:64`.
  - Tipo · año: `text-label text-ink/80`. `SwipeDeck.tsx:65`.
  - Título: `text-display` (30 px), `mt-1` (4), `line-clamp-3`, `text-balance`. `SwipeDeck.tsx:66`.
  - Creador: `text-meta text-ink/80 mt-1 truncate`. `SwipeDeck.tsx:67`.
  - Etiquetas: `flex-wrap gap-1.5` (6), `mt-2.5` (10). Son `Tag variant="brand"`: los datos de la obra (`itemFacts`) y hasta dos géneros (`genres.slice(0, 2)`). `SwipeDeck.tsx:68-73`.
- Cuadrada (música) o juego de mesa con forma apaisada (`bgLayout.mode === 'top'`):
  - Imagen arriba: `aspect-square` (música) o `aspectRatio` del juego de mesa (clamp 1 a 1.6). `SwipeDeck.tsx:31-32`.
  - Panel de texto debajo: `flex-1 p-5 pb-4 bg-surface`, con `justify-between`. `SwipeDeck.tsx:42`.
  - Título: `line-clamp-2`, `mt-1`. `SwipeDeck.tsx:45`.
  - Etiquetas: `mt-2` (8). `SwipeDeck.tsx:48`.
- La carta de arriba es la única con `layoutId` (`flight`): el póster vuela a la ficha. `SwipeDeck.tsx:192`.

**Sellos (`Stamp`)** `SwipeDeck.tsx:79-85`, `:196-198`
- Caja: `border-[5px]`, `rounded-xl` (12), `px-3` (12), `py-1` (4), `text-[26px] font-black tracking-wider` (0.05 em), `whitespace-nowrap`.
- Sello verde (derecha, «visto»): texto `SHELF_LABEL[shelf].stamp`. Posición `top-[22%] left-5` (20), giro `-rotate-12` (-12°). Color `stamp-green` (`#3ec878`).
- Sello rojo (izquierda): «NO ME INTERESA», `text-[22px]`. Posición `top-[22%] right-4` (16), giro `rotate-12`. Color `stamp-red` (`#ef4b4b`).
- Sello azul (arriba): «PENDIENTE». Posición `top-[38%] left-1/2 -translate-x-1/2`, giro `-rotate-6`. Color `stamp-blue` (`#4a8df0`).
- Opacidad: de 0 a 1 según el progreso del gesto.
- Capas de color encima de la carta: `bg-stamp-*/25`, con `rounded-[28px]`. `SwipeDeck.tsx:193-195`.

**Deshacer y botones de acción**: ver «Discover» → «Mazo».

## DuelVariants: DuelFan (`app/src/components/DuelVariants.tsx`)

Solo se porta el abanico (`DuelFan`) y lo que usan `SwipePair` y `Onboarding`. El resto de variantes y `useDuelCopy` no se portan (ver PLAN_NATIVO §4).

**Constantes** `DuelVariants.tsx:63-67`, `:139-142`
- Espera tras elegir, duelos de Comparar (`fast`): 450 ms (`FAST_DELAY`). `DuelVariants.tsx:65`.
- Espera tras elegir, Decidir: 650 ms (`DECIDE_DELAY`). `DuelVariants.tsx:67`.
- Espera tras elegir, sin `fast`: 1050 ms; con movimiento reducido: 600 ms (`pickDelay`). `DuelVariants.tsx:63`.
- Margen libre de la carta elegida a tamaño completo: 26 px (`FIT_MARGIN`). `DuelVariants.tsx:139`.
- Fracción del ancho para elegir al soltar: 0.28 (`FAN_COMMIT`). `DuelVariants.tsx:141`.
- Pista inicial para usuarios nuevos: a los 4800 ms; vaivén de 7 a 11 px en 1.6 s. `DuelVariants.tsx:140`, `:308-309`.
- Vibración «success» al elegir; «tick» de selección (`haptic`, D22). `DuelVariants.tsx:335`.

**Reparto de la mesa (`fanLayout`)** `DuelVariants.tsx:182-265`
- Margen superior `padTop = 8`. Franja inferior de pista `hintH = 64`. Altura del título `titleH = 56`. Separación `gap = 14`. `DuelVariants.tsx:190-195`.
- Alto disponible: `max(220, alto − 8 − 64)`. `DuelVariants.tsx:196`.
- Carta normal (película, serie, libro): proporción `1.5`, o `1` para música (`square`). `DuelVariants.tsx:242`.
  - Ancho: `min(ancho × 0.48, (altoDisponible − 56 − 14) / proporción)`. `DuelVariants.tsx:243`.
  - Alto: ancho × proporción. `DuelVariants.tsx:244`.
  - Centros horizontales: 30 % y 70 % del ancho. `DuelVariants.tsx:232`, `:261`.
  - Posición de los títulos: justo debajo de la carta, `top + cardH + 14`. `DuelVariants.tsx:260`.
- Duelo entre juegos de mesa con relación de aspecto conocida (`isBoardgameDuel`): ancho de hueco `ancho × 0.48`, alto de hueco mínimo 100. Tamaño con `duelCardSize` en modo `area` (D4). `DuelVariants.tsx:207-239`. **(condicional)** solo si las dos obras son juegos de mesa con `ratio`.
- Ancho de cada hueco de título: `ancho × 0.4`. `DuelVariants.tsx:378`.

**Contenedor del abanico** `DuelVariants.tsx:342-345`
- `relative flex-1 min-h-0 -mx-4 overflow-hidden`. El margen negativo de 16 a cada lado sale del `px-5` (20) del padre: el abanico llega a 4 px de cada borde de la pantalla.
- Gesto horizontal: `touchAction: pan-y`.

**Movimiento al elegir** `DuelVariants.tsx:336-337`
- La carta elegida se desplaza a `±ancho × 0.28`. Con `fast`: 160 ms, `easeOut`. Sin `fast`: muelle `stiffness 300, damping 30`. Con movimiento reducido: sin animación.
- Suelta: se elige si el desplazamiento pasa `ancho × 0.28` o la velocidad pasa 650. `DuelVariants.tsx:358`.

**Cartas (`FanCard`)** `DuelVariants.tsx:407-483`
- Rotación de reposo: izquierda −6°, derecha +6°, que vuelve a 0 al crecer. `DuelVariants.tsx:430`, `:434`.
- Crecimiento: la carta elegida pasa a `fitW / w` (en la carta normal, a casi toda la pantalla). `DuelVariants.tsx:435`.
- La otra carta se aparta `ancho × 0.22` y se reduce a escala 0.9. `DuelVariants.tsx:437-438`.
- Opacidad de la no elegida: `1 − 1.15 × progreso`. `DuelVariants.tsx:441`.
- Sombra: de `0 18px 36px -10px rgba(0,0,0,0.65)` a `0 6px 20px -10px rgba(0,0,0,0.4)`. `DuelVariants.tsx:443`.
- Radio de la carta: `18` (`borderRadius`). `DuelVariants.tsx:464`.
- Borde de confirmación: `0 0 0 2px <color>`, más resplandor `0 0 10px 1px <color>aa` (alfa ≈ 67 %), transición 120 ms. `DuelVariants.tsx:476`, `:479`.
- Colores: elegida la izquierda `#F5B544` (`DUEL_LEFT`), la derecha `#9A86FF` (`DUEL_RIGHT`). `DuelVariants.tsx:372-373`, `SwipePair.tsx:18-19`.
- La imagen de la carta ocupa todo el hueco, sin marco. Se oculta el `blur-xl` del fondo de los juegos de mesa dentro del duelo: `[&_.blur-xl]:hidden`. `DuelVariants.tsx:469`.

**Títulos bajo las cartas** `DuelVariants.tsx:385-388`
- Título: `serif text-[16px] font-semibold leading-tight line-clamp-2`, `text-wrap: balance`, `lang="es"`.
- Subtítulo: `text-[11.5px] text-mute mt-0.5 line-clamp-1`. **(condicional)** si hay `subtitle`.
- Desaparecen al crecer la carta elegida: opacidad `1 − 1.7 × progreso` y desenfoque hasta 9 px. `DuelVariants.tsx:326-327`.

**Fondo de la elegida** `DuelVariants.tsx:402`
- Capa `bg-bg` que crece con el progreso (opacidad hasta 0.95). Sin desenfoque. `DuelVariants.tsx:398-402`.

**Pie del duelo (`SwipePair`)** `SwipePair.tsx:42-49`
- Contenedor: `relative flex-1 min-h-0 flex-col`.
- Hueco `extra` entre el abanico y la pista (`SwipePair.tsx:44`). **(condicional)** Decidir lo usa para el botón «Pasar» (ver Decidir).
- Pista: `text-center text-meta text-mute py-1.5 shrink-0`. Texto «← Desliza hacia la que prefieras →». `SwipePair.tsx:45-47`.
- `square`: si las dos obras son cuadradas (música). `SwipePair.tsx:39`.
- `fast` = `kind === 'rank'`. `SwipePair.tsx:43`.

## ItemRow y PosterTile (`app/src/components/ItemRow.tsx`)

**PosterTile (portada en filas horizontales, con puesto opcional)** `ItemRow.tsx:13-40`
- Tamaño por defecto: 104 (`size`). `ItemRow.tsx:13`.
- Ancho del número de puesto: 34 si el puesto es menor de 10; 58 si es 10 o más. `ItemRow.tsx:14`. **(condicional)** solo si hay `rank`.
- Número de puesto: `rank-num` a `text-[86px]`, `absolute left-0 bottom-0`, `select-none`. Color hueco transparente con trazo `rgb(244 241 234 / 0.55)`, 1.5 px. Si el esqueleto: `text-mute/30`. `ItemRow.tsx:22`, `:34`.
- Envoltorio: ancho `size + numW`, `paddingLeft = numW`. `ItemRow.tsx:31`.
- Pulsado: `active:scale-[0.97]`, `transition-transform duration-200`. `ItemRow.tsx:30`.
- Sin ordenar (`faded`): `opacity-55 saturate-50`. `ItemRow.tsx:35`. **(condicional)**.
- Póster: `w-full` del contenedor, `rounded-[10px]`, con la forma de `posterBox`. `ItemRow.tsx:36`.
- Esqueleto: `skeleton w-full rounded-[10px] border border-line`, proporción 2:3. `ItemRow.tsx:23`.

**ItemRow (fila de lista)** `ItemRow.tsx:53-90`
- Fila: `flex items-center gap-3` (12), `px-4` (16), `py-2.5` (10), `min-h-[56px]`, `w-full`. `ItemRow.tsx:66`.
- Seleccionada: fondo `bg-accent/15`. Sin seleccionar: `active:bg-surface2`.
- Casilla (modo selección): `w-5 h-5` (20 × 20), `rounded-md` (6), `border`. Marca `check` de 13, `strokeWidth 3`. `ItemRow.tsx:70-71`. **(condicional)** `selecting`.
- Puesto: `w-6` (24), `text-center text-xs font-semibold`, `shrink-0`. Color de acento si destacado. `ItemRow.tsx:75`. **(condicional)** `rank` y no `selecting`.
- Póster: `w-9` (36), `rounded-[6px]`, `shrink-0`, `self-center`, `object-cover`. `ItemRow.tsx:79`.
- Bloque de texto: `flex-1 min-w-0`. `ItemRow.tsx:80`.
  - Título: serif, `text-item`, `leading-tight`, `line-clamp-1`. `ItemRow.tsx:81`.
  - Año · creador: `text-meta text-mute mt-0.5 truncate`. `ItemRow.tsx:82`.
  - Nota: `text-label text-accent mt-0.5 truncate`. `ItemRow.tsx:83`. **(condicional)** `note`.
- Esqueleto de fila: `px-4 py-2.5 min-h-[56px] gap-3`; poster `w-8` (32) `rounded-[6px]`; líneas `h-3.5` (14) de 3/4 de ancho y `h-3` (12) de 1/2; separación `space-y-1.5` (6). `ItemRow.tsx:56-62`.

## Button (`app/src/components/Button.tsx`)

- Base: `text-body` (15 px), `font-medium`, `inline-flex items-center justify-center`, `select-none`. `Button.tsx:22`.
- **Primaria**: `h-12` (48), `px-6` (24), `rounded-2xl` (16), fondo `bg-accent`, texto `text-accent-ink` (`#100e0c`). Deshabilitada: `opacity-40`. `Button.tsx:26`.
- **Secundaria**: `h-12` (48), `px-5` (20), `rounded-2xl`, fondo `bg-surface2`, borde `border-line`, texto `text-ink`. `Button.tsx:28`.
- **Texto**: `h-auto px-1 py-1` (4), texto `text-ink`, sin fondo. Deshabilitada: `opacity-40`. `Button.tsx:30`.
- Cargando: espinner `w-4 h-4` (16), borde 2 px, `border-t-transparent`, giro. `Button.tsx:40`. **(condicional)**.
- Icono a la izquierda: `mr-2` (8). A la derecha: `ml-2` (8). `Button.tsx:43`, `:45`. **(condicional)**.
- Anchos: el padre decide (`w-full`, `flex-1`). No hay ancho fijo.

## ui.tsx: Sheet, Toast, Chip (y Tag, RankBadge, Avatar)

**Sheet (hoja inferior)** `app/src/components/ui.tsx:304-333`
- Capa: `absolute inset-0 z-40`. Fondo de oscurecimiento `bg-black/60`. `ui.tsx:313-314`.
- Hoja: `absolute bottom-0 inset-x-0`, `bg-surface`, `rounded-t-[24px]` (24), `border-t border-line`, `shadow-2xl`, `flex-col`. `ui.tsx:316`.
- Altura mínima: la pasa quien llama (`height`, por defecto `48%`). Altura máxima `88%`. `ui.tsx:304`, `:317`.
  - Alturas que usa la web: `48%` (defecto), `70%` (votar estanterías en Biblioteca, `Library.tsx:227`; otras candidatas en Decidir, `WhatToWatch.tsx:802`), `40%` (añadir a lista, `ItemDetail.tsx:280`), `60%` (elegir estantería en Descubrir, `Discover.tsx:622`).
- Asa: `mx-auto mt-3` (12), `mb-2` (8), `h-1.5` (6), `w-11` (44), `rounded-full`, `bg-line`. `ui.tsx:326`.
- Contenido: `px-5` (20), `pb-5` (20), `pt-2` (8), `flex-1 flex-col`. `ui.tsx:327`.
- Entrada: muelle `stiffness 380, damping 36`, desde `y 600`. `ui.tsx:318-320`.
- Cierre: arrastre hacia abajo (desplazamiento > 90 o velocidad > 500) o toque en el fondo. Animación a `y 520` en 200 ms. `ui.tsx:310`, `:324`.

**Toast** `ui.tsx:335-343`
- Posición: `absolute left-4 right-4` (16), `bottom-24` (96), `z-50`. `ui.tsx:339`.
- Caja: `bg-ink text-bg`, `rounded-2xl` (16), `px-4` (16), `py-3` (12), `text-sm font-medium text-center`, `shadow-xl`.
- Duración: 1800 ms por defecto (`ms`). En Descubrir: 1500 (`Discover.tsx:686`).
- Entrada: desde `y 30`, opacidad 0 a 1. `ui.tsx:338`.

**Chip (pastilla de filtro)** `ui.tsx:94-104`
- `min-h-[40px]`, `px-4` (16), `rounded-full`, `text-sm font-medium`, `border`, `whitespace-nowrap`. `ui.tsx:99`.
- Activa: `bg-accent text-accent-ink border-accent`.
- Inactiva: `bg-white/[0.05] backdrop-blur-md border-white/10 text-ink/80`, con `active:bg-white/10`. `backdrop-blur-md` no se porta; el fondo queda liso (`#ffffff` al 5 % sobre el fondo, sin blur). **(no fijado)** en nativo.

**Tag (etiqueta informativa)** `ui.tsx:75-92`
- `inline-flex items-center`, `text-[11px] font-medium`, `px-2.5` (10), `py-0.5` (2), `rounded-lg` (8), `tracking-wide`, `border`, `leading-relaxed`.
- Variantes: `default` (fondo `surface`, texto `ink/75`), `accent` (`accent/15`, texto `accent`, borde `accent/30`), `brand` (`surface2`, texto `ink`), `subtle` (`surface2/60`, texto `mute`). `ui.tsx:85-90`.

**RankBadge** `ui.tsx:66-68`
- `inline-flex whitespace-nowrap rounded-full bg-accent text-accent-ink font-bold`, `px-1.5` (6), `py-[1px]`, `text-[10px] tabular-nums`. Texto «nº N».

**Avatar** `ui.tsx:18-63`
- Tamaño por defecto 32 (`size`). Círculo `rounded-full`. Sin foto: iniciales en `font-semibold`, `text-black/80`, tamaño `size × 0.4` (12.8 en 32). `ui.tsx:57`.
- Con foto: `object-cover`, `loading="lazy"`. `ui.tsx:48`.

## Library (`app/src/screens/Library.tsx`)

**Raíz y cabecera**
- Raíz: `h-full scroll-y pb-6 bg-bg`. `Library.tsx:96`.
- Cabecera (ScreenTitle): etiqueta «TU BIBLIOTECA», título `Hola, <primer nombre>.`, subtítulo «N en tu biblioteca · N pendientes». `Library.tsx:97-100`.
- Acciones: avatar 32 (`Library.tsx:104`); botón «+» `w-9 h-9` (36 × 36), `rounded-full`, `bg-accent`, icono `plus` 18 `strokeWidth 2.5`, `gap-2` (8) entre ambos. `Library.tsx:101-112`.

**Recordatorio (NudgeCard)** `Library.tsx:118-127`. **(condicional)** solo si hay `nudge`. Su medida está en `NudgeCard`, no medido.

**Lista de estanterías** `Library.tsx:129`, `:136`
- Separación entre secciones: `space-y-4` (16).
- Sección: `mx-4` (16), `rounded-3xl` (24), `bg-surface`, `border border-line`, `pt-1` (4), `pb-4` (16).
- Cabecera (enlace a la estantería): `px-4`, `min-h-[52px]`, `gap-2` (8), `active:opacity-70`. `Library.tsx:138`.
  - Título de la estantería: `text-title font-medium` (22 px). `Library.tsx:139`.
  - Contador: `text-meta text-mute tabular-nums`. Con pendientes: «· N pendientes». `Library.tsx:140-143`.
  - «Ver todo» con flecha de 14: `text-meta text-accent font-medium`, `ml-auto`, `gap-0.5` (2). `Library.tsx:144-146`.

**Fila de portadas (con datos)** `Library.tsx:149`
- Scroll horizontal: `flex gap-3` (12), `overflow-x-auto overflow-y-hidden`, `px-4` (16), `pt-1` (4), `items-end`. `no-scrollbar`.
- Portadas ordenadas (con puesto) y luego sin ordenar, como mucho 10 sin ordenar (`slice(0, 10)`). `Library.tsx:150-157`. Medidas en PosterTile.

**Estantería vacía** `Library.tsx:160-176`
- Contenedor: `mx-4 space-y-2` (8).
- Tarjeta a Descubrir: `rounded-2xl bg-surface2 p-4` (16), `gap-4` (16), `items-center`. `Library.tsx:161`.
  - Pila de hasta 3 portadas: `flex -space-x-5` (−20), cada una `w-11` (44), `rounded-[8px]`, `border border-line`, girada `(i − 1) × 7` grados. `Library.tsx:162-165`.
  - Texto: `flex-1 text-sm` (14), `leading-snug`, `text-mute`; la parte destacada es `text-ink font-medium`. `Library.tsx:167`.
  - Flecha de 18, `text-mute`. `Library.tsx:168`.
- Fila de importación: **(condicional)** solo para película, serie y libro. `Library.tsx:170`.
  - `px-4 py-2.5` (16/10), `rounded-2xl`, `bg-surface2`, `border`, `text-xs` (12), `text-mute`, `justify-between`. `Library.tsx:171`.
  - Enlace «Importar»: `text-accent font-semibold`, flecha de 13. `Library.tsx:173`.

**Bloque de «Mis listas»**: **no se porta** (`LISTS_ENABLED = false`, `Library.tsx:182`, D5).

**Votar estanterías** `Library.tsx:207-221`
- Sección: `px-5` (20), `space-y-3` (12).
- Tarjeta: `rounded-3xl bg-surface p-4 gap-3`, `active:scale-[0.99]`. `Library.tsx:208`.
  - Icono: caja `w-11 h-11` (44), `rounded-2xl`, `bg-accent/15`, corazón 22 en `text-accent`. `Library.tsx:209`.
  - Título `font-semibold`, subtítulo `text-xs text-mute`. `Library.tsx:210-212`.
- Botón «Cargar datos de ejemplo»: **(condicional)** si hay menos de 5 registros y hay catálogo. `min-h-[48px]`, `rounded-2xl`, `border-dashed border-accent/60`, `text-accent text-sm font-medium`, icono 17. `Library.tsx:216-219`.

**Hoja de votación** `Library.tsx:227-244`
- Altura 70 %. Subtítulo `text-xs text-mute mb-3`.
- Lista: `space-y-2` (8), `overflow-y-auto`, `maxHeight 52vh`. `Library.tsx:230`.
- Fila: `flex items-center gap-3`, `bg-surface2 rounded-2xl px-4` (16), `min-h-[52px]`. Nombre `font-medium`. Número `text-xs text-mute tabular-nums`. `Library.tsx:234-236`.
- Corazón: caja `w-11 h-11` (44), icono 24. Relleno `#ef4b6b` si votado, si no sin relleno y color `#7b7b84`. `Library.tsx:237-238`.

## Discover (`app/src/screens/Discover.tsx`)

La variante por defecto (`hub`, `Discover.tsx:77`) tiene dos pantallas: la de categorías (hub, `:334-417`) y el mazo (`:478-618`). El selector de variantes (`VariantSwitchButton`, `:693-712`) **no se porta** (D1).

### Hub de categorías (pantalla intermedia)

- Contenedor: `h-full flex-col scroll-y bg-bg px-5` (20), `pb-8` (32), `safe-top`. `Discover.tsx:336`.
- Cabecera: `pt-3 pb-3` (12), fila con título a la izquierda. `Discover.tsx:337`.
  - Etiqueta «Explorar Catálogo»: `text-[11px] font-bold uppercase tracking-wider text-accent`. `Discover.tsx:339`.
  - Título «¿Qué te apetece hoy?»: `text-2xl` (24 px) `font-bold tracking-tight`, `text-ink`. `Discover.tsx:342`. Es **sans**, no `text-display`: se porta tal cual.
- Descripción: `text-xs text-mute mb-5` (20), `leading-relaxed`. `Discover.tsx:347`.
- Rejilla: `grid-cols-2 gap-3.5` (14). `Discover.tsx:351`.
- Tarjeta de estantería: `rounded-3xl` (24), `bg-surface`, `border border-line`, `p-4` (16), `flex-col`, `text-left`, `shadow-xs`, `active:scale-[0.98]`, `relative overflow-hidden`. `Discover.tsx:364`.
  - Previa de portadas: `h-20` (80), `w-full`, `mb-3` (12), centrada. `Discover.tsx:367`.
  - Pila de 3 portadas: `flex -space-x-4` (−16). Cada una `w-12 h-16` (48 × 64), `rounded-lg` (8), `border border-line`, `shadow-md`, `bg-surface2`, girada `(i − 1) × 8` grados. `Discover.tsx:368-373`.
  - Fila «icono + singular»: `gap-1.5` (6), `mb-0.5` (2), `text-accent`. Icono 16. Texto: `text-[10px] font-bold uppercase tracking-wider`. `Discover.tsx:381-385`.
  - Nombre de la estantería: `text-base` (16) `font-bold leading-tight text-ink`. `Discover.tsx:388`.
  - Pie: `mt-3` (12), `text-xs font-medium text-mute`, con «N por ver» (`tabular-nums`) y «Swipear» + flecha de 13, `text-[11px] font-semibold text-accent`. `Discover.tsx:392-396`.
  - Contador «por ver»: cuenta las obras del catálogo de esa estantería que no tienen entrada. `Discover.tsx:354`.

### Mazo (pantalla de tarjetas)

- Cabecera de la variante hub: `safe-top px-5 pt-2` (8) `pb-1` (4), fila con `justify-between`. `Discover.tsx:479`. **(condicional)** solo con `variant === 'hub'`.
  - Enlace «Categorías»: `text-[13px] font-medium text-accent`, `gap-1` (4), `py-1` (4), `px-1.5` (6), `-ml-1` (−4), flecha `back` de 15, `strokeWidth 2.4`. `Discover.tsx:481-488`.
  - Resumen a la derecha: `text-xs text-mute font-medium tabular-nums`, «Estantería · N por ver» o «Al día». `Discover.tsx:491-493`.
- Zona central: `flex-1 min-h-0 px-5 relative`. `Discover.tsx:500`.
  - Mazo: `SwipeDeck` ocupa toda la zona. Ver «SwipeDeck».
  - Vacío («¡Has repasado todo!»): título `text-title font-medium` (22). Botón «Ordenar con ¡Duelos!» primario. Chips de las otras estanterías (`gap-2` (8), `mt-3` (12), `flex-wrap`, centradas). `Discover.tsx:532-546`. **(condicional)** `deck.length === 0`.
  - Aviso de tarjeta (`NudgeCard variant="card"`): **(condicional)**, no medido aquí.
- Zona inferior: `shrink-0 px-5` (20), `pt-1` (4), `pb-4` (16). `Discover.tsx:552`.
  - Fila de botones: `flex items-center justify-center gap-4` (16). `Discover.tsx:579`.
  - **Deshacer**: caja `w-12 h-12` (48), `rounded-full`, `bg-accent`, icono `rotateCcw` 20 `strokeWidth 2.4`. Desactivado: fondo `surface`, texto `mute`, `opacity-40`. `Discover.tsx:580-587`.
  - **No me interesa** (izquierda): caja de 68 × 68, color `#ef4b4b`, icono `x` 30 `strokeWidth 2.6`. `Discover.tsx:589-597`.
  - **Pendiente** (arriba): caja de 56 × 56, color `#5b9cf5`, icono `bookmark` 24 `strokeWidth 2.4`. `Discover.tsx:598-606`.
  - **Visto** (derecha): caja de 68 × 68, color `#3ec878`, icono `check` 32 `strokeWidth 2.8`. `Discover.tsx:607-615`.
  - Hueco final: `w-12` (48), vacío, para centrar. `Discover.tsx:616`.
  - Botones de acción (`ActionBtn`): `rounded-full`, `bg-surface`, `border border-line`, `active:scale-90`, `transition-transform duration-150`. Desactivados: `opacity-25`. `Discover.tsx:812`.
- Hoja «Elegir estantería» (`Sheet` 60 %): **(condicional)**, solo variante `header_sheet`. No se porta (D1).
- Modal de variantes: no se porta (D1).

## CompareHome (`app/src/screens/CompareHome.tsx`)

- Raíz: `h-full flex flex-col bg-bg`. Cabecera `ScreenTitle` con etiqueta «DUELOS». `CompareHome.tsx:141-146`.
- Cuerpo: `flex-1 min-h-0 overflow-y-auto px-5` (20), `pb-6` (24). `CompareHome.tsx:148`.
- Título según el estado (sin medida, texto literal en `CompareHome.tsx:111-128`): «¡Duelos!», «Todo por empezar», «N <estantería> esperan su sitio», «Todo en su sitio», «Seguimos puliendo tus <estantería>».

**Próximo duelo (si hay par)** `CompareHome.tsx:150-190`
- Bloque: `mt-6` (24) `flex-col items-center`. `CompareHome.tsx:151`.
- Pila de dos cartas: `relative flex items-center justify-center py-2` (8). `CompareHome.tsx:153`.
  - Carta A: `w-[118px] h-[177px]` (2:3), `rounded-[10px]`, `shadow-lg`, `-rotate-[5deg]`, `shrink-0`. `CompareHome.tsx:155`.
  - Carta B: `w-[118px] h-[177px]`, `rounded-[10px]`, `shadow-lg`, `rotate-[5deg]`, `-ml-[14px]` (solapa 14 px). `CompareHome.tsx:161`.
  - Círculo central: `w-[34px] h-[34px]` (34), `rounded-full`, `bg-bg`, `border border-line`, `shadow-md`, centrado, `z-10`. `CompareHome.tsx:168`.
  - Texto «o»: `serif text-[14px] text-mute`. `CompareHome.tsx:171`.
- **(condicional)** Juego de mesa con forma: en lugar de `h-[177px]`, la clase de `posterBox` (su `aspectRatio`). `CompareHome.tsx:155`, `:161`.
- Leyenda del par: `serif text-[15px]`, `mt-[14px]`, `truncate`, `max-w-full`, `px-2` (8), centrada. Títulos en cursiva (`italic`), «o» en `text-mute not-italic`. `CompareHome.tsx:176-180`.
- Botón principal: primario, `w-full mt-5` (20). Texto literal «Empezar · 7 duelos». `CompareHome.tsx:183-189`.

**Todo en su sitio (si todas al 100 %)** `CompareHome.tsx:191-200`
- Bloque `mt-6`, `py-6`, centrado. Botón primario `w-full mt-2`, texto «Ir a Descubrir». **(condicional)**.

**Otras estanterías** `CompareHome.tsx:204-286` **(condicional)** si hay más de una disponible.
- Bloque `mt-8` (32).
- Etiqueta «OTRAS ESTANTERÍAS»: `text-label text-mute`. `CompareHome.tsx:206`.
- Línea: `h-px bg-line mt-2.5` (10). `CompareHome.tsx:207`.
- Lista: `flex-col gap-5` (20), `mt-5` (20). `CompareHome.tsx:209`.
- Cada fila: `w-full text-left`, `active:scale-[0.99]`, `hover:opacity-90`. `CompareHome.tsx:243`.
  - Cabecera: `h-6` (24), `flex justify-between`. `CompareHome.tsx:246`.
    - Nombre: `serif text-[18px] text-ink leading-none`. `CompareHome.tsx:248`.
    - Porcentaje: `text-meta font-semibold tabular-nums`, color según `pctColor`. `CompareHome.tsx:249`.
    - Estado a la derecha: `text-meta text-mute`, «N nuevas» / «N nueva» / «todo en su sitio». `CompareHome.tsx:253-255`.
  - Barra: `mt-2` (8), `h-0.5` (2 px), `w-full`, `bg-surface2`, `rounded-full`. Relleno con el color de `pctColor`, ancho = porcentaje. `CompareHome.tsx:259-263`.
  - Fila de portadas: `mt-2.5` (10), `flex items-center gap-1.5` (6), `overflow-hidden`. `CompareHome.tsx:268`.
    - Portada: `w-[46px] h-[69px]` (46 × 69), `rounded-md` (6), `bg-surface2`, `shrink-0`. `CompareHome.tsx:270`.
    - Contador «+N»: caja `w-[46px] h-[69px]`, `rounded-md`, `bg-surface2`, `border border-line`, `text-meta text-mute`. `CompareHome.tsx:275`. **(condicional)** si hay más de 5 (`MAX_POSTERS_ROW`, `CompareHome.tsx:15`).
  - Si no hay nada sin ordenar, se usan las dos portadas del próximo duelo de esa estantería. `CompareHome.tsx:222-233`. **(condicional)**.

**Porcentajes: color (`pctColor`)** `CompareHome.tsx:26-31`
- 80 % o más: `#3ec878`. 55 % o más: `#e8c547`. 30 % o más: `#f2913a`. Menos: `#ef4b4b`.

**Estanterías no disponibles** `CompareHome.tsx:289-299` **(condicional)**
- Bloque `mt-8`, `text-meta text-mute text-center`. Enlace subrayado a Descubrir.

**Espacio final**: `h-6` (24). `CompareHome.tsx:302`.

## CompareSession (`app/src/screens/CompareSession.tsx`)

**Cabecera (ScreenTitle)** `CompareSession.tsx:399-446`
- Etiqueta «DUELOS · <ESTANTERÍA>». Título: «¿Cuál te gustó más?» (duelo), «Tu ranking» (sin duelo), «Sesión completada» (resumen). Subtítulo solo en el resumen. `CompareSession.tsx:400-413`.
- Acción derecha: `gap-2.5` (10). `CompareSession.tsx:418`. **(condicional)** solo sin resumen.
  - Contador: `text-meta tabular-nums text-ink/75 font-medium`. **(condicional)** si hay duelos.
  - Botón «Terminar»: `px-2.5` (10), `py-1` (4), `text-meta font-medium`, `rounded-full`, `bg-surface`, `border border-line`. `CompareSession.tsx:425-431`. **(condicional)**.
  - Deshacer: caja `w-8 h-8` (32), `rounded-full`, `bg-accent`, icono `rotateCcw` 16 `strokeWidth 2.4`. `CompareSession.tsx:438-440`. **(condicional)** si hay `undo`.

**Aviso de hito (cada 25 duelos)** `CompareSession.tsx:456`. **(condicional)**
- `absolute top-16` (64) `inset-x-0 mx-auto w-fit z-40`, `bg-surface/95`, `border border-line`, `px-3.5` (14), `py-1.5` (6), `rounded-full`, `text-meta text-ink`, `shadow-lg`, `pointer-events-none`.

**Cuerpo** `CompareSession.tsx:463`
- `flex-1 min-h-0 px-5 pb-6 flex-col`.
- **Duelo**: `SwipePair` (kind `rank`, modo rápido). `CompareSession.tsx:490`. Sus medidas están en «DuelVariants: DuelFan».
  - Destello de la última elección: capa `absolute inset-x-0 top-[42%] z-30 px-6` (24), `pointer-events-none`. `CompareSession.tsx:491`.
  - Caja: `flex-col gap-1` (4), `rounded-xl` (12), `bg-bg/80`, `px-3` (12), `py-2` (8), `text-[13px]`, `max-w-full`. `CompareSession.tsx:500`. **(condicional)** solo con `flash`.
  - Nombre en el destello: `truncate max-w-[14rem]` (224), `text-ink`. Flecha de subida/bajada solo para lectores de pantalla (`sr-only`). `CompareSession.tsx:559-562`.
- **Resumen** `CompareSession.tsx:464-487` **(condicional)**
  - Contenedor `flex-1 min-h-0 flex-col pop` (animación de aparición, 260 ms).
  - Listas: `space-y-4` (16), `overflow-y-auto`. Cada una `MoveList`. `CompareSession.tsx:466-470`.
  - Sin cambios: texto `text-body text-mute py-4`. `CompareSession.tsx:472`.
  - Botones: `mt-4` (16), `pt-2` (8), `flex-col gap-2` (8), todos `w-full`. Primario «Seguir con <estantería>», secundario «Ver tu ranking de <estantería>», texto «Elegir otra estantería». `CompareSession.tsx:476-486`.
- **Completada** `CompareSession.tsx:510-528` **(condicional)**
  - `flex-1 flex-col items-center justify-center text-center gap-3` (12), `px-5`. Título `text-title text-ink` (22). Texto `text-mute text-body max-w-sm` (384). Botones `mt-4`, `gap-2.5` (10), `max-w-xs` (320), `w-full`.
- **Faltan datos** `CompareSession.tsx:530-546` **(condicional)**
  - Título `text-title`, texto `text-mute text-body max-w-sm`. Botones `mt-3`, `gap-2` (8), `max-w-xs`.

**Lista de movimientos (`MoveList`)** `CompareSession.tsx:567-628`
- Sin filas: no se pinta. `CompareSession.tsx:576`.
- Color del título y del indicador: subida `#3ec878`, bajada `#ef4b4b`, confirmada `var(--color-mute)`, nueva `#F5B544`. `CompareSession.tsx:577`.
- Fila: `flex items-center gap-3` (12). `CompareSession.tsx:606`.
  - Portada: `w-8` (32), `h-12` (48), `rounded-[6px]`, `shrink-0`, `object-cover`. Juego de mesa: clase de `posterBox`. `CompareSession.tsx:610`.
  - Título: `serif text-item font-medium line-clamp-1`. Creador o subtítulo: `text-meta text-mute`. `CompareSession.tsx:613-614`.
  - Puesto (pastilla): `font-semibold tabular-nums text-xs px-2.5` (10), `py-1` (4), `rounded-full`, `bg-surface`, `border border-line`, `shrink-0`. `CompareSession.tsx:619`.

**Resumen de la cabecera del resumen**: «Nombre: del X % al Y %» o «Nombre: Y % ordenado». `CompareSession.tsx:410-412`.

## WhatToWatch (`app/src/screens/WhatToWatch.tsx`)

Fases: elegir estantería (`shelf`), preguntas (`ask`), afinar con duelos (`shape`), propuesta (`propose`), final (`done`) y «se acabaron» (`none`). Las marcas de `ScreenTitle` se cuentan en cada fase.

**Persistencia**: `SNAP_KEY = 'biblioteca-decidir-v5'` guarda el estado en `localStorage` (`WhatToWatch.tsx:42-66`). En nativo no hay `localStorage`: su sustituto (AsyncStorage, D28) se decide al portar la pantalla.

**Elegir estantería** `WhatToWatch.tsx:548-585` (fase `shelf`)
- Cabecera: etiqueta «DECIDIR», título «¿Por dónde tiramos hoy?», subtítulo «Elige qué te apetece y te hago unas preguntas rápidas.» `WhatToWatch.tsx:549-554`.
- Lista: `flex-1 min-h-0 scroll-y flex-col px-5` (20), `pb-16` (64), `gap-3` (12). `WhatToWatch.tsx:558`.
- Tarjeta de estantería: `relative flex-1 min-h-[110px] rounded-2xl` (16), `overflow-hidden`, `border border-line`, `bg-surface`, `active:scale-[0.985]`. `WhatToWatch.tsx:568`.
  - Fondo: 3 portadas en rejilla `grid-cols-3 gap-px`, `opacity-30`. `WhatToWatch.tsx:570`.
  - Degradado: de `bg` a transparente, de izquierda a derecha, `via-bg/80`. `WhatToWatch.tsx:573`.
  - Texto: `absolute inset-y-0 left-0 flex-col justify-center px-5` (20). Título `text-title font-semibold` (22). Subtítulo `text-meta mt-1`. `WhatToWatch.tsx:574-577`.
  - Flecha: caja `w-9 h-9` (36), `rounded-full`, `bg-surface2`, `border border-line`, `right-4` (16), `bottom-4` (16), icono 16. `WhatToWatch.tsx:578-580`.
- Subtítulos por estantería (texto literal en `titleOf`, `WhatToWatch.tsx:68`): «¿Qué leo ahora?», «¿A qué jugamos hoy?», «¿Qué escucho hoy?», «¿Qué vemos hoy?».

**Preguntas** `WhatToWatch.tsx:586-657` (fase `ask`)
- Cabecera: etiqueta «DECIDIR · <ESTANTERÍA>», progreso `step`, título de la pregunta, acción «Reiniciar» (`Button` texto). `WhatToWatch.tsx:589-599`.
- Cuerpo: `flex-1 min-h-0 flex-col px-5` (20), `pb-5` (20). `WhatToWatch.tsx:602`.
  - Tarjetas de respuesta (`ChoiceCard`): rejilla `flex-1 grid gap-3` (12). Dos columnas si hay 4 opciones, si no una. Filas `repeat(n, minmax(96px, 1fr))`. `WhatToWatch.tsx:626-629`.
  - Opción «Me da igual»: aparte, centrada, `self-center mt-2` (8), `min-h-[44px] px-5` (20), `text-meta font-medium`. `WhatToWatch.tsx:635`. **(condicional)**.
  - Pie de la pregunta: `mt-4` (16), botón secundario «Atrás» o «Cambiar categoría» (primera pregunta). `WhatToWatch.tsx:646-654`.
- Plataformas (pregunta de varias respuestas, `q.multi`): `PlatformTiles`. `WhatToWatch.tsx:613-618`.
  - Rejilla de 2 columnas, `gap-2.5` (10). `WhatToWatch.tsx:878`.
  - Loseta: `min-h-[64px]`, `rounded-2xl` (16), `border`, `px-4` (16), `gap-2` (8), `text-body font-medium`, `active:scale-[0.985]`. Seleccionada: `bg-surface2 border-accent`; si no, `bg-surface border-line`. Icono de marca 16 `strokeWidth 2.5`. `WhatToWatch.tsx:870`.
  - Nota: `text-meta mt-3` (12), `mb-6` (24). `WhatToWatch.tsx:882`.
  - Botón «Seguir» primario, `mt-auto w-full`. `WhatToWatch.tsx:883`.

**Ajuste de duelos (`ShapePhase`)** `WhatToWatch.tsx:658-701` (fase `shape`)
- Cabecera: etiqueta «DECIDIR · <ESTANTERÍA>», progreso `step`, título «¿Por dónde tiramos hoy?» (fase gruesa) o «Afinando el tiro».
- Cuerpo: `flex-1 min-h-0 flex-col px-5` (20), `pb-6` (24). `WhatToWatch.tsx:672`.
- Duelo: `SwipePair` kind `decide` (no rápido). Sus medidas están en «DuelVariants: DuelFan».
- Hueco `extra`: `h-12` (48), `flex items-center justify-center`. `WhatToWatch.tsx:680`.
  - Botón «Pasar»: `min-h-[42px] px-5` (20), `rounded-full`, `bg-[#ffb340]`, texto `text-[#1a1206]` 14 px `font-semibold`. Sombra `0 0 0 1px rgb(255 179 64 / 0.5)` y resplandor `0 0 22px 2px rgb(255 150 40 / 0.45)`. `WhatToWatch.tsx:691`. Aparece con animación (y 8 a 0, escala 0.96 a 1, 220 ms). **(condicional)** solo si `showUnknownBtn`.

**Propuesta** `WhatToWatch.tsx:702-747` (fase `propose`)
- Cabecera: etiqueta «DECIDIR · <ESTANTERÍA>», título «Te propongo esta». `WhatToWatch.tsx:705-713`.
- Cuerpo: `flex-1 min-h-0 flex-col px-5` (20), `pb-6` (24). `WhatToWatch.tsx:716`.
  - Tarjeta de la obra: `relative flex-1 min-h-0 rounded-2xl` (16), `overflow-hidden`, `border border-line`, `bg-surface`, `block`. `WhatToWatch.tsx:720`.
  - Portada a todo el ancho de la tarjeta: `absolute inset-0`. Degradado de `bg` abajo. `WhatToWatch.tsx:722-723`.
  - Texto: `absolute bottom-0 inset-x-0 p-5` (20). Etiqueta `text-label text-mute`. Título `text-display` (30) `mt-1`. Motivo `text-meta text-accent mt-2` (8), `font-medium`. Sinopsis `text-body text-mute mt-1.5` (6), `line-clamp-2`. `WhatToWatch.tsx:724-730`.
- Enlace «Ver otras N candidatas»: `self-center mt-3` (12), `min-h-[36px] px-3` (12), `text-meta text-accent font-medium`, `gap-1`, flecha 14. `WhatToWatch.tsx:734`. **(condicional)** si hay alternativas.
- Botones: fila `flex gap-3` (12), `mt-2` (8). «Seguir buscando» secundario `flex-1`; «¡Esta!» primario `flex-[1.2]`. `WhatToWatch.tsx:738-745`.

**Final** `WhatToWatch.tsx:748-774` (fase `done`)
- Cabecera: título «A leer», «A jugar», «A escuchar» o «A disfrutar» según la estantería; subtítulo con el título de la obra. `WhatToWatch.tsx:752-754`.
- Cuerpo: `flex-1 min-h-0 flex-col items-center justify-center px-6` (24), `text-center gap-4` (16). `WhatToWatch.tsx:758`.
  - Portada: `w-36` (144), `rounded-2xl` (16), `border border-line`. Juego de mesa: clase de `posterBox`. `WhatToWatch.tsx:759`.
  - Botones: `flex-col gap-2.5` (10), `w-full max-w-xs` (320), `mt-2` (8). `WhatToWatch.tsx:760`.
  - «Abrir en <plataforma>»: primario con icono `tv` 18. **(condicional)** si no es libro y hay plataforma. `WhatToWatch.tsx:761-765`.
  - «Ya la he visto: valorar»: secundario. `WhatToWatch.tsx:766-768`. (El texto usa `pronoun` y `seenPastPart`.)
  - «Empezar de nuevo»: texto. `WhatToWatch.tsx:769-771`.

**Se acabaron las candidatas** `WhatToWatch.tsx:775-792` (fase `none`)
- Cabecera: título «Se acabaron las candidatas», subtítulo literal. `WhatToWatch.tsx:777-781`.
- Cuerpo: centrado, `gap-3` (12), `px-6` (24). Botón primario «Empezar de nuevo», texto «Ir a Descubrir». `WhatToWatch.tsx:783-791`.

**Hoja de otras candidatas** `WhatToWatch.tsx:802-827`
- Altura 70 %. Título `text-title text-ink`. Subtítulo `text-meta mb-3`.
- Lista: `space-y-1` (4), `overflow-y-auto`, `-mx-2`, `maxHeight 56vh`. `WhatToWatch.tsx:805`.
- Fila: `w-full flex items-center gap-3` (12), `px-2` (8), `py-2` (8), `rounded-xl` (12), `active:bg-surface2`. `WhatToWatch.tsx:815`.
  - Número de orden: `w-5` (20), `text-center text-meta tabular-nums`, empieza en 2. `WhatToWatch.tsx:817`.
  - Portada: `w-10` (40), `rounded-md` (6), `shrink-0`, `self-center`. `WhatToWatch.tsx:818`.
  - Título: `serif text-item truncate`. Año · creador: `text-meta truncate`. `WhatToWatch.tsx:820-821`.

**Tarjeta de respuesta (`ChoiceCard`)** `WhatToWatch.tsx:834-859`
- Botón: `relative min-h-[96px] rounded-2xl` (16), `overflow-hidden`, `border`, `bg-surface`, `text-left`, `active:scale-[0.985]`. Borde `border-accent` si está seleccionada, si no `border-line`. `WhatToWatch.tsx:843`.
- Fondo con portadas (si `posters` tiene elementos): rejilla `grid-cols-3 gap-px` a `opacity-35`, con degradado de `bg` (`via-bg/75`, a `bg/10`). `WhatToWatch.tsx:847-850`. **(condicional)**.
- Texto: `absolute inset-x-0 bottom-0 p-4` (16). Título `serif text-title font-semibold leading-tight`. Subtítulo `text-meta mt-1` (4). `WhatToWatch.tsx:853-855`.

## ItemDetail (`app/src/screens/ItemDetail.tsx`)

**Botón volver** `ItemDetail.tsx:114`
- `absolute left-4` (16), `z-20`, `w-10 h-10` (40), `rounded-full`, `bg-bg/85`, `border border-line`, icono 20. Posición superior `max(env(safe-area-inset-top), 16px)`.

**Contenedor** `ItemDetail.tsx:117`: `h-full scroll-y pb-10` (40).

**Hero (portada grande)** `ItemDetail.tsx:118-127`
- Pósteres de música: `w-full aspect-square`.
- Juego de mesa con `posterRatio`: `w-full`, con `aspectRatio` = `boardgameDetailAspect` (clamp 0.75 a 1.6). `ItemDetail.tsx:110`, `:126`.
- Resto: **`h-[430px]`** (430 px de alto).
- Póster: `absolute inset-0 w-full h-full`, `borderRadius 0`, con `layoutId`. `ItemDetail.tsx:128`.
- Degradado: `absolute inset-0`, de `bg` a `bg/50` y `black/30`. Aparece con `opacity` de 0 a 1 en 250 ms, con retraso de 120 ms. `ItemDetail.tsx:130`.
- Burbujas de amigos: `absolute right-4` (16), `z-10`, arriba `max(env(safe-area-inset-top), 16px)`. Aparecen en 250 ms con retraso de 160 ms. `ItemDetail.tsx:133`. **(condicional)** si hay amigos con esa obra.
- Bloque de título: `absolute bottom-0 inset-x-0 px-5` (20). Entra con `y 12 → 0`, 300 ms, retraso 160 ms. `ItemDetail.tsx:137`.
  - Tipo · año: `text-label text-ink/80`. `ItemDetail.tsx:138`.
  - Título: `text-display` (30 px) `mt-1` (4), `text-ink`. `ItemDetail.tsx:139`.
  - Creador · datos: `text-meta text-ink/80 mt-1`. El creador es un enlace subrayado si tiene `artistId`. `ItemDetail.tsx:140-149`.

**Cuerpo** `ItemDetail.tsx:153`
- `px-5` (20), `mt-4` (16), `space-y-5` (20).
- Etiquetas: `flex-wrap gap-1.5` (6). Géneros (`Tag` por defecto), plataformas (`Tag accent`). `ItemDetail.tsx:154-156`.
- Enlace a Spotify (canciones): `inline-flex items-center gap-1.5` (6), `px-2.5` (10), `py-1` (4), `rounded-xl`, `bg-surface`, `border border-line`, `text-meta text-accent font-medium`, icono 14. `ItemDetail.tsx:158-166`. **(condicional)** `type === 'song'`.
- Sinopsis: `text-body leading-relaxed text-ink/90` (lh 1.625). `ItemDetail.tsx:169`.

**Tu estado** `ItemDetail.tsx:171-241`
- Título de sección: `text-label text-mute uppercase mb-2.5` (10). `ItemDetail.tsx:172`.
- Rejilla de 3 botones: `grid grid-cols-3 gap-2` (8). `ItemDetail.tsx:173`.
- Botón: `min-h-[52px] px-2` (8), `py-2.5` (10), `rounded-2xl`, `border`, `flex-col items-center justify-center gap-1` (4), `active:scale-95`, `transition-all`, `font-medium` (500). `ItemDetail.tsx:177`, `:195`, `:214`.
  - **No me interesa** (`dismissed`): activo `bg-rose-500/15 border-rose-500/60 text-rose-400`; icono `x` 16 (`strokeWidth 2.5` activo, 2 si no). `ItemDetail.tsx:178-188`.
  - **Guardar** (`pending`): activo `bg-sky-500/15 border-sky-500/60 text-sky-400`; icono `bookmark` 16, relleno `currentColor` si activo. `ItemDetail.tsx:196-207`.
  - **Visto** (`seen`): activo `bg-emerald-500/15 border-emerald-500/60 text-emerald-400`; icono `check` 16. Texto `label.actionPast`, `truncate max-w-full`. `ItemDetail.tsx:215-226`.
  - Inactivos: `bg-surface border-line text-mute`. Etiqueta `text-meta tracking-tight` (−0.025 em). `ItemDetail.tsx:177-225`.
- Aviso «Te <pronombre> pasó <origen>»: `text-meta text-mute mt-2` (8). **(condicional)** `origin` y pendiente. `ItemDetail.tsx:229`.
- Panel «Tu puesto» (visto): `mt-3` (12), `rounded-2xl`, `bg-surface`, `border border-line`, `p-4` (16). `ItemDetail.tsx:231`. **(condicional)**.
  - Fila «Tu puesto» + insignia: `flex justify-between`. Insignia `RankBadge` con `!text-xs !px-2.5 !py-1` (sobrescribe a 12 px, 10/4). `ItemDetail.tsx:232-234`. **(condicional)** si hay puesto.
  - «nº X de tus N»: `text-meta text-mute mt-1` (4). `ItemDetail.tsx:236`. **(condicional)** si está en el ranking.
  - Comentario: `mt-2` (8), `text-body serif italic text-ink/90`. `ItemDetail.tsx:237`. **(condicional)**.
  - Botón «Editar comentario» / «Añadir comentario»: `mt-3` (12), `min-h-[44px] px-4` (16), `rounded-xl`, `bg-surface2`, `border`, `text-meta font-medium`, `gap-2` (8), icono `edit` 16. `ItemDetail.tsx:238`.

**Tus amigos** `ItemDetail.tsx:243-268`
- Título de sección: `text-label text-mute uppercase mb-2` (8). `ItemDetail.tsx:244`.
- Mensaje vacío: `text-meta text-mute`. `ItemDetail.tsx:245`.
- Lista: `space-y-3` (12). Cada elemento: `rounded-2xl`, `bg-surface`, `border border-line`, `p-3.5` (14). `ItemDetail.tsx:246-250`.
  - Fila: `flex items-center gap-3` (12). `Avatar` de 36. Nombre `text-body font-semibold text-ink`. Puesto `text-meta text-mute`. `ItemDetail.tsx:251-256`.
  - Pastilla de puesto: `shrink-0 rounded-full bg-accent text-accent-ink font-bold text-xs px-2.5 py-1 tabular-nums`. `ItemDetail.tsx:257`. **(condicional)**.
  - Comentario: `mt-2` (8), `text-body text-ink/90 serif italic`. `ItemDetail.tsx:259`. **(condicional)**.
  - Botón «preguntar» (`AskFriend`): debajo, no medido. **(condicional)**.
- Pendientes de amigos: `text-meta text-mute mt-3` (12), `flex gap-1.5` (6), icono 15. `ItemDetail.tsx:266`. **(condicional)**.

**Añadir a una lista**: **no se porta** (`LISTS_ENABLED = false`, `ItemDetail.tsx:270`, D5).

**Estados de carga y de error**
- Cargando (sin datos): cabecera con botón volver `w-10 h-10 rounded-full bg-surface2` (`ItemDetail.tsx:67`), portada `w-28` (112) × `h-40` (160) `rounded-2xl`, dos líneas de 24 px (`h-6`) y 16 px (`h-4`), y bloque `h-24` (96) `mb-4`. `ItemDetail.tsx:65-76`. Anchos `w-3/4`, `w-1/2`.
- No encontrada: texto «No encontramos esta obra.» y enlace «Volver a la biblioteca» (`text-accent underline`). `ItemDetail.tsx:81-84`.

## Shelf (`app/src/screens/Shelf.tsx`)

**Cabecera a sangre (carrete)** `Shelf.tsx:73-104`
- Fondo: degradado de 160°, del color de la estantería con alfa 25 % (`40` en hex) al `bg` al 75 %. `Shelf.tsx:73`.
- Carrete (`FilmStrip`): ver «Carrete» más abajo.
- Degradado de legibilidad: `absolute inset-0`, de `bg/30` a `bg/40` y a `bg`. `Shelf.tsx:75`.
- Bloque de texto: `relative px-5` (20), `pt-[max(env(safe-area-inset-top),18px)]`, `pb-4` (16). `Shelf.tsx:76`.
  - Botón volver: `w-10 h-10` (40), `-ml-1` (−4), `rounded-full`, `bg-bg/60`, `backdrop-blur`, `border border-line/60`, icono 20. `Shelf.tsx:78`. Con `backdrop-blur` (8 px por defecto): el fondo queda `bg/60` sin desenfoque en nativo. **(no fijado)** en nativo.
  - Botón «Añadir»: `w-10 h-10` (40), `rounded-full`, `bg-accent`, icono `plus` 18 `strokeWidth 2.5`. `Shelf.tsx:88`.
  - Botón «Compartir»: **no se porta** (`LISTS_ENABLED = false`, D5). `Shelf.tsx:83-87`.
  - Gap entre botones: `gap-2` (8). `Shelf.tsx:82`.
  - Bloque del título: `mt-24` (96). `Shelf.tsx:94`.
  - Etiqueta «ESTANTERÍA» con icono de 14 `strokeWidth 2.2`, `gap-1.5` (6), color de la estantería. `Shelf.tsx:95-96`.
  - Título: `text-display` (30), `mt-1` (4), `truncate`. `Shelf.tsx:98`.
  - Resumen: `text-meta text-ink/75 mt-1`. «N obras · N % ordenado» (color de `pctColor`, `font-semibold`) o «N pendientes». `Shelf.tsx:99-101`.

**Pestañas de texto** `Shelf.tsx:106-120`
- Contenedor: `mx-5` (20), `mb-4` (16), `flex gap-6` (24), `border-b border-line`. `Shelf.tsx:106`.
- Pestaña: `relative pb-2.5` (10), `text-[15px] font-semibold`. Activa `text-ink`, inactiva `text-mute`. `Shelf.tsx:113`.
- Cuenta: `font-normal text-mute tabular-nums`. `Shelf.tsx:116`.
- Subrayado: `absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent`. `Shelf.tsx:117`.

**Barra de selección** `Shelf.tsx:122-125`. **(condicional)** `selecting`, solo con `LISTS_ENABLED` (no se porta).

**Cuerpo** `Shelf.tsx:127`
- `px-5` (20), `pb-28` (112). `Shelf.tsx:127`.

**Ordenadas (con puesto)** `Shelf.tsx:132-139`
- Lista: `rounded-2xl` (16), `bg-surface`, `border border-line`, `divide-y divide-line`, `overflow-hidden`. Cada fila `ItemRow` con puesto (`rank`). `Shelf.tsx:133-136`.
- La primera fila va destacada (`highlight`) si no hay selección. `Shelf.tsx:136`.

**Sin ordenar («NUEVAS»)** `Shelf.tsx:141-198`
- Cabecera: `mb-2.5` (10), texto `text-label text-mute`, «NUEVAS · N». `Shelf.tsx:144-145`.
- Lista: `rounded-2xl`, `bg-surface`, `border`, `divide-y`, `overflow-hidden`. `Shelf.tsx:147`.
- Fila (igual que `ItemRow`): `flex items-center gap-3` (12), `px-4` (16), `py-2.5` (10), `min-h-[56px]`. `Shelf.tsx:152`.
  - Hueco del puesto: `w-6` (24) vacío (`Shelf.tsx:166`). **(condicional)**: en selección, casilla de 20 con `rounded-md`.
  - Póster `w-9` (36), `rounded-[6px]`, `self-center`. `Shelf.tsx:168`.
  - Título `serif text-item line-clamp-1`; año · creador `text-meta mt-0.5`; «nueva» `text-meta mt-0.5`. `Shelf.tsx:170-172`.

**Vacío** `Shelf.tsx:289-296`
- `py-14` (56), `text-center text-mute`, `flex-col items-center gap-4` (16). Texto `max-w-[240px] text-body`. `Shelf.tsx:291-292`.
- Botones: `flex-col gap-2.5` (10) con `max-w-xs` (320) en «ord»; `gap-2` (8) en «pend». `Shelf.tsx:204`, `:245`.

**Pendientes** `Shelf.tsx:212-256`
- Fila de acciones: `flex gap-2` (8). Dos botones `flex-1`: «Limpieza (N)» secundario con icono `sparkle` 16 **(condicional)** si hay 3 o más; y «¿Qué vemos?» (o «¿Qué leo?», «¿A qué jugamos?», «¿Qué escucho?») primario. `Shelf.tsx:215-233`.
- Bloque de filas: `space-y-3` (12). Lista de `ItemRow` con nota «De <origen>» si la hay. `Shelf.tsx:214`, `:237`.

**Botón flotante «Ordenar»** `Shelf.tsx:260-273`
- Condición: no seleccionando, segmento «ord», y 2 o más vistas. **(condicional)**.
- Posición: `absolute right-5` (20), `z-20`, `bottom: max(env(safe-area-inset-bottom), 20px)`.
- Botón: `inline-flex items-center gap-2` (8), `min-h-[52px]`, `pl-4` (16), `pr-5` (20), `rounded-full`, `bg-accent text-accent-ink`, `text-[15px] font-semibold`, `shadow-xl shadow-black/40`, `active:scale-95`. Icono `scale` 18 `strokeWidth 2.2`. `Shelf.tsx:263-266`.
- Contador de nuevas: `min-w-[22px] h-[22px]` (22), `px-1.5` (6), `rounded-full`, `bg-accent-ink text-accent text-[12px] font-bold`. **(condicional)** si hay nuevas. `Shelf.tsx:267-271`.

**Pie de selección** `Shelf.tsx:274-281`. **(condicional)** `selecting`: no se porta (`LISTS_ENABLED` false).

**Carrete (`FilmStrip`)** `Shelf.tsx:299-323`
- Contenedor: `absolute left-[-15%] right-[-15%]` (ocupa el 130 % del ancho, sale por ambos lados), `top-[38%]`, `-translate-y-1/2`, `-rotate-6` (−6°), `bg-black/55`, `py-2` (8), `flex-col gap-2` (8), `pointer-events-none`. `Shelf.tsx:307`.
- Perforaciones (arriba y abajo): fila `flex gap-2.5` (10), `px-2` (8). Cada agujero `w-2.5` (10) × `h-2` (8), `rounded-[2px]`, `bg-bg/80`. Número de agujeros: 3 por fotograma. `Shelf.tsx:302-305`.
- Fotogramas: fila `flex gap-2` (8), `px-2` (8), `items-center`, `h-[96px]` (96), `overflow-hidden`. `Shelf.tsx:309`.
  - Número de fotogramas: `max(10, obras)`. `Shelf.tsx:301`.
  - Con portada: `h-full`, `rounded-[4px]`, `opacity-80`, ancho según `aspectRatio`. `Shelf.tsx:312`.
  - Sin portada (hueco con icono): `h-full`, `aspect-[2/3]`, `rounded-[4px]`, fondo del color de la estantería con alfa 15 % (`26` en hex), icono 26 `strokeWidth 1.8`. `Shelf.tsx:314-315`.
- Proporción de cada fotograma (`frameRatio`, `Shelf.tsx:326-328`): juego de mesa con `posterRatio` → ese valor, acotado entre 0.5 y 2; música → 1; resto → 2/3.

**Colores de estantería** `Shelf.tsx:22-23`
- `movie #f2b04a`, `series #ff6b5b`, `book #e37d8c`, `artist #9d8cff`, `boardgame #4fd1a5`, `song #c084fc` (esta última no está en tokens: ver nota abajo).
- Iconos: `film`, `tv`, `bookOpen`, `music`, `dice`, `disc`.

---

## Proporciones y formas de póster (`app/src/lib/posterShape.ts`)

- Película, serie, libro: **2:3** (`aspect-[2/3]`), `posterShape` → `portrait`. `posterShape.ts:31`, `:43-45`.
- Música (`artist`, `song`): **cuadrada** (`aspect-square`). `posterShape.ts:23`, `:43`.
- Radio de la portada: **10 px** (`posterRadius`), también para artistas (`ARTIST_ROUND = false`, `posterShape.ts:6`). Radio de las miniaturas: 6 (lista) u 8 (Biblioteca vacía). `posterShape.ts:65`, `:112`.
- Juego de mesa, mazo: si `posterRatio` < 0.9, forma vertical; si no, forma apaisada con proporción acotada entre 1 y 1.6. `posterShape.ts:12-22`.
- Juego de mesa, ficha: proporción acotada entre 0.75 y 1.6. `posterShape.ts:23-29`.
- Caja de portada (`posterBox`): juego de mesa con `posterRatio` → proporción acotada entre 0.5 y 2 (`aspectRatio`). Resto → `aspect-[2/3]` o `aspect-square`. `posterShape.ts:98-108`.
- Duelos de juego de mesa (`duelCardSize`, modo `area` por defecto): `posterShape.ts:117-150`.

## Pendiente o no medido

- No medidos (fuera de la lista prioritaria): `SwipePair` (salvo el pie de pista), `NudgeCard`, `AddFlow`, `RatingFlow`, `CleanupFlow`, `AskFriend`, `FriendBubbles` (interior), `Icon` (solo tamaño por defecto 22, `Icon.tsx:43`), `Group`, `BrandLogo`, `PairCompare`, `PlaceFlow`, `Profile`, `Settings`.
- Clases de la web que no existen en `@theme` y se ignoran: `hover:border-line2`.
- Color de la estantería «canción» (`#c084fc`, `Shelf.tsx:22`): no está en `shelfColors` de tokens (`index.css` solo define cinco estanterías). Decidir si se añade (no se inventa aquí).
- Sombras (`shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-md`, `shadow-xs`): el código fija solo el color en `index.css` (`.shadow-2xl`). El tamaño es el de Tailwind por defecto, no fijado en código.
- `backdrop-blur` y `backdrop-blur-md` (`Shelf.tsx:78`, `ui.tsx:99`): no existen en RN. Ver D9.
