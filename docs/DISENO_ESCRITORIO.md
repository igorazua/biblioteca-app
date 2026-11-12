# DISEÑO DE ESCRITORIO — propuesta para aprobar (C3)

> Propuesta de Claude (12/11/2026) para la tarea C3 de `docs/PLAN_SIGUIENTE.md`. **Es solo un documento: no se ha tocado código.** Igor la aprueba, la recorta o la veta antes de que empiece C4.
> Base: `SISTEMA_DISENO.md` (Editorial sobria), la paleta D30 de `DECISIONES_NATIVA.md` y las pantallas actuales de `app/src/screens` y `app/src/components`.
> Alcance: la PWA como web. **El móvil no cambia** (todo lo de este documento va detrás de `lg:`, ≥ 1024 px). **No se inventan funciones**: las propuestas de `TODEO.md` (ficha en hoja, tema por estantería, buscador con IA, party, diario, conmutador de cuadrícula) siguen en el backlog y no aparecen aquí. Los atajos de teclado son la única "novedad", y solo son otra forma de hacer gestos que ya existen.

---

## 0. Qué hay hoy y qué se cambia

- En escritorio la app vive dentro de `.frame` (400 × 850 px con esquinas redondeadas, borde y sombra) sobre `.desk-bg` (halos ámbar y azul). Es una maqueta de móvil, no un diseño de escritorio.
- Las pantallas son de una sola columna, con `h-full` y su propio scroll (`scroll-y`), y la barra inferior (`TabBar`) va dentro del marco.
- Las vistas públicas (`/l/`, `/p/`, `/unete/`) ya están **fuera** del marco, con `max-w-[480px]`. Se ven como una columna estrecha en una pantalla enorme.

Lo que se hace: **quitar `.frame`, `.desk-bg` y el grano de marco**; el fondo del escritorio pasa a ser el mismo `bg` de la app (paleta D30), liso. Debajo de `lg:` todo sigue exactamente igual.

## 1. Principios

La idea es una sola: **el escritorio es el móvil con más sitio, no otra app.** Más portadas a la vista, la ficha en dos columnas, y la misma calma. Misma tipografía, mismos colores, mismo acento (uno por pantalla), mismo tono.

### 1.1 Ancho y rejilla
- **Estructura de la ventana:** barra lateral fija de **240 px** (§2) + zona de contenido que ocupa el resto.
- **Ancho máximo del contenido: 1120 px**, centrado en la zona de contenido. En un monitor de 1920 px quedan márgenes, y es lo que se quiere: el ojo no recorre 1600 px de pósteres, y las filas de texto no pasan de ~70 caracteres.
- **Margen lateral:** 20 px en móvil (`px-5`), **32 px** en `lg:` y **48 px** en `xl:` (≥ 1280). Sigue siendo la rejilla de 4 px y los valores 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 del sistema.
- **Rejilla de pósteres (Biblioteca, Estantería, Descubrir):** columnas automáticas con ancho mínimo de 150 px y hueco de 16 px (`grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))`). Da 5 columnas a 1024 px, 6 a 1280 y 7 a 1440, sin saltos bruscos ni puntos de corte por pantalla. Proporción 2:3 siempre (cuadrada para música, como hoy).
- **Rejilla de texto:** 12 columnas lógicas, pero en la práctica solo se usan tres disposiciones: una columna (lectura), **2 columnas 7/5** (contenido + lateral, p. ej. la ficha) y **2 columnas iguales** (Ajustes, Perfil). Nada de tres columnas de contenido.

### 1.2 Tamaños de texto en escritorio
Se mantienen los seis tokens de `SISTEMA_DISENO.md` §2. Solo suben los dos de arriba (con más espacio, el título necesita respirar) y el cuerpo no cambia. Los tamaños se definen en `@theme` con variantes `lg:`.

| Token | Móvil | Escritorio (≥ 1024) | Nota |
|---|---|---|---|
| `text-display` | 30 / 1.05 | **40 / 1.05** | título de la pantalla |
| `text-title` | 22 / 1.15 | **26 / 1.15** | títulos de sección y de obra en la ficha |
| `text-item` | 16 / 1.2 | 16 / 1.2 | sin cambio |
| `text-body` | 15 / 1.45 | 15 / 1.5 | sin cambio de tamaño; algo más de interlineado |
| `text-meta` | 13 / 1.4 | 13 / 1.4 | sin cambio |
| `text-label` | 11 / 1 | 11 / 1 | sin cambio (el mínimo de 11 px se mantiene) |

Máximo 70 caracteres por línea en párrafos (sinopsis, comentarios): `max-w-prose` (≈ 65ch).

### 1.3 Hover y foco (en escritorio sí cuentan)
D21 quitó los `hover:` de la nativa porque en el móvil no existen. En la web de escritorio **vuelven**, pero discretos (Editorial sobria: sin brillos, sin sombras nuevas):
- **Hover en pósteres y tarjetas:** el póster sube **2 px** y la tarjeta cambia de `surface` a `surface2`. Duración 150 ms. Sin zoom ni sombra.
- **Hover en filas y botones secundarios:** fondo `surface2`. En botones de texto, subrayado.
- **Hover en el botón principal:** el ámbar sube un 8 % de luminosidad. Sin resplandor.
- **Cursor:** `pointer` en todo lo pulsable. El mazo de Descubrir y las cartas de los duelos usan `grab`/`grabbing` mientras se arrastran.
- **Foco visible de teclado:** ya existe `:focus-visible` (2 px de acento, 2 px de separación). Se mantiene tal cual y se comprueba que **todo** lo pulsable es alcanzable con Tab, en orden visual (barra lateral → contenido). Un enlace "Saltar al contenido" invisible hasta que recibe el foco, como primer elemento.
- **Estado pulsado:** se mantiene el del móvil (`active:` a opacidad 0,7 / escala 0,98), porque también se hace clic con el ratón.
- `prefers-reduced-motion` se sigue respetando (ya está en `MotionConfig`).

