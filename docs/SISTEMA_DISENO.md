# SISTEMA DE DISEÑO — estilo «Editorial sobria» (A)

> Elegido por Igor el 22/10/2026 entre tres propuestas. Objetivo: que la app deje de parecer amateur. **Toda pantalla nueva o rehecha cumple este documento.** Si algo no encaja, se cambia aquí primero y después en el código.
> Referencias: Letterboxd, Shelf y las revistas culturales. Calma, mucho aire y la serif solo donde importa.

---

## 1. Principios
1. **Menos es más.** Cada pantalla tiene **una** cosa principal. Lo secundario es más pequeño, gris y está más lejos.
2. **El contenido manda.** Los pósteres y los títulos son la decoración; la interfaz se aparta.
3. **Sin efectos.** Nada de cristales (`backdrop-blur`), brillos, resplandores, degradados decorativos ni bordes iluminados. Solo hay dos excepciones: el oscurecido sobre un póster para que se lea un texto y la sombra de las hojas que flotan.
   - **En revisión (Igor, 23/10/2026):** a Igor la app le parece plana y «sin efectos»; esta regla se va a replantear con la nueva dirección visual. Mientras tanto hay dos excepciones más: el resplandor ámbar del botón «No conozco ninguna» de Decidir y el círculo naranja con el puesto sobre los pósteres de la biblioteca. No las quites.
4. **Un único sistema.** Los mismos tamaños, espacios y componentes en todas las pantallas. Nada de valores sueltos (`text-[13.5px]`, `mt-[7px]`).
5. **Texto nunca encima del póster,** salvo en una franja oscurecida pensada para eso.

## 2. Tipografía
Dos familias, y ninguna más:
- **Serif: Fraunces** (ya instalada), **solo para títulos**: el de la pantalla, el de cada obra y los números grandes.
- **Sans: Inter** (sustituye a Outfit: más neutra y más legible en tamaños pequeños). Se instala con `@fontsource-variable/inter`; es la única dependencia nueva permitida.

Escala cerrada, con tokens en `index.css` (`@theme`):

| Token | Uso | Familia | Tamaño / interlineado | Peso |
|---|---|---|---|---|
| `text-display` | título de la pantalla («¿Por dónde tiramos hoy?») | serif | 30 / 1.05 | 500 |
| `text-title` | título de sección, título de obra en la ficha | serif | 22 / 1.15 | 500 |
| `text-item` | título de obra en tarjetas y listas | serif | 16 / 1.2 | 500 |
| `text-body` | texto normal, botones | sans | 15 / 1.45 | 400 · 500 en botones |
| `text-meta` | año, autor, ayudas, subtítulos | sans | 13 / 1.4 | 400, color `mute` |
| `text-label` | etiquetas pequeñas en MAYÚSCULAS («DECIDIR · LIBROS») | sans | 11 / 1, `tracking-[0.14em]` | 500, color `mute` |

- **Prohibido:** cursiva salvo dentro de un título citado, más de dos pesos por pantalla y texto por debajo de 11 px.
- **Alineación:** a la izquierda por defecto. El centrado se reserva para estados vacíos y confirmaciones.
- Números (puestos, contadores): `tabular-nums`.

## 3. Espacio
Rejilla de **4 px**. Solo estos valores: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48.
- **Margen lateral de la pantalla: 20 px** (`px-5`), en todas.
- **Entre secciones: 32 px.** Entre el título de una sección y su contenido: 12 px. Entre elementos de una lista o rejilla: 12 px.
- **Cabecera de pantalla** (siempre la misma, ver §5.1): 22 px por arriba (más la zona segura) y 24 px por debajo antes del contenido.
- Todo lo que se toca mide al menos **44 px** de alto.