### 1.4 Atajos de teclado básicos
Solo los que pidió Igor, y solo cuando no hay un campo de texto con el foco ni una hoja abierta. Cada uno hace lo que ya hace el gesto equivalente.

| Dónde | Tecla | Acción |
|---|---|---|
| Mazo de Descubrir | `→` / `←` / `↑` | visto / no me interesa / pendiente (los tres gestos de D2) |
| Mazo de Descubrir | `Z` | deshacer la última tarjeta |
| Mazo de Descubrir | `Intro` | abrir la ficha de la tarjeta de arriba (ya existe) |
| Duelos (sesión, colocar obra) | `←` / `→` | elegir la carta de la izquierda / de la derecha |
| Duelos | `Z` | deshacer el último duelo |
| Cualquier hoja o diálogo | `Esc` | cerrar |
| Ficha, Estantería y pantallas secundarias | `Esc` o `Alt + ←` | volver |

Detalles que importan:
- **Hoy** `SwipeDeck` solo escucha el teclado cuando la carta tiene el foco. En escritorio el mazo debe escuchar a nivel de pantalla (si no, nadie descubre que existe).
- Las teclas deben **animar el mismo gesto** (la carta vuela hacia el lado), no saltarse la animación.
- **Pista visible, no escondida:** bajo el mazo, la línea de leyenda de D3 pasa en escritorio a incluir las teclas: «← No me interesa · ↑ Pendiente · → Visto · Z Deshacer». En los duelos, bajo las cartas: «← → para elegir · Z deshacer». Son `text-meta`, discretas, y la leyenda se deja de mostrar cuando la persona ya ha usado el teclado 10 veces (misma regla que D3).
- Ningún atajo de una letra fuera de `Z` y ninguno en pantallas con campos de texto (buscadores, comentarios).

---

## 2. Navegación

### 2.1 Barra lateral (≥ 1024 px)
Sustituye a la barra inferior. Fija, 240 px, fondo `surface`, borde derecho `line`, a toda la altura de la ventana.

```
┌────────────────────┐
│  Biblioteca        │  ← marca: logotipo + nombre (BrandLogo), 24 px arriba
│                    │
│  ▣ Biblioteca      │  ← 5 secciones, filas de 44 px
│  ◫ Descubrir       │     icono 20 px + texto-body
│  ✧ Decidir         │     la activa: fondo surface2 + texto ink + barrita
│  ⚖ ¡Duelos!        │     de acento de 2 px a la izquierda
│                    │     (la única cosa en ámbar de la barra)
│                    │
│                    │  ← espacio libre
│  ────────────────  │
│  (●) Igor          │  ← Perfil abajo: avatar 32 px + nombre
│      Ver perfil    │     (ocupa el sitio de la quinta pestaña)
└────────────────────┘
```

- **Las cinco secciones** son las de hoy, en el mismo orden y con los mismos nombres: Biblioteca, Descubrir, Decidir (`WIZARD_NAME`), ¡Duelos! y Perfil. **Perfil va abajo, con avatar y nombre**, separado por una línea: es la persona, no una sección más. Eso deja cuatro secciones arriba y el perfil abajo; las cinco siguen existiendo.
- **Sin el botón central elevado** de la barra inferior (el de Decidir): en la barra lateral todas las filas son iguales. El acento se queda en una sola cosa, la sección activa.
- **Ajustes, Conectar, Importar y Métricas no entran en la barra**: se llegan, como hoy, desde Perfil. Para no obligar a dar un rodeo, el menú de Perfil de escritorio los muestra en la columna lateral (§3.7).
- **Estado de la sección:** `NavLink` marca como activa también las subpantallas (`/estanteria/:type` cuenta como Biblioteca; `/i/:id` mantiene la sección desde la que se abrió; `/comparar/:shelf` cuenta como ¡Duelos!). Hoy `end` solo está en `/`; hay que revisar el resto.
- **Foco y teclado:** la barra es la primera zona en el orden de Tab (tras "Saltar al contenido"); flechas arriba/abajo no se usan, para no inventar un patrón nuevo.
- **Estados:** hover = fondo `surface2`; foco = anillo de acento; pulsado = opacidad 0,7.

### 2.2 Puntos de corte
Un solo punto de corte conceptual (**1024 px**) más uno intermedio.

| Ancho | Navegación | Contenido |
|---|---|---|
| **< 768** | barra inferior (hoy) | una columna, igual que hoy |
| **768 – 1023** (tableta, ventana estrecha) | **barra inferior (hoy)**, pero sin el marco: el contenido se centra con `max-w-[640px]` y rejillas de pósteres de 3 a 4 columnas | móvil ampliado |
| **≥ 1024** | **barra lateral de 240 px** | diseño de escritorio completo |
| **≥ 1280** | igual, con margen lateral de 48 px | rejillas de 6 a 7 columnas |

**Por qué no hay barra lateral entre 768 y 1024:** una barra de 240 px se come casi un tercio de una tableta vertical (768 px) y deja 528 px de contenido, que es peor que el móvil estirado. A 1024 px quedan 784 px de contenido, que ya son cómodos para 5 columnas de pósteres. Y una tableta en vertical se usa con el pulgar, igual que un móvil: la barra inferior le sirve mejor. (Si una ventana de escritorio se estrecha por debajo de 1024, vuelve a la barra inferior sin que nada se rompa, porque todo cuelga del mismo `lg:`.)

Se acabó el `.frame`: debajo de 768 px la app va **a sangre** (como hoy en móvil real) y entre 768 y 1023 se centra sin borde ni esquinas.

### 2.3 Estructura técnica (para C4)
- Un único `AppShell` que decide entre `TabBar` y `SideNav` con `lg:`; el contenido se renderiza en el mismo `<Outlet>`.
- El contenedor deja de ser `h-full` con scroll interno por pantalla. En escritorio **hace scroll la ventana** (o un único contenedor de contenido), con la barra lateral fija (`position: sticky; top: 0; height: 100dvh`). Esto da barra de scroll normal, rueda del ratón natural y `Re Pág`/`Av Pág`. Las pantallas que necesitan alto fijo (mazo, duelos) lo piden con `h-[100dvh]`.
- Se oculta la barra de scroll global (`scroll-y` la oculta hoy): **en escritorio se muestra una barra de scroll fina y discreta** (color `line`), porque quien usa ratón la espera.

---

## 3. Pantalla por pantalla

Convenciones del esquema: `│SB│` = barra lateral; `[ ]` = botón o campo; `▓` = póster; el ancho del dibujo no es a escala.

### 3.1 Biblioteca (`Library.tsx`, 248 líneas)
**Hoy:** una tarjeta grande por estantería (`rounded-3xl`, título, "Ver todo" y una fila de pósteres con scroll horizontal) apiladas verticalmente; abajo, votar estanterías y cargar la muestra.

```
│SB│  BIBLIOTECA                                         [+]  (●)
│  │  Tu biblioteca
│  │  ┌──────────────────────────┐ ┌──────────────────────────┐
│  │  │ Películas  48   Ver todo │ │ Series  31      Ver todo │
│  │  │ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ →    │ │ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ →    │
│  │  └──────────────────────────┘ └──────────────────────────┘
│  │  ┌──────────────────────────┐ ┌──────────────────────────┐
│  │  │ Libros ...               │ │ Artistas / Canciones ... │
│  │  └──────────────────────────┘ └──────────────────────────┘
│  │  [ Vota nuevas estanterías ]
```
- **Qué cambia:** las tarjetas de estantería pasan a **2 columnas** iguales (cada una con ~5 pósteres visibles, todavía con carrusel horizontal que ahora responde a rueda, flechas del teclado y a un botón ‹ › al pasar el ratón). Se ven 8-10 portadas por estantería sin tocar nada, frente a 3 en el móvil.
- **Una estantería con la tarjeta que ocupa toda la fila** cuando es impar (la última), para que no quede un hueco.
- **Por qué:** es la pantalla "de entrada"; el escritorio debe enseñar mucho de un vistazo. Dos columnas mantienen cada tarjeta lo bastante ancha para que su carrusel tenga sentido, y evita una rejilla enorme de tarjetas pequeñas.
- **Se queda igual:** el contenido de cada tarjeta, las tarjetas vacías con invitación a Descubrir/Importar, el título `text-display`.
- La cabecera (perfil + "+") pierde el avatar (ya está en la barra lateral); queda el "+" para añadir.

### 3.2 Estantería (`Shelf.tsx`, 329 líneas)
**Hoy:** cabecera a sangre con el carrete de fotos inclinado, pestañas "Mis X / Pendientes", y una lista de filas (`ItemRow`) con el puesto del ranking, con grupos.

```
│SB│  ← Biblioteca                                        [+]
│  │ ┌─────────────────────────────────────────────────────┐
│  │ │ carrete de fotos inclinado (altura 220 px)          │
│  │ │ ESTANTERÍA                                          │
│  │ │ Películas   48 obras · 62 % ordenado                │
│  │ └─────────────────────────────────────────────────────┘
│  │  Mis películas 48     Pendientes 12
│  │  ──────────────────────────────────────────────
│  │  ▓ ▓ ▓ ▓ ▓ ▓ ▓     ← rejilla ancha, con el puesto (1,2,3…)
│  │  1 2 3 4 5 6 7        como número hueco sobre el póster
│  │  ▓ ▓ ▓ ▓ ▓ ▓ ▓
```
- **Qué cambia:** la lista de filas se sustituye en escritorio por una **rejilla de pósteres** (5 a 7 columnas) con el número de puesto hueco encima (ya existe, D8) y el título debajo (`text-item`) y el año/autor (`text-meta`). Es la forma más natural de recorrer 100 obras con ratón. En móvil se queda la lista tal cual.
- **Pestañas Mis X / Pendientes:** igual, pero se alinean con el ancho del contenido (no a sangre).
- **Cabecera:** el carrete se limita al ancho de contenido (1120 px) y a **200-240 px de alto** (hoy ocupa casi todo el alto del móvil), con las esquinas redondeadas del sistema.
- **Selección múltiple** (`LISTS_ENABLED = false`): no se construye.
- **Por qué:** una lista de 56 px de alto con un póster pequeño desperdicia el 80 % del ancho. La rejilla enseña 4-5 veces más portadas por pantalla sin cambiar el orden ni la información. El número hueco conserva "lo que importa es el ranking".
- Pregunta abierta para Igor: ver §6.1 (¿rejilla o lista como vista por defecto?).