## 4. Color
Se mantiene la paleta de `index.css`, con estas reglas de uso:
- **Fondo:** `bg` (#100e0c) en todas las pantallas. `surface` solo para tarjetas y listas agrupadas; `surface2` para campos y botones secundarios.
- **Texto:** `ink` el principal y `mute` todo lo secundario. Nunca opacidades sobre el texto (`text-white/70`): se usa `mute`.
- **Líneas:** `line`, a 1 px. No hay bordes dobles ni anillos.
- **Acento (ámbar):** **una sola cosa por pantalla**: el botón principal, la barra de progreso o el elemento activo. No va en títulos, iconos decorativos ni etiquetas.
- **Colores de estantería** (`shelf-*`): solo en el puntito o la etiqueta de categoría, nunca en fondos grandes.
- El violeta del duelo (`#9A86FF`) se queda solo para el lado B del duelo.

## 5. Componentes
### 5.1 Cabecera de pantalla (`ScreenTitle`)
```
DECIDIR · LIBROS                          2 de 5      ← text-label (mute) + contador text-meta
━━━━━━━━━━━━━──────────────────────                   ← progreso 2 px (acento), solo si hay pasos
¿Por dónde                                            ← text-display, alineado a la izquierda,
tiramos hoy?                                             máx. 2 líneas
```
- Las acciones secundarias («Empezar de nuevo», ajustes) van como **icono de 24 px arriba a la derecha** o como texto `text-meta` subrayable. Nunca como pastilla grande que compita con el título.
- Pantallas de la barra inferior (Biblioteca, Descubrir, Decidir, Comparar, Perfil): sin flecha de volver. Pantallas secundarias: flecha a la izquierda y título `text-title`.

### 5.2 Botones
| Tipo | Aspecto | Cuándo |
|---|---|---|
| Principal | relleno `accent`, texto `accent-ink`, 48 px, `rounded-2xl` | **uno por pantalla como mucho** |
| Secundario | `surface2` con borde `line`, texto `ink` | acciones normales |
| Texto | sin fondo, `text-meta` o `text-body` en `ink`, subrayado al pulsar | acciones menores (Saltar, Empezar de nuevo, Ver todo) |

Las pastillas redondas (`rounded-full`) quedan **solo** para chips de filtro y selección.

### 5.3 Tarjetas y listas
- Tarjeta: `surface`, `rounded-2xl`, sin sombra, padding 16.
- Listas: `Group` y `Row` (`components/Group.tsx`), filas de 56 px con separador `line`. **Nada de tarjetas dentro de tarjetas.**
- Póster: `rounded-[10px]`, proporción 2:3 siempre, sin borde ni sombra. Título debajo (`text-item`) y metadatos (`text-meta`) a 8 px.

### 5.4 Hojas (`Sheet`)
Fondo `surface`, esquinas superiores de 24 px y el asa arriba. Título `text-title` a la izquierda. Es lo único que lleva sombra.

### 5.5 Duelos (Comparar, Decidir y colocar una obra)
- La pregunta va en la cabecera §5.1 (`text-display`), **no en un cristal en el centro**. En el centro queda solo una «o» pequeña en serif, sobre un círculo `bg` con borde `line`.
- La banda «DESLIZA» con flechas se cambia por una pista `text-meta` bajo los pósteres: «Desliza hacia la que prefieras».
- La confirmación al elegir (texto grande y ✓ pequeño en el centro) se mantiene, sobre una tarjeta `bg` opaca al 85 %, sin desenfoque ni anillo.

### 5.6 Iconos
Un solo juego (`components/Icon.tsx`), trazo de 1,75 px. Tamaños 20 px en listas y 24 px en cabecera y barra inferior. No se usan emojis en la interfaz.

### 5.7 Movimiento
- Muelles suaves (`stiffness ~300, damping ~30`). Duraciones de 150 a 250 ms en interfaz y hasta 400 ms en transiciones grandes.
- Nada de rebotes exagerados ni de `pop` en todo. Se respeta `prefers-reduced-motion`.

## 6. Prohibiciones (para revisar cada pantalla)
- [ ] `backdrop-blur`, `ring-white/…`, `shadow-[…glow…]`, degradados decorativos.
- [ ] Más de 2 familias, más de 2 pesos o tamaños fuera de la escala §2.
- [ ] Más de un elemento en ámbar.
- [ ] Texto encima del póster fuera de una franja oscurecida.
- [ ] Tarjetas dentro de tarjetas.
- [ ] Márgenes laterales distintos de 20 px.
- [ ] Emojis en la interfaz (sí se permiten en el contenido del usuario).
- [ ] `text-[Npx]` o `mt-[Npx]` sueltos: solo tokens.

## 7. Orden de aplicación
1. **Base:** tokens de tipografía y espacio en `index.css`, Inter, y los componentes `ScreenTitle`, botones (`Button` con variantes) y `PosterCard` en `components/`.
2. **Decidir** (`WhatToWatch.tsx`) y **los duelos** (`SwipePair.tsx`, `DuelVariants.tsx`, `Compare.tsx`, `PlaceFlow.tsx`): la pantalla de referencia de la propuesta A.
3. **Descubrir** (`Discover.tsx`, `SwipeDeck.tsx`).
4. **Biblioteca** y **estantería** (`Library.tsx`, `Shelf.tsx`, `ItemRow.tsx`).
5. **Ficha** (`ItemDetail.tsx`) y hojas (`RatingFlow`, `AddFlow`).
6. **Perfil**, **Editar perfil**, **Ajustes** y **Conectar**.
7. **Bienvenida** (`Onboarding.tsx`) y páginas públicas (`Public.tsx`, `JoinInvite.tsx`).

Cada paso, en su propio commit, sin cambiar la lógica, y con `tsc` sin errores. La revisión visual la hace Igor en el móvil.