### 3.3 Ficha (`ItemDetail.tsx`, 297 líneas)
**Hoy:** póster de 430 px de alto a sangre con degradado, título encima, y debajo etiquetas, sinopsis, tres botones (visto / pendiente / lista…), amigos y comentarios.

```
│SB│  ← Volver
│  │  ┌──────────────┐   ESTANTERÍA · PELÍCULA · 2014
│  │  │              │   Título de la obra (text-display)
│  │  │              │   Director · 169 min · género
│  │  │   PÓSTER     │   [Drama] [Ciencia ficción] [Netflix]
│  │  │   grande     │
│  │  │   (sticky)   │   Sinopsis ........................
│  │  │              │   ................... (máx. ~65ch)
│  │  │              │
│  │  │  caras de    │   [ Visto ] [ Pendiente ] [ Lista ]   ← acciones
│  │  │  amigos      │
│  │  └──────────────┘   Amigos que la tienen
│  │                     (●) Ana · puesto 3 · "comentario…"
│  │                     (●) Luis · puesto 12
```
- **Qué cambia:** **dos columnas 5/7**. A la izquierda el póster completo en proporción real (ancho 360 px, `sticky` mientras se hace scroll del texto, sin degradado ni título encima: aquí no hace falta, el título está al lado y se cumple "texto nunca sobre el póster"). A la derecha el título, metadatos, etiquetas, sinopsis, acciones, y debajo los amigos y comentarios.
- **Las acciones** (Visto / Pendiente / Lista) pasan de rejilla de 3 a una fila de botones secundarios; la acción principal activa conserva el acento (uno por pantalla).
- **Volver:** botón de texto con flecha arriba a la izquierda del contenido (no flotando sobre el póster). Atajo `Esc`.
- **Para obras cuadradas** (música, juegos de mesa con póster horizontal) la columna izquierda adapta su proporción; el fondo difuminado de juegos de mesa y artistas (excepción aprobada en `SISTEMA_DISENO.md` §1) se limita a esa columna.
- **Por qué:** la ficha es donde se lee, y una columna de 1120 px con texto a todo el ancho sería ilegible. Poner el póster al lado aprovecha el espacio y permite ver las acciones sin hacer scroll.
- El vuelo del póster a la ficha (`layoutId`) se mantiene en `lg:` pero solo desde las rejillas; si el destino está en otra columna el vuelo es corto, y es fácil de apagar.

### 3.4 Descubrir (`Discover.tsx`, 818 líneas)
Dos estados: **categorías** (hub) y **mazo**.

**a) Categorías (hub).** Hoy: título, una frase y una rejilla de 2 columnas con una tarjeta por estantería (3 pósteres de muestra y cuántas quedan).
```
│SB│  EXPLORAR CATÁLOGO
│  │  ¿Qué te apetece hoy?
│  │  Elige una estantería para empezar una sesión de tarjetas.
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐
│  │  │ ▓ ▓ ▓   │ │ ▓ ▓ ▓   │ │ ▓ ▓ ▓   │
│  │  │ Pelis   │ │ Series  │ │ Libros  │
│  │  │ 214 sin │ │ ...     │ │ ...     │
│  │  └─────────┘ └─────────┘ └─────────┘
│  │  ┌─────────┐ ┌─────────┐
│  │  │ Artistas│ │ Juegos  │ ...
```
- **Qué cambia:** la rejilla pasa de 2 a **3 columnas** (4 en ≥ 1280). Mismas tarjetas. Hover: tarjeta a `surface2` y los tres pósteres suben 2 px.
- **El botón de variantes de diseño** (`VariantSwitchButton`) es una prueba interna que D1 ya descartó en la nativa; la web de producción debería mostrarlo solo en desarrollo. No es parte del diseño de escritorio, pero hay que decidirlo antes de construir (§6.5).

**b) Mazo.** Hoy: una carta grande (28 px de radio) que ocupa casi todo el alto, con la barra de estanterías en cristal abajo y botones.
```
│SB│  DESCUBRIR · PELÍCULAS               [ Cambiar estantería ]
│  │  [Películas] [Series] [Libros] [Artistas] …   ← chips
│  │
│  │              ┌────────────────────┐
│  │  (carta      │                    │
│  │  siguiente,  │   CARTA ACTUAL     │
│  │  detrás)     │   póster + título  │
│  │              │   caras de amigos  │
│  │              └────────────────────┘
│  │    ← No me interesa   ↑ Pendiente   → Visto   ·   Z Deshacer
│  │    ( ✕ )      ( ↑ )      ( ✓ )      ( ⟲ )
```
- **Qué cambia:** el mazo se queda **centrado, con la carta a un ancho máximo de 400 px y alto de ~ 600 px** (la proporción del móvil, no estirada). El resto del espacio es aire; no se rellena. Los botones redondos (no, pendiente, visto, deshacer) se mantienen debajo, con las teclas en la leyenda (§1.4).
- **Barra de estanterías:** pasa de cristal flotante a una fila de chips normal bajo el título (el cristal se queda en el móvil). Sin `backdrop-blur` nuevo.
- **No se añade ningún panel lateral** de resumen ni de estadísticas: sería contenido nuevo.
- **Por qué:** el swipe es un gesto de pulgar; en escritorio se hace con flechas o con el ratón. Estirar la carta a 1000 px sería un absurdo. Centrarla, dejar aire y poner los botones y teclas a mano es lo que mejor conserva la calma.

### 3.5 ¡Duelos! (`CompareHome.tsx`, `CompareSession.tsx`)
**a) Portada.** Hoy: tarjetas de estantería con cuánto está ordenado y el botón de empezar.
```
│SB│  ¡DUELOS!
│  │  Ordena lo que ya has visto
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐
│  │  │ Pelis     │ │ Series    │ │ Libros    │
│  │  │ 62 % ord. │ │ 40 % ord. │ │ ...       │
│  │  │ [Empezar] │ │ [Empezar] │ │           │
│  │  └───────────┘ └───────────┘ └───────────┘
```
- **Cambia:** rejilla de 3 columnas (como Descubrir hub). Misma tarjeta. Es el mismo patrón que Descubrir, a propósito: una sola forma de elegir estantería.

**b) Sesión.** Hoy: dos cartas lado a lado (tamaño `area`), la pregunta arriba, "o" en el centro, deslizar para elegir, el borde metálico ligado al arrastre (D33), deshacer abajo (D34).
```
│SB│  DUELOS · PELÍCULAS                         Terminar →
│  │  ¿Cuál prefieres?
│  │       ┌──────────────┐  o  ┌──────────────┐
│  │       │              │     │              │
│  │       │   CARTA A    │     │   CARTA B    │
│  │       │              │     │              │
│  │       └──────────────┘     └──────────────┘
│  │         ← elige esta           elige esta →
│  │   ⟲   ← → para elegir · Z deshacer
```
- **Qué cambia:** las dos cartas son **más grandes** (alto hasta 640 px dentro de un contenedor de 960 px máximo) pero **conservan la proporción y el cálculo `duelCardSize`** con la caja medida. Pueden elegirse con clic en la carta (además de arrastrar) y con `←`/`→`. El borde ligado al arrastre (D33) se mantiene con el arrastre del ratón; con teclado, el borde se dibuja completo de golpe con el destello de confirmación.
- **Por qué:** los duelos son la señal más valiosa del motor; en escritorio deben ser lo más cómodo posible (una tecla por duelo). Es también donde más se nota la calma: dos cartas, nada más.
- Para el aire: en pantallas altas (> 900 px) el contenido de la sesión se centra en vertical.

### 3.6 Decidir (`WhatToWatch.tsx`, 888 líneas)
**Hoy:** un asistente de preguntas (1 por pantalla; opciones en rejilla de 1-2 columnas) y un resultado con "otras candidatas" en una hoja.
```
│SB│  DECIDIR · PELÍCULAS                          2 de 5
│  │  ━━━━━━━━──────────
│  │  ¿Con quién la ves?
│  │         ┌───────────────┐ ┌───────────────┐
│  │         │  Solo         │ │  En pareja    │
│  │         └───────────────┘ └───────────────┘
│  │         ┌───────────────┐ ┌───────────────┐
│  │         │  Con amigos   │ │  En familia   │
│  │         └───────────────┘ └───────────────┘
│  │                                  Saltar
```
- **Qué cambia:** el asistente se **centra en una columna de 640 px** (la pregunta en `text-display` a la altura de siempre), las opciones en 2 columnas (4 si hay muchas). Es un asistente de un solo carril: más ancho no ayuda.
- **Resultado:** la obra elegida se enseña con el mismo diseño de **dos columnas de la ficha** (póster a la izquierda, motivos y acciones a la derecha). «Otras candidatas» deja de ser una hoja inferior y pasa a **una fila de 3-4 pósteres bajo el resultado**, a la vista (es la zona que más sitio gana en escritorio).
- **Por qué:** la pantalla es una conversación; lo que sí sobra en escritorio es el espacio vacío para las candidatas, que en el móvil se esconde en una hoja.

### 3.7 Perfil (`Profile.tsx`, 312 líneas)
**Hoy:** avatar, estadísticas (3 columnas), top de cada estantería, amigos, botones de compartir/editar/ajustes.
```
│SB│  ┌───────────────────────────────┐  ┌────────────────────┐
│  │  │ (●) Igor        [Editar]      │  │ Cuenta             │
│  │  │ 214 obras · 12 amigos · …     │  │ › Ajustes          │
│  │  ├───────────────────────────────┤  │ › Conectar apps    │
│  │  │ Top películas   ▓ ▓ ▓ ▓ ▓     │  │ › Importar         │
│  │  │ Top series      ▓ ▓ ▓ ▓ ▓     │  │ › Métricas         │
│  │  │ Top libros      ▓ ▓ ▓ ▓ ▓     │  │ [ Compartir perfil]│
│  │  ├───────────────────────────────┤  └────────────────────┘
│  │  │ Amigos                        │
│  │  └───────────────────────────────┘
```
- **Qué cambia:** **dos columnas 8/4**: a la izquierda el perfil (cabecera, tops, amigos); a la derecha una **columna lateral con los accesos que hoy van dispersos** (Ajustes, Conectar, Importar, Métricas, Compartir). No es una función nueva: son los mismos enlaces, juntos. La columna se queda fija al hacer scroll.
- **Por qué:** en escritorio la persona no tiene una barra inferior con "más"; Perfil es el sitio natural para llegar a las cosas menos frecuentes. Y se evita una pantalla estrecha y larguísima.

### 3.8 Ajustes (`Settings.tsx`, 405 líneas)
**Hoy:** una lista larga de `Group`/`Row` (cuenta, avisos, idioma, estanterías, datos, sugerencias).
```
│SB│  ← Perfil     AJUSTES
│  │  ┌──────────────┐  ┌──────────────────────────────────┐
│  │  │ Cuenta       │  │ AVISOS                            │
│  │  │ Avisos       │  │  Recordatorio semanal   [ ]       │
│  │  │ Idioma       │  │  ...                              │
│  │  │ Estanterías  │  ├──────────────────────────────────┤
│  │  │ Datos        │  │ IDIOMA ...                        │
│  │  │ Sugerencias  │  └──────────────────────────────────┘
│  │  └──────────────┘
```
- **Qué cambia:** **dos columnas**: un índice a la izquierda (220 px, sticky; enlaces a las secciones con desplazamiento suave) y los grupos a la derecha, **con un ancho máximo de 640 px**. Los `Group`/`Row` no cambian. Un índice evita el scroll largo.
- **Por qué:** una lista de filas de 56 px a 1120 px es ilegible (el texto queda lejos del control). Limitar la columna y añadir el índice es lo que hace cualquier panel de ajustes.
- Esta pantalla es la candidata a Haiku (pocos cambios, sin lógica).

### 3.9 Conectar e Importar (`Connect.tsx`, `ConnectSpotify.tsx`, `Import.tsx`)
**Hoy:** una columna de 448 px (`max-w-md`) con una lista de servicios y sus hojas de conexión (usuario / archivo / directa).
```
│SB│  ← Perfil     CONECTAR TUS APPS
│  │  ┌──────────────────────┐ ┌──────────────────────┐
│  │  │ Letterboxd           │ │ Goodreads            │
│  │  │ pelis · series       │ │ libros               │
│  │  │ [ Conectar ]         │ │ [ Conectar ]         │
│  │  └──────────────────────┘ └──────────────────────┘
│  │  ┌──────────────────────┐ ┌──────────────────────┐
│  │  │ Spotify ...          │ │ BGG ...              │
```
- **Qué cambia:** rejilla de **2 columnas** (3 en ≥ 1280) con las tarjetas de servicio. Las hojas de conexión pasan a **diálogo centrado** (§3.11). La importación (progreso, resumen de lo traído) queda en una columna de 640 px.
- **Subir un archivo:** además del selector, se admite **arrastrar y soltar** sobre el diálogo (es el comportamiento nativo del navegador; no es una función nueva, es el `input type="file"` de siempre con zona de soltado). Opcional: si complica C4, se deja fuera.

### 3.10 Métricas (`Metrics.tsx`, 275 líneas)
**Hoy:** bloques en rejillas de 2 y 3 columnas dentro de una columna estrecha.
- **Qué cambia:** las rejillas de 2-3 pasan a **4** donde caben; los bloques se acomodan en 2 columnas 6/6 (motor a la izquierda, uso a la derecha). Es una pantalla de uso interno de Igor: **prioridad baja**. Sin diseño especial más allá del ancho máximo y la rejilla.

### 3.11 Hojas inferiores (`Sheet`): diálogo centrado, no panel lateral
**Decisión propuesta: diálogo centrado.** En `lg:`, `Sheet` se dibuja como un **diálogo centrado** (ancho 480-560 px según contenido, `max-height: 80dvh`, esquinas de 24 px, sombra, fondo oscurecido al 60 %). Debajo de `lg:` sigue siendo la hoja que sube desde abajo, con el asa y el arrastre.

Por qué centrado y no panel lateral:
1. **Todas las hojas de hoy son tareas cortas y puntuales**: valorar (estrellas + comentario), elegir estantería, compartir perfil, conectar un servicio, enviar sugerencia, otras candidatas, añadir a una lista. Un diálogo centrado es el patrón estándar de escritorio para una tarea breve que interrumpe, y bloquea el fondo igual que la hoja.
2. **Un panel lateral sugiere "ver algo al lado del contenido"** (una ficha rápida, un filtro). Eso es lo que propone `TODEO.md` (ficha en hoja) y está en el backlog; hacerlo ahora lo metería por la puerta de atrás.
3. **Es lo que menos cambia:** `Sheet` conserva su API (`children`, `onClose`, `height`, `label`), su foco atrapado y su `aria-modal`; solo cambia el posicionamiento con `lg:`. Un panel lateral exigiría rehacer los contenidos.
4. **Coherente con `Confirm`**, que ya es un diálogo centrado.

Detalles: `Esc` cierra; el clic en el fondo cierra; el foco se atrapa dentro y vuelve al botón que la abrió; la altura la manda el contenido (`height` se ignora en escritorio); sin asa ni arrastre. Entrada: fundido + escala de 0,98 a 1 en 150-200 ms (sin muelle).

### 3.12 Vistas públicas (`Public.tsx`, `JoinInvite.tsx`)
Son lo primero que ve quien recibe un enlace y suele hacerlo **sin cuenta y desde el móvil, a veces desde un ordenador**. Hoy van en una columna de 480 px sobre fondo liso: correcto en móvil, pero en escritorio parece una página rota y sin identidad. **No llevan barra lateral** (la persona no está "dentro" de la app).

**a) `/l/` (lista pública) y `/p/` (perfil público)**
```
┌──────────────────────────────────────────────────────────────┐
│  Biblioteca                         [ Crear mi biblioteca ]  │  ← cabecera simple
├──────────────────────────────────────────────────────────────┤
│        ┌───────────────────────────────────────────┐        │
│        │  LISTA DE IGOR                            │        │
│        │  Para una ruptura                         │        │
│        │  12 obras                                 │        │
│        │  ▓ ▓ ▓ ▓ ▓ ▓   rejilla de 6 columnas       │        │
│        │  ▓ ▓ ▓ ▓ ▓ ▓   con puesto, título, nota   │        │
│        └───────────────────────────────────────────┘        │
│              pie: qué es Biblioteca + llamada principal      │
└──────────────────────────────────────────────────────────────┘
```
- **Qué cambia:** ancho de contenido **de 480 a 880 px** en `lg:` (rejilla de 3 a **5-6 columnas**), con una cabecera mínima (marca a la izquierda, un único botón "Crear mi biblioteca" en acento a la derecha) en lugar de la barra lateral. El pie de llamada a la acción que hoy flota abajo se vuelve una **franja fija bajo el contenido**.
- **Por qué:** quien llega por un enlace tiene que entender en 5 segundos qué es esto y poder entrar; la cabecera con marca y el botón dan esa salida. Y la rejilla más ancha enseña la lista sin tanto scroll.
- Nada nuevo: es la misma vista, la misma llamada a la acción y los mismos datos.

**b) `/unete/` (invitación)**
```
┌──────────────────────────────────────────────────┐
│                      Biblioteca                  │
│            ┌───────────────────────────┐         │
│            │ (●) Ana te invita         │         │
│            │ a ser amigos en           │         │
│            │ Biblioteca                │         │
│            │ [ Aceptar y entrar ]      │         │
│            └───────────────────────────┘         │
└──────────────────────────────────────────────────┘
```
- **Qué cambia:** casi nada: la tarjeta ya es de 384 px y centrada. En `lg:` se centra también en vertical, sobre el fondo liso, con la marca encima y mismo tamaño de texto. Sin sombra extra (hoy tiene `shadow-xl`, que en `lg:` se baja a `shadow-lg` solo por coherencia con las hojas).
- **Por qué:** una invitación es una sola decisión. Más ancho solo la diluiría.

### 3.13 Otras pantallas que cuelgan de las anteriores
- **Onboarding (`Onboarding.tsx`, 684 líneas):** se centra en una columna de 480 px **sin barra lateral** (la persona aún no ha entrado). Pocas ganancias de espacio; queda como está, centrada en vertical. Prioridad baja.
- **EditProfile:** formulario de una columna a 560 px, igual que Ajustes.
- **Toasts, Confirm y PushPrompt/UpdatePrompt:** los avisos pasan de la parte superior del marco a la **esquina inferior derecha** de la ventana en `lg:`. `Confirm` ya es un diálogo centrado.

---

## 4. Qué se reutiliza y qué es nuevo

Estimación de tamaño por pantalla (de la tarea de C4, no de la propuesta): **P** = pequeño (≤ 0,5 día), **M** = medio (≈ 1 día), **G** = grande (≥ 2 días).

### 4.1 Nuevo (hay que construirlo)
| Componente | Qué es | Tamaño |
|---|---|---|
| `AppShell` + `SideNav` | decide barra inferior o lateral con `lg:`, scroll de ventana, «Saltar al contenido» | **M** |
| Tokens `lg:` en `index.css` | `text-display`/`text-title` de escritorio, márgenes, rejilla de pósteres, scroll fino | **P** |
| `PosterGrid` | rejilla `auto-fill` de pósteres con hover (se usa en Estantería, Descubrir hub, públicas) | **P** |
| Atajos de teclado (`useShortcuts`) | un hook que escucha a nivel de pantalla y se desactiva con campos o hojas abiertas | **P** |
| `DetailTwoCol` (maquetación de ficha) | póster `sticky` + columna de texto; se reutiliza en el resultado de Decidir | **M** |
| `PublicHeader` | cabecera mínima de las vistas públicas | **P** |

### 4.2 Se reutiliza con cambios de maquetación
| Componente | Cambio |
|---|---|
| `TabBar` | sin cambios; se oculta con `lg:` y se sustituye por `SideNav` |
| `Sheet` | mismo componente; en `lg:` se posiciona como diálogo centrado (§3.11) |
| `SwipeDeck` | el teclado pasa a nivel de pantalla y anima el gesto; resto igual |
| `SwipePair`, `DuelVariants`, `PairCompare`, `PlaceFlow` | tamaño de carta mayor en `lg:`; teclado `←`/`→`/`Z`; clic para elegir |
| `Poster`, `PosterCard`, `ItemRow`, `Group`, `Button`, `ScreenTitle`, `Icon`, `Avatar`, `Chip`, `Tag`, `StarRating` | **sin cambios**, salvo `hover:` y el espaciado en `lg:` |
| `RatingFlow`, `AddFlow`, `CleanupFlow`, `FindFriends`, `AvatarCropper`, `ImportFlowView`, `PhoneDiscovery`, `AskFriend`, `NudgeCard` | sin cambios internos: viven dentro de `Sheet`/diálogo |
| `Toast`, `UpdatePrompt`, `PushPrompt` | posición en `lg:` |

### 4.3 Estimación por pantalla
| Pantalla | Qué hay que hacer | Tamaño |
|---|---|---|
| Shell + navegación + tokens + quitar `.frame` | base de todo | **M** |
| Hojas → diálogo (`Sheet`) | un componente | **P** |
| Biblioteca | 2 columnas de tarjetas, carrusel con flechas | **P** |
| Estantería | rejilla de pósteres, cabecera limitada | **M** |
| Ficha | dos columnas, póster `sticky` | **M** |
| Descubrir — categorías | 3 columnas | **P** |
| Descubrir — mazo | centrado, teclado, chips | **G** |
| Duelos — portada | 3 columnas | **P** |
| Duelos — sesión | cartas mayores, teclado, clic | **G** |
| Decidir | columna centrada, resultado en 2 columnas, candidatas visibles | **G** |
| Perfil | 8/4 con columna de accesos | **M** |
| Ajustes | índice + columna de 640 px | **P** |
| Conectar e Importar | rejilla de tarjetas | **P** |
| Métricas | rejillas de 4 | **P** |
| Públicas (`/l/`, `/p/`, `/unete/`) | cabecera, rejilla, centrado | **M** |
| Onboarding, EditProfile | ancho máximo y centrado | **P** |

---

## 5. Orden de construcción y reparto

Regla de Igor: **antes de lanzar agentes, preguntar quién construye** (Sonnet, Haiku o Gemini). Lo que sigue es la recomendación de Claude para esa pregunta, no un lanzamiento.

| # | Qué | Quién | Por qué ahí |
|---|---|---|---|
| 1 | **Base:** `AppShell`, `SideNav`, tokens `lg:`, fuera `.frame`/`.desk-bg`, scroll de ventana, `Sheet` como diálogo | **Sonnet** | toca la estructura de todas las pantallas; es lo que más puede romper el móvil |
| 2 | **Ficha** (dos columnas) y `DetailTwoCol` | **Sonnet** | patrón que reutilizan Decidir y las públicas |
| 3 | **Descubrir mazo** y atajos de teclado (`useShortcuts`) | **Sonnet** | gestos, foco y animaciones |
| 4 | **Duelos sesión** (cartas, teclado, clic) | **Sonnet** | el borde ligado al arrastre (D33) y `duelCardSize` son delicados |
| 5 | **Decidir** | **Sonnet** | asistente largo (888 líneas) |
| 6 | **Estantería** (rejilla) y `PosterGrid` | **Sonnet** | es la que más se usa; debe quedar fina |
| 7 | **Biblioteca**, **Descubrir categorías**, **Duelos portada** | **Haiku** | cambio de columnas con el mismo contenido |
| 8 | **Perfil**, **Ajustes**, **Conectar/Importar**, **Métricas**, **EditProfile**, **Onboarding** | **Haiku** | maquetación sin lógica |
| 9 | **Vistas públicas** | **Haiku** (con repaso de Claude) | maquetación sencilla pero es lo primero que verá un invitado |

- **1 va primero y solo** (hasta que `tsc` y los tests pasen). Del 2 al 6 pueden ir de dos en dos si no se pisan archivos. 7-9 se pueden lanzar a la vez a Haiku cuando el 1 esté hecho.
- **Reglas para todos:** nada cambia debajo de `lg:`; sin lógica nueva; sin valores sueltos (`text-[Npx]`); cada paso en su propio commit; `npx tsc -p app/tsconfig.json --noEmit` y los tests de datos pasan.
- **Qué no se revisa a ojo:** por la regla de Igor no hay capturas ni navegador. Igor revisa en su ordenador. Claude comprueba solo `tsc`, tests y el bundle (el límite de 300 KB del bundle inicial se mantiene: `SideNav` y `AppShell` no deben engordarlo de forma apreciable).
- **Riesgo a vigilar en C4:** C1 (la PWA usa `@biblioteca/core`) toca los mismos archivos de lógica, no de maquetación, pero los dos agentes no deben trabajar a la vez en `Discover.tsx`, `CompareSession.tsx` ni `WhatToWatch.tsx`. Orden recomendado: **C1 antes que C4**, como ya dice el plan.

---

## 6. Decisiones abiertas para Igor

Como mucho cinco. Cada una con la recomendación de Claude.

1. **¿Rejilla de pósteres o lista en la Estantería (§3.2)?** La rejilla enseña 4-5 veces más portadas, pero la lista (`ItemRow`) muestra el puesto, el título completo y los comentarios de amigos a primera vista.
   **Recomendación: rejilla por defecto en escritorio**, con el puesto hueco encima de cada póster. (No hay conmutador: sería una función nueva y `TODEO.md` lo deja en el backlog.)

2. **¿Barra lateral con el Perfil abajo (§2.1) o cinco filas iguales?** Recomendación: **Perfil abajo con avatar y nombre.** Es una persona, no una sección; deja el sitio natural a la cuenta y evita que "Perfil" parezca igual de importante que "Descubrir".

3. **¿Hoja inferior → diálogo centrado (§3.11)?** Recomendación: **diálogo centrado** en escritorio. Un panel lateral queda descartado porque se parece a la "ficha en hoja" del backlog.

4. **Intervalo 768–1023 px (§2.2): ¿barra inferior con contenido centrado, o barra lateral estrecha de iconos (72 px)?** Recomendación: **barra inferior con contenido centrado**. Una barra de iconos es otro estado de la navegación que mantener y a 768 px aporta poco; la tableta vertical se usa como un móvil grande.

5. **Mazo de Descubrir en escritorio (§3.4b): ¿carta de móvil centrada con aire o carta ancha que llene la pantalla?** Recomendación: **carta de móvil centrada (ancho máximo 400 px)**, sin panel lateral inventado. Es la forma de conservar la calma y el gesto; el resto del espacio es silencio.

**Cosas que Claude ha decidido solo** (por si Igor quiere vetarlas): ancho máximo de contenido 1120 px, barra lateral de 240 px, `text-display` de 40 px en escritorio, hover discreto (2 px de subida, sin sombras), rejilla de pósteres `auto-fill` de 150 px mínimo, y que las vistas públicas lleven cabecera mínima sin barra lateral.

**Fuera de este documento** (siguen en el backlog): ficha en hoja inferior, tema por estantería, buscador con IA, party, diario y conmutador de cuadrícula (`docs/TODEO.md`); selector de variantes de Descubrir; listas (`LISTS_ENABLED = false`).
