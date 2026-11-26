# MEDIDAS NATIVA 2: flujos y pantallas de las fases 2 a 4

> Fuente: `app/src/components` y `app/src/screens` de la PWA (`biblioteca-app`, rama `main`). Medidas extraídas directamente del código TSX; **sin navegador, capturas ni revisiones visuales**.
> Cada dato numérico lleva `archivo:línea`. Lo condicional va marcado como **(condicional)** y lo que el código no fija en dimensiones como **(no fijado)**. Sin clases `hover:`.
> Las medidas de Tailwind siguen 1 unidad = 4 px (`p-4` = 16, `gap-3` = 12, `h-12` = 48, `w-9` = 36). Las medidas entre corchetes son px literales (`min-h-[50px]` = 50).

---

# 1. Flujos de la fase 2

## AddFlow (`app/src/components/AddFlow.tsx`)

**Contenedor y cabecera**
- Capa modal: `Portal`, contenedor a pantalla completa `absolute inset-0 z-40 bg-bg flex flex-col`. `AddFlow.tsx:316-317`.
- Barra superior: `safe-top`, `px-3` (12), `pb-2` (8), `flex items-center gap-1` (4), `shrink-0`. `AddFlow.tsx:318`.
- Botón cerrar: `w-11 h-11` (44 × 44), `flex items-center justify-center rounded-full active:bg-surface2`. Icono `x` de 20. `AddFlow.tsx:319-321`.
- Título cabecera: `text-xl font-semibold flex-1`. Literal: `shelf ? 'Añadir a ' + SHELF_LABEL[shelf].plural : 'Añadir a mano'`. `AddFlow.tsx:322`.

**Selector inicial de estantería (sin `shelf` inicial)** `AddFlow.tsx:325-354` **(condicional)**
- Contenedor: `px-5` (20), `pt-2` (8), `space-y-3` (12). `AddFlow.tsx:326`.
- Tarjeta de acceso a importar listas externas: `w-full p-4` (16), `rounded-3xl` (24), `bg-accent/10`, borde `border border-accent/40`, `text-left flex items-center gap-3.5` (14), pulsado `active:scale-[0.99] transition-transform`. `AddFlow.tsx:327-333`.
  - Icono chispa: caja `w-10 h-10` (40 × 40), `rounded-2xl` (16), fondo `bg-accent text-accent-ink`, icono `sparkle` de 20. `AddFlow.tsx:334-336`.
  - Textos: título `font-semibold text-sm text-ink` «Importar listas externas»; subtítulo `text-xs text-mute` «Letterboxd, IMDb, Goodreads o Netflix con tutoriales». `AddFlow.tsx:338-339`.
  - Chevrón: icono `chevron` de 16, color `text-accent`, `shrink-0`. `AddFlow.tsx:341`.
- Texto separador: `text-mute text-sm pt-1` (4) «O añade una a una por estantería:». `AddFlow.tsx:343`.
- Botones de estantería (`ACTIVE_SHELVES`): `w-full min-h-[64px] rounded-3xl bg-surface border border-line px-5` (20), `text-left text-lg font-semibold flex items-center justify-between`. Icono `chevron` de 18 `text-mute`. Textos: plural de cada estantería («Películas», «Series», «Libros», «Juegos de mesa», «Música»). `AddFlow.tsx:344-353`.

**Buscador y campo de entrada (con `shelf` definido)** `AddFlow.tsx:357-367`
- Fila de búsqueda: `px-4` (16), `pb-2` (8), `relative shrink-0`. `AddFlow.tsx:357`.
- Icono lupa: `Icon name="search"` de 18, `absolute left-7 top-1/2 -translate-y-[60%] text-mute` (28 de margen izquierdo). `AddFlow.tsx:358`.
- Campo de texto: `w-full bg-surface border border-line rounded-2xl` (16), `pl-10` (40), `pr-4` (16), `min-h-[50px]`, `focus:outline-none focus:border-accent`. `AddFlow.tsx:359-366`.
- Placeholder literal: `'Buscar en ' + SHELF_LABEL[shelf].plural.toLowerCase() + '…'`. `AddFlow.tsx:363`.

**Lista de resultados locales** `AddFlow.tsx:368-423`
- Lista: `flex-1 min-h-0 scroll-y px-4` (16), `pb-6` (24), `space-y-2` (8). `AddFlow.tsx:368`.
- Fila de obra: contenedor `rounded-2xl` (16), `bg-surface/70 border border-line`. `AddFlow.tsx:373`.
- Botón principal de fila: `w-full flex items-center gap-3` (12), `p-2.5` (10), `text-left`. `AddFlow.tsx:374`.
- Portada: `w-11` (44), `h-[66px]` (o ratio dinámico para juegos de mesa vía `posterBox(it).style`), `rounded-lg` (8), `shrink-0 self-center`. `AddFlow.tsx:375`.
- Bloque de texto: `flex-1 min-w-0`. Título `serif font-semibold leading-tight line-clamp-2`; subtítulo `text-xs text-mute truncate mt-0` con `${it.year} · ${it.creator}`. `AddFlow.tsx:376-379`.
- Indicador de estado previo: icono de 18 `text-accent shrink-0`, `check` si es `seen`, `bookmark` si es `pending`. `AddFlow.tsx:380`. **(condicional)**.

**Fila desplegada (`open === it.id`)** `AddFlow.tsx:382-420` **(condicional)**
- Panel desplegado: `px-3` (12), `pb-3` (12), `pt-1` (4). `AddFlow.tsx:383`.
- Si ya tiene estado (`st`): `flex items-center gap-2` (8). Texto `flex-1 text-sm text-mute` con «Ya está en tu biblioteca», «Está en tus pendientes» o «La marcaste como «no me interesa»» (`STATUS_TXT`, `:20-24`). Botón «Abrir ficha»: `min-h-[44px] px-4` (16), `rounded-xl` (12), `bg-accent text-accent-ink font-semibold text-sm`. `AddFlow.tsx:384-396`.
- Si no tiene estado: fila con dos botones `flex gap-2` (8):
  - Botón visto: `flex-1 min-h-[46px] rounded-xl bg-accent text-accent-ink font-semibold text-sm`. Textos literales: «Lo he leído» (libro), «Lo he escuchado» (música), «Lo he jugado» (juegos de mesa), «La he visto» (películas/series). Al pulsar pasa a `RatingFlow`. `AddFlow.tsx:399-407`.
  - Botón pendiente: `flex-1 min-h-[46px] rounded-xl bg-surface2 border border-line font-semibold text-sm`. Texto literal: «Pendiente». Muestra toast «Guardada en pendientes ✓». `AddFlow.tsx:408-417`.

**Sección «Más en el catálogo» (catálogo vivo remoto)** `AddFlow.tsx:426-491` **(condicional)**
- Cabecera: `pt-4` (16), `pb-2` (8), fila con `px-2` (8), `mb-2` (8). Título `text-xs font-semibold uppercase tracking-wider text-mute` «Más en el catálogo». `AddFlow.tsx:428-431`.
- Estado cargando remoto: texto `text-xs text-mute/80 flex items-center gap-1.5` (6) «Buscando…» con espinner circular `w-2.5 h-2.5` (10 × 10), `border-2 border-accent border-t-transparent rounded-full animate-spin`. `AddFlow.tsx:432-437`.
- Esqueleto de carga (3 filas si no hay resultados aún): contenedor `rounded-2xl bg-surface/50 border border-line/60 flex items-center gap-3 p-2.5`; póster esqueleto `w-11 h-[66px] rounded-lg shrink-0`; barras de texto `h-4 w-2/3` y `h-3 w-1/3` con separación vertical `space-y-2` (8). `AddFlow.tsx:440-449`.
- Fila remota: `rounded-2xl bg-surface/50 border border-line/60`. Botón `w-full flex items-center gap-3 p-2.5 text-left disabled:opacity-60`. Imagen `w-11 h-[66px] rounded-lg object-cover` o placeholder `bg-surface2/80 text-mute` con icono `search` de 16. Pastilla «Añadir»: `text-xs text-accent font-semibold px-2 py-1 bg-accent/10 rounded-lg shrink-0` (o espinner `w-5 h-5` [20 × 20] si está resolviendo). `AddFlow.tsx:450-488`.

**Estados vacío y error** `AddFlow.tsx:493-517` **(condicional)**
- Error de catálogo remoto (`searchError`): `py-12` (48), `px-4` (16), `space-y-3` (12), `text-center text-mute`. Icono en burbuja `w-10 h-10 rounded-full bg-surface2 border border-line` con icono `search` de 20. Título `text-sm font-semibold text-ink` «No he podido conectar con el catálogo»; descripción `text-xs text-mute max-w-xs mx-auto` «Comprueba tu conexión a internet o vuelve a intentarlo.»; botón «Reintentar» `px-4 py-2 rounded-xl bg-surface border border-line text-xs font-semibold text-accent active:scale-95 transition-transform`. `AddFlow.tsx:494-507`.
- Vacío sin resultados: `py-12` (48), icono en burbuja `w-10 h-10 rounded-full bg-surface2 border border-line mb-2` con icono `search` de 20. Texto literal `text-center text-mute`: «No está en nuestro catálogo todavía». `AddFlow.tsx:509-516`.

**Encadenamiento de flujos:** Si se marca como vista, pasa a `RatingFlow` (`AddFlow.tsx:312-313`); tras valorar pasa a duelos de colocación `PlaceFlow` (`AddFlow.tsx:311`).

---

## RatingFlow (`app/src/components/RatingFlow.tsx`)

- Hoja inferior `Sheet`: altura `46%` si tiene estrellas (`withStars`), o `36%` si solo es comentario. Etiqueta de hoja: «Valorar». `RatingFlow.tsx:45`.
- Fila superior de obra: `flex gap-3` (12), `items-center`. `RatingFlow.tsx:46`.
  - Portada: `w-14` (56), altura y ratio según `posterBox(item)`, radio `posterRadius(item.type, 8)` (8 px), `rounded-[8px] shrink-0 object-cover`. `RatingFlow.tsx:47`.
  - Textos: etiqueta superior `text-label text-mute uppercase` con `label.actionPast` («VISTA», «LEÍDO», «ESCUCHADO», «JUGADO»). Título `serif text-title font-medium text-ink leading-tight line-clamp-2 mt-0.5` (2). `RatingFlow.tsx:49-50`.
- Selector de estrellas (`StarRating`): contenedor centrado `flex justify-center mt-3` (12). `RatingFlow.tsx:53-57`. **(condicional)** `stars0`.
- Área de texto para comentario: `mt-3` (12), `w-full bg-surface2 border border-line rounded-2xl` (16), `px-4 py-3` (16 × 12), `text-body` (15 px), `rows={2}`, `resize-none`, `placeholder:text-mute/70`, `focus:outline-none focus:border-accent`. Placeholder literal: «¿Qué significó para ti? (opcional)». `RatingFlow.tsx:58-64`.
- Casilla «No preguntar más»: `flex items-center gap-3 mt-2 min-h-[40px] text-meta text-mute`. Casilla `input[type=checkbox]` `w-5 h-5` (20 × 20) con `accent-[#F5B544]`. Texto literal: «No preguntar más al guardar (se reactiva en Perfil)». `RatingFlow.tsx:65-70`. **(condicional)** `stars0`.
- Botón guardar: contenedor `mt-3` (12). Botón `Button` primaria `w-full` (48 px de alto, `rounded-2xl` 16, texto 15 px). Texto literal: «Guardar». `RatingFlow.tsx:71-75`.
- Texto de ayuda inferior: `text-center text-meta text-mute mt-2` (8). Texto literal: «Desliza hacia abajo para cerrar: se guarda lo que haya». `RatingFlow.tsx:76`.
- Toast resultante al guardar: «Guardada ✓» (con feedback háptico `success`). `RatingFlow.tsx:40-41`.

**CommentSheet (variante en Comparar)** `RatingFlow.tsx:81-117`
- Hoja inferior `Sheet`: altura `34%`, etiqueta «Comentario». `RatingFlow.tsx:97`.
- Título: `serif text-title font-medium text-ink leading-tight` «¿Algo que decir de [Título]?». `RatingFlow.tsx:98`.
- Textarea: `mt-3`, `w-full bg-surface2 border border-line rounded-2xl px-4 py-3 text-body rows={2}`, placeholder «Tu comentario (opcional)». `RatingFlow.tsx:99-105`.
- Casilla: `flex items-center gap-3 mt-3 min-h-[44px] text-meta text-mute`, casilla 20 × 20, texto «No preguntar más». `RatingFlow.tsx:106-109`.
- Botón guardar: contenedor `mt-2` (8), `Button` primaria `w-full` con texto «Guardar». `RatingFlow.tsx:110-114`.

---

## CleanupFlow (`app/src/components/CleanupFlow.tsx`)

**Estructura y cabecera**
- Pantalla completa: `fixed inset-0 z-50 bg-bg flex flex-col`. `CleanupFlow.tsx:188`.
- Cabecera: `safe-top px-4` (16), `pb-2` (8), `pt-2` (8), `shrink-0 flex items-center justify-between border-b border-line/40`. `CleanupFlow.tsx:190`.
- Botón salir: `w-10 h-10` (40 × 40), `rounded-full bg-surface flex items-center justify-center text-mute active:scale-95 transition-transform`, icono `x` de 20. `CleanupFlow.tsx:192-198`.
- Título: `font-semibold text-base font-serif` «Limpieza de pendientes»; subtítulo `text-xs text-mute` con el plural de la estantería. `CleanupFlow.tsx:200-201`.
- Contador derecho: `text-xs text-mute tabular-nums`. Literal: `pendingItems.length > 0 ? '${pendingItems.length} restantes' : 'Completado'`. `CleanupFlow.tsx:205-207`.

**Mazo de tarjetas** `CleanupFlow.tsx:241-269`
- Contenedor de mazo: `flex-1 min-h-0 px-4 pt-3 relative`. `CleanupFlow.tsx:242`.
- Componente `SwipeDeck` con sellos:
  - Derecha (`right`): `label.stamp` («¡VISTA!», «¡LEÍDO!», etc.). Pasa a `seen`, cuenta `seen + 1`, abre `RatingFlow` si `rateOnSwipe !== false` o muestra toast `${label.actionPast} ✓`. `CleanupFlow.tsx:93-108`, `:251`.
  - Arriba (`up`): `'LA GUARDO'`. Mantiene en `pending` actualizando `reviewedAt`, cuenta `kept + 1`, toast «Sigue guardada». `CleanupFlow.tsx:109-125`, `:253`.
  - Izquierda (`left`): `'FUERA'`. Pasa a `dismissed`, cuenta `dismissed + 1`, toast «Descartada». `CleanupFlow.tsx:125-147`, `:252`.

**Barra de acciones inferior** `CleanupFlow.tsx:271-308`
- Contenedor de botones: `shrink-0 px-4` (16), `pt-2` (8), `pb-6` (24), `flex items-center justify-center gap-5` (20). `CleanupFlow.tsx:272`.
- Botón Deshacer: `w-11 h-11` (44 × 44), `rounded-full bg-surface flex items-center justify-center text-mute disabled:opacity-25 active:scale-90 transition-transform`. Icono `undo` de 20. Deshabilitado si no hay historial (`history.length === 0`). `CleanupFlow.tsx:273-280`.
- Botón Descartar (izquierda): `w-14 h-14` (56 × 56), `rounded-full bg-surface border-2 border-line text-stamp-red flex items-center justify-center active:scale-90 transition-transform`. Icono `x` de 26, `strokeWidth={2.6}`. `CleanupFlow.tsx:282-288`.
- Botón Guardar (arriba): `w-12 h-12` (48 × 48), `rounded-full bg-surface border-2 border-line text-stamp-blue flex items-center justify-center active:scale-90 transition-transform`. Icono `bookmark` de 22, `strokeWidth={2.4}`. `CleanupFlow.tsx:290-296`.
- Botón Vista (derecha): `w-14 h-14` (56 × 56), `rounded-full bg-surface border-2 border-line text-stamp-green flex items-center justify-center active:scale-90 transition-transform`. Icono `check` de 26, `strokeWidth={2.8}`. `CleanupFlow.tsx:298-304`.
- Separador compensatorio derecho: `w-11` (44). `CleanupFlow.tsx:306`.

**Pantalla de Resumen final (`showSummary === true`)** `CleanupFlow.tsx:211-239` **(condicional)**
- Contenedor: `flex-1 flex flex-col items-center justify-center p-6` (24), `text-center gap-5` (20). `CleanupFlow.tsx:212`.
- Emoji: `text-5xl` (48 px) «✨». `CleanupFlow.tsx:213`.
- Título: `serif text-3xl font-semibold` «Limpieza completada». `CleanupFlow.tsx:214`.
- Subtítulo: `text-mute text-sm` «Has repasado tus pendientes de [estantería].». `CleanupFlow.tsx:215`.
- Rejilla de métricas: `grid grid-cols-3 gap-3 w-full max-w-sm mt-2` (12). Cada tarjeta `rounded-2xl bg-surface border border-line p-3 text-center`.
  - Vistas: número `serif text-2xl font-bold text-stamp-green tabular-nums`, etiqueta `text-xs text-mute mt-1` (`label.seen`). `CleanupFlow.tsx:218-221`.
  - Guardadas: número `serif text-2xl font-bold text-stamp-blue tabular-nums`, etiqueta `text-xs text-mute mt-1` «Siguen». `CleanupFlow.tsx:222-225`.
  - Descartadas: número `serif text-2xl font-bold text-stamp-red tabular-nums`, etiqueta `text-xs text-mute mt-1` «Fuera». `CleanupFlow.tsx:226-229`.
- Botón volver: `mt-6` (24), `w-full max-w-sm min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold flex items-center justify-center active:scale-95 transition-transform`. Texto literal: «Volver a Pendientes». `CleanupFlow.tsx:232-237`.

**Estado sin pendientes inicial:** `h-full flex flex-col items-center justify-center text-center px-6 gap-3`. Emoji `text-4xl` «🎉», título `serif text-xl font-semibold` «¡No quedan más pendientes!», botón «Volver a Pendientes» `mt-2 min-h-[46px] px-6 rounded-2xl bg-accent text-accent-ink font-semibold`. `CleanupFlow.tsx:257-266`.
- Toast: duración 1400 ms (`CleanupFlow.tsx:325`).

---

## PlaceFlow (`app/src/components/PlaceFlow.tsx`)

- Capa modal: `Portal`, pantalla completa `absolute inset-0 z-40 bg-bg flex flex-col`. `PlaceFlow.tsx:61-62`.
- Cabecera `ScreenTitle`:
  - Etiqueta: `'COLOCAR · ' + SHELF_LABEL[item.type].plural.toUpperCase()`. `PlaceFlow.tsx:64`.
  - Paso (`step`): `{ current: p.comparisons + 1, total: 3 }` (número tabular y barra de progreso calculada sobre 3). `PlaceFlow.tsx:65`.
  - Título: «¿Cuál te gustó más?». `PlaceFlow.tsx:66`.
  - Acción volver: botón atrás cierra el flujo `onDone()`. `PlaceFlow.tsx:67`.
- Contenedor del duelo: `flex-1 min-h-0 px-5` (20), `pb-6` (24), `flex flex-col`. `PlaceFlow.tsx:69`.
- Componente `SwipePair`:
  - `kind="rank"` (duelo rápido de ordenación, sin pausa larga). `PlaceFlow.tsx:74`.
  - Alternancia de lados: la obra nueva alterna arriba/abajo según `p.comparisons % 2 === 0` para evitar sesgo de posición. `PlaceFlow.tsx:44`, `:71-72`.
  - Lados (`Side`): título con `displayTitle`, subtítulo `${it.year} · ${it.creator}`, póster a sangre `Poster showTitle={false} className="absolute inset-0 w-full h-full"`. `PlaceFlow.tsx:13-16`.
- Al finalizar (2 a 4 comparaciones por búsqueda binaria): aplica ranking, actualiza `duels` en store y cierra con toast «Guardada ✓». Si hay menos de 2 obras en la estantería, termina inmediatamente. `PlaceFlow.tsx:32`, `:56`.

---

## PairCompare (`app/src/components/PairCompare.tsx`)

- Contenedor: `flex-1 min-h-0 flex flex-col gap-2` (8). `PairCompare.tsx:70`.
- Tarjeta de duelo (`PairCard`):
  - Caja: `relative flex-1 min-h-0 rounded-3xl` (24), `overflow-hidden border border-line bg-surface text-left touch-none-all`. `PairCompare.tsx:24`.
  - Gesto de arrastre: arrastre vertical `drag="y"`, restricciones `{ top: 0, bottom: 0 }`. Elasticidad orientada al centro: carta superior `{ top: 0.05, bottom: 0.6 }`, inferior `{ top: 0.6, bottom: 0.05 }`. `PairCompare.tsx:26-28`.
  - Resorte al soltar sin superar umbral: muelle `stiffness 420, damping 30` a `y: 0`. `PairCompare.tsx:33`.
  - Umbral de elección: arrastre hacia el centro > 60 px o velocidad vertical hacia el centro > 450 px/s. `PairCompare.tsx:31-32`.
  - Pista de arrastre interactiva (`hint`): `(v * toward) / 80` acotado de 0 a 1. Escala `scale` reactiva de 1 a 1.04. `PairCompare.tsx:18-19`.
  - Marco resaltado: capa animada `absolute inset-0 ring-4 ring-inset ring-accent rounded-3xl` con opacidad vinculada a `hint`. `PairCompare.tsx:42`.
  - Póster: `Poster item={item} showTitle={false} className="absolute inset-0 w-full h-full"`. `PairCompare.tsx:40`.
  - Degradado cinematográfico: `absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent`. `PairCompare.tsx:41`.
  - Bloque de información inferior: `absolute bottom-0 inset-x-0 p-4` (16).
    - Etiqueta tipo y año: `text-[11px] uppercase tracking-wider text-white/70` con `${typeName(item.type)} · ${item.year}`. `PairCompare.tsx:44`.
    - Título: `serif text-[22px] leading-tight font-semibold text-white mt-0.5 line-clamp-2`. `PairCompare.tsx:45`.
    - Creador y hechos: `text-xs text-white/70 mt-0.5 truncate` con `${item.creator} · ${itemFacts(item)}`. `PairCompare.tsx:46`.
  - Sello de ganadora: pastilla circular `absolute top-3 right-3` (12), `w-9 h-9` (36 × 36), `rounded-full bg-accent text-accent-ink flex items-center justify-center pop font-bold` con triángulo «▲». `PairCompare.tsx:48-50`. **(condicional)** `picked === 'win'`.
- Animación de resolución (`picked`): ganadora escala a 1.03; perdedora se atenúa a `opacity: 0.35, scale: 0.97`; duración 180 ms (`transition: { duration: 0.18 }`). Retardo de confirmación antes de cambiar de par: 340 ms (`CHOOSE_DELAY = 340`). `PairCompare.tsx:11`, `:37-38`, `:67`.
- Separador central: icono `scale` de 17 en pastilla circular `w-9 h-9` (36 × 36), `rounded-full bg-bg border border-line flex items-center justify-center text-xs font-bold text-mute`, superpuesto entre tarjetas con margen `-my-5` (-20) y `z-10 pointer-events-none`. `PairCompare.tsx:73-75`.

---

## SwipePair (`app/src/components/SwipePair.tsx`)

- Colores estándar de duelos: lado izquierdo `#F5B544` (`DUEL_LEFT`, ámbar de acento); lado derecho `#9A86FF` (`DUEL_RIGHT`, violeta contrastado). `SwipePair.tsx:18-19`.
- Contenedor: `relative flex-1 min-h-0 flex flex-col`. `SwipePair.tsx:42`.
- Integración de cartas en abanico: `<DuelFan ... fast={kind === 'rank'} square={isSquare} />`. `SwipePair.tsx:43`.
- Hueco intermedio (`extra`): elemento React condicional situado entre las cartas y la pista inferior (usado en Decidir para el botón «No conozco ninguna»). `SwipePair.tsx:34`, `:44`. **(condicional)**.
- Pista textual inferior: `text-center text-meta text-mute py-1.5 pointer-events-none select-none shrink-0` (6). Texto literal móvil: «← Desliza hacia la que prefieras →». `SwipePair.tsx:45-49`.
- Formato cuadrado (`square`): activo si se fuerza o si ambas obras tienen forma de portada cuadrada (`posterShape === 'square'`). `SwipePair.tsx:39`.

---

## NudgeCard (`app/src/components/NudgeCard.tsx`)

**Variante tarjeta destacada (`variant === 'card'`)** `NudgeCard.tsx:14-50`
- Contenedor: `w-full rounded-[28px]` (28), fondo degradado `bg-gradient-to-br from-surface to-surface2`, borde `border border-accent/40`, `p-6` (24), `flex flex-col justify-between shadow-2xl relative overflow-hidden`. `NudgeCard.tsx:20`.
- Animación de entrada/salida: `initial={{ opacity: 0, scale: 0.96 }}`, `animate={{ opacity: 1, scale: 1 }}`, `exit={{ opacity: 0, scale: 0.94 }}`. `NudgeCard.tsx:17-19`.
- Fila superior: `flex items-start justify-between`. `NudgeCard.tsx:22`.
  - Icono chispa: caja `w-10 h-10` (40 × 40), `rounded-2xl` (16), fondo `bg-accent/20 text-accent`, icono `sparkle` de 20. `NudgeCard.tsx:23-25`.
  - Botón cerrar: `w-9 h-9` (36 × 36), `rounded-full bg-white/5 flex items-center justify-center text-mute`, icono `x` de 16. `NudgeCard.tsx:26-35`.
- Cuerpo central: margen `my-6` (24). Título `serif text-2xl font-bold leading-snug text-ink mb-2` «Un recordatorio»; mensaje `text-mute text-base leading-relaxed` (`nudge.message`). `NudgeCard.tsx:38-41`.
- Botón de acción: `w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform`. Texto literal: `nudge.actionLabel`. `NudgeCard.tsx:43-48`.

**Variante cintillo / banner (`variant === 'banner'`, por defecto)** `NudgeCard.tsx:53-84`
- Contenedor: margen `mx-5 mb-3` (20 × 12), `p-3.5 pr-2` (14 × 8), `rounded-2xl` (16), `bg-surface border border-accent/35 flex items-start gap-3` (12), `shadow-lg relative overflow-hidden`. `NudgeCard.tsx:59`.
- Animación: `initial={{ opacity: 0, y: -12 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -12 }}`, transición duración 220 ms con curva `easeOut` (`transition={{ duration: 0.22, ease: 'easeOut' }}`). `NudgeCard.tsx:55-58`.
- Icono chispa: caja `w-9 h-9` (36 × 36), `rounded-xl` (12), `bg-accent/15 text-accent flex items-center justify-center shrink-0`, icono `sparkle` de 18. `NudgeCard.tsx:61-63`.
- Bloque de texto: `flex-1 min-w-0 pt-0.5` (2). Mensaje `text-[13px] text-ink/90 leading-snug` con `textWrap: pretty`. Botón de acción debajo: `mt-2.5` (10), `min-h-[40px] px-4` (16), `rounded-xl` (12), `bg-accent text-accent-ink text-[13px] font-semibold active:scale-95 transition-transform`. `NudgeCard.tsx:66-73`.
- Botón cerrar: `w-9 h-9` (36 × 36), margen `-mt-1` (-4), `rounded-full flex items-center justify-center text-mute active:scale-90 shrink-0`, icono `x` de 15. `NudgeCard.tsx:76-82`.

---

## Group (`app/src/components/Group.tsx`)

**Group (agrupación estilo lista de ajustes)** `Group.tsx:9-17`
- Contenedor de sección: `<section aria-label={title}>`. `Group.tsx:11`.
- Título superior: `label-caps text-mute px-1 mb-2` (4 × 8). **(condicional)**. `Group.tsx:12`.
- Tarjeta de grupo: `rounded-3xl` (24), `bg-surface border border-line divide-y divide-line/60 overflow-hidden`. `Group.tsx:13`.
- Pie de sección: `text-[11px] text-mute leading-relaxed px-1 mt-2` (4 × 8). **(condicional)**. `Group.tsx:14`.

**Row (fila de lista agrupada)** `Group.tsx:20-62`
- Fila: `w-full min-h-[56px] px-4 py-3` (16 × 12), `flex items-center gap-3` (12), `text-left`, interactiva con `active:bg-surface2 transition-colors` si tiene `to` o `onClick`. `Group.tsx:58-61`.
- Icono: caja `w-9 h-9` (36 × 36), `rounded-xl` (12), `flex items-center justify-center shrink-0`. Colores: si `danger` es `bg-stamp-red/15 text-stamp-red`; si tiene `tint` usa fondo con ese color y texto `#fff`; si no, fondo `bg-surface2 text-ink/80`. Icono interior de tamaño 18. `Group.tsx:43-49`. **(condicional)**.
- Bloque de texto central: `flex-1 min-w-0`. Título `text-sm font-semibold` (rojo si `danger`); subtítulo opcional `text-xs text-mute mt-0.5 leading-snug`. `Group.tsx:50-53`.
- Elemento derecho: componente libre `right` (p. ej. interruptor `Toggle` o valor textual). Si no hay `right` y la fila es navegable (`to` o `onClick`), muestra icono `chevron` de 16 `text-mute shrink-0`. `Group.tsx:54-55`.

**Toggle (interruptor deslizante)** `Group.tsx:64-76`
- Contenedor switch: `w-14 h-8` (56 × 32), `rounded-full p-1` (4), `transition-colors shrink-0`. Fondo: `bg-accent` si está activo, `bg-line` si está inactivo. `Group.tsx:71`.
- Pomo deslizante: `block w-6 h-6` (24 × 24), `rounded-full bg-white transition-transform`. Desplazamiento activo: `translate-x-6` (desplazamiento de 24 px). `Group.tsx:73`.

---

## FriendBubbles (`app/src/components/ui.tsx`)

- Contenedor: `flex flex-col items-end gap-1 relative`. `ui.tsx:201`.
- Fila de avatares: `flex items-center`. Hasta 4 avatares (`max = 4`). `ui.tsx:148`, `:202`.
- Avatar individual: tamaño 34 px (`size={34}`), borde exterior `ring-2 ring-black/70`. Separación horizontal: margen izquierdo de 2 px entre caras sucesivas (`marginLeft: i ? 2 : 0`), solapamiento por capa `zIndex: 10 - i`. `ui.tsx:210`, `:216`.
- Indicadores en esquinas del avatar:
  - Puesto en ranking (visto con puesto): `absolute -bottom-1 -right-1.5 min-w-[17px] h-[17px] px-[3px] rounded-full bg-accent text-accent-ink text-[10px] font-bold tabular-nums leading-none flex items-center justify-center ring-1 ring-black/60 z-10`. Texto: número de puesto `${rank.pos}`. `ui.tsx:219-222`.
  - Pendiente (sin puesto): `absolute -bottom-1 -right-1 bg-stamp-blue rounded-full w-[15px] h-[15px] flex items-center justify-center ring-1 ring-black/60 z-10`. Icono `bookmark` de 8, relleno blanco `strokeWidth={2.5}`. `ui.tsx:223-226`.
  - Comentario escrito: `absolute -top-1 -right-1 bg-[#161513] rounded-full w-[14px] h-[14px] ring-1 ring-black/70 flex items-center justify-center text-white z-20`. Icono `message` de 7, relleno blanco `strokeWidth={1}`. `ui.tsx:228-235`.
- Contador adicional: pastilla circular `w-[34px] h-[34px]` (34 × 34), margen izquierdo `ml-[2px]`, `rounded-full bg-black/70 ring-2 ring-black/70 text-xs font-semibold flex items-center justify-center`. Texto: `+${extra}`. `ui.tsx:239-241`. **(condicional)**.
- Etiqueta descriptiva inferior: `mt-2 text-[11px] text-white/85 bg-black/55 rounded-full px-2 py-[2px] backdrop-blur-sm`. Literales: «[Nombre] la ha visto» / «[Nombre] y N más la han visto» / «[Nombre] la tiene pendiente» (con sufijo «(ejemplo)» si es usuario sin cuenta). `ui.tsx:243-245`.
- Tooltip de detalle al mantener pulsada la cara (pulsación larga de 350 ms con háptico `tap`, `ui.tsx:188-192`):
  - Caja flotante: `absolute top-12 right-0 z-50 bg-[#181715] text-white border border-line rounded-2xl p-3` (12), `shadow-2xl min-w-[200px] max-w-[250px] text-left pointer-events-none`. `ui.tsx:251-254`.
  - Cabecera: `flex items-center gap-2.5 mb-2` (10 × 8). Avatar de 36 px. Nombre `font-semibold text-[13px] truncate`. Subtítulo `text-[11px] text-white/70` con `nº ${r.pos} de sus ${r.total} [obras]` (o texto pendiente en color azul `text-stamp-blue`). Insignia `RankBadge` al final `ml-auto shrink-0`. `ui.tsx:256-267`.
  - Cita del comentario: `italic text-white/90 serif text-[13px] leading-snug` entre comillas «[comentario hasta 120 caracteres]…». `ui.tsx:269-273`. **(condicional)**.

---

## AskFriend (`app/src/components/AskFriend.tsx`)

- Botón base: `mt-2.5 min-h-[44px] px-4 rounded-xl text-sm font-medium inline-flex items-center gap-2` (10 × 16). `AskFriend.tsx:17`.
- Variante WhatsApp: fondo `bg-[#1f3a2a] text-[#7de0a5]`, icono `whatsapp` de 17. Texto: «Pregúntale» (o «WhatsApp» si el menú está desplegado). Enlace a `https://wa.me/[tel]?text=[mensaje]`. `AskFriend.tsx:9`, `:18`, `:28`, `:35`.
- Variante Instagram: fondo `bg-[#3a1f33] text-[#f08fd0]`. Texto: «Pregúntale por Instagram» (o «Instagram» en menú). Al pulsar, copia el mensaje al portapapeles (notificación «Mensaje copiado, pégalo en el chat») y abre `https://ig.me/m/[usuario]`. `AskFriend.tsx:10`, `:13-15`, `:19`, `:29`, `:34`.
- Menú con ambos contactos: si tiene WhatsApp e Instagram, botón inicial `bg-surface2 text-ink` con icono `share` de 17 y texto «Pregúntale». Al pulsar se expande en fila `flex flex-wrap gap-2` (8) con los dos botones de cada red. `AskFriend.tsx:21-32`.

---

# 2. Fase 3: Cuenta, perfil y amigos

## Onboarding (`app/src/screens/Onboarding.tsx`)

**Cabecera común** `Onboarding.tsx:137-167`
- Barra superior: altura `h-14` (56), `flex items-center justify-between shrink-0`. `Onboarding.tsx:137`.
- Botón Atrás: `text-xs font-semibold text-mute flex items-center gap-1.5 min-h-[44px] px-2 active:opacity-60 transition-opacity`, icono `back` de 16, texto «Atrás». `Onboarding.tsx:139-144`. **(condicional)** `step > 0`.
- Indicadores de paso (6 pasos: 0 a 5): contenedor `flex items-center gap-1.5` (6). Cada pastilla: altura `h-1.5` (6), `rounded-full transition-all duration-300`. Activa: ancho `w-6` (24) `bg-accent`; completada previa: ancho `w-2` (8) `bg-accent/50`; pendiente: ancho `w-1.5` (6) `bg-line`. `Onboarding.tsx:150-158`.
- Botón Saltar: `text-xs font-semibold text-mute hover:text-ink px-2 min-h-[44px] transition-colors`, texto «Saltar». `Onboarding.tsx:161-165`.
- Transición entre pasos: contenedor animado con `initial={{ opacity: 0, y: 14 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -14 }}`, duración 220 ms con curva `[0.23, 1, 0.32, 1]`. `Onboarding.tsx:174-177`. Ancho máximo `max-w-sm` (384), centrado horizontal `w-full mx-auto`. `Onboarding.tsx:170`.

**Paso 0: Bienvenida y manifiesto** `Onboarding.tsx:183-249`
- Composición de portadas tridimensional: altura `h-44` (176), centrada.
  - Carta izquierda (*Pulp Fiction*): `w-24 h-36` (96 × 144), `rounded-2xl` (16), rotación `-10deg`, desplazamiento horizontal `x: -44`, `border border-white/10 z-10 shadow-2xl`. `Onboarding.tsx:188-193`.
  - Carta central (*El padrino*): `w-28 h-40` (112 × 160), `rounded-2xl` (16), `scale: 1, y: 0`, `border border-white/20 z-20 shadow-2xl`. `Onboarding.tsx:195-200`.
  - Carta derecha (*Breaking Bad*): `w-24 h-36` (96 × 144), `rounded-2xl` (16), rotación `10deg`, desplazamiento horizontal `x: 44`, `border border-white/10 z-10 shadow-2xl`. `Onboarding.tsx:202-207`.
- Textos:
  - Antetítulo: `text-accent text-[11px] font-bold tracking-[0.2em] uppercase` «BIBLIOTECA». `Onboarding.tsx:211-213`.
  - Título principal: `serif text-[32px] leading-[1.08] font-bold text-ink` «Lo que te ha formado, ordenado por ti.». `Onboarding.tsx:214-216`.
  - Subtítulo: `text-mute text-sm max-w-xs mx-auto leading-relaxed pt-1` «Películas, series, libros, música y juegos de mesa. En estanterías compartidas y sin notas numéricas vacías.». `Onboarding.tsx:217-219`.
- Rejilla de estanterías activas: `grid gap-2 pt-1 w-full`, columnas según `ACTIVE_SHELVES.length`. Cada celda: `flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl bg-surface border border-line`, icono de 19 `text-accent`, texto `text-[10px] font-medium text-mute tracking-tight truncate`. `Onboarding.tsx:223-235`.
- Botón: `w-full min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm tracking-wide active:scale-[0.98] transition-transform` con texto «Empezar tutorial». `Onboarding.tsx:238-246`.

**Paso 1: Práctica interactiva de 3 gestos** `Onboarding.tsx:254-406`
- Títulos: `serif text-[26px] leading-tight font-bold text-ink` «Descubre con tres gestos»; descripción `text-mute text-xs` «Desliza la tarjeta en cualquier dirección o pulsa los botones.». `Onboarding.tsx:256-263`.
- Tarjeta interactiva: contenedor `relative h-[290px] w-full max-w-[270px] mx-auto`.
  - Carta de fondo: `absolute inset-0 rounded-[24px] bg-surface2 border border-line scale-95 translate-y-3 opacity-60 pointer-events-none`. `Onboarding.tsx:268`.
  - Carta delantera arrastrable: `absolute inset-0 rounded-[24px] overflow-hidden bg-surface border border-line shadow-2xl shadow-black/70`. Rotación reactiva `rotate` de -14° a 14° según `x` [-200, 200]. Arrastre libre `drag` con elasticidad `dragElastic={0.9}`. Umbral de descarte: `Math.abs(ox) > 85` (horizontal) o `oy < -70` (hacia arriba). Si no supera umbral, muelle `stiffness 420, damping 28` a origen. `Onboarding.tsx:271-288`.
  - Póster: `Poster item={currentCard} showTitle={false} className="absolute inset-0 w-full h-full object-cover"`. `Onboarding.tsx:290`.
  - Degradados: inferior `h-2/3 bg-gradient-to-t from-black/95 via-black/60 to-transparent`; superior `h-16 bg-gradient-to-b from-black/40 to-transparent`. `Onboarding.tsx:293-294`.
  - Sellos de swipe (`Stamp`, borde 3 px, `rounded-xl`, `px-3 py-1`, texto 18 px font-bold):
    - Derecha: «LA HE VISTO», verde `border-emerald-400 text-emerald-400 bg-black/60`, posición `top-[24%] left-4 -rotate-12`, opacidad `x: [20, 100] -> [0, 1]`. Resplandor `bg-emerald-500/20`. `Onboarding.tsx:297-302`, `:317-320`.
    - Izquierda: «NO ME INTERESA», rojo `border-rose-500 text-rose-500 bg-black/60`, posición `top-[24%] right-4 rotate-12`, opacidad `x: [-20, -100] -> [0, 1]`. Resplandor `bg-rose-500/20`. `Onboarding.tsx:303-308`, `:321-324`.
    - Arriba: «PENDIENTE», azul `border-sky-400 text-sky-400 bg-black/60`, posición `top-[32%] left-1/2 -translate-x-1/2 -rotate-6`, opacidad `y: [-20, -90] -> [0, 1]`. Resplandor `bg-sky-500/20`. `Onboarding.tsx:309-314`, `:325-328`.
  - Información de tarjeta: `absolute bottom-0 inset-x-0 p-4 text-white`. Etiqueta `text-[10px] uppercase font-bold tracking-widest text-accent` con `${singular} · ${year}`; título `serif text-xl font-bold leading-tight mt-0.5 line-clamp-2`; autor `text-xs text-white/70 truncate mt-0.5`. `Onboarding.tsx:331-339`.
- Botones de ayuda directa: `grid grid-cols-3 gap-2 pt-1`. Cada botón: `py-2 px-1.5 rounded-2xl border flex flex-col items-center gap-1 active:scale-95`. Si ya se probó ese gesto: fondo coloreado al 15 % con su borde temático; si no, `bg-surface border-line text-mute`. Iconos: `x` de 14, `bookmark` de 13, `check` de 14. Textos: «No me interesa», «Guardar», «La he visto». `Onboarding.tsx:344-389`.
- Botón continuar: `w-full min-h-[50px] rounded-2xl font-bold text-sm shadow-md`. Si `allGesturesTried`: `bg-accent text-accent-ink active:scale-[0.98]`, texto «Continuar al ranking»; si faltan gestos: `bg-surface2 text-mute border border-line`, texto «Prueba los 3 gestos para continuar». `Onboarding.tsx:392-404`.

**Paso 2: Ranking A/B simulado (DuelFan)** `Onboarding.tsx:410-481`
- Título: `serif text-[28px] leading-tight font-bold text-ink` «Tu ranking sin poner notas»; descripción `text-mute text-xs leading-relaxed max-w-xs mx-auto` «Poner un 7 o un 8 no define tu gusto. Al comparar eliges entre dos y tu top se ordena solo.». `Onboarding.tsx:437-442`.
- Abanico interactivo: contenedor `relative h-[320px] w-full overflow-hidden my-1`. Integra `DuelFan` entre *El padrino* y *Pulp Fiction*. `Onboarding.tsx:446-456`.
- Pista textual: `text-xs text-mute font-medium py-1`. Si no hay ganador: «Desliza hacia la que prefieras o toca una carta»; si hay ganador: «¡Elegida! Has votado por [Título].». `Onboarding.tsx:458-462`.
- Botón continuar: `w-full min-h-[50px] rounded-2xl font-bold text-sm shadow-md`. Activo con ganador: `bg-accent text-accent-ink active:scale-[0.98]`, texto «Siguiente»; sin ganador: `bg-surface2 text-mute border border-line`, texto «Elige una para continuar». `Onboarding.tsx:464-478`.

**Paso 3: Amigos y afinidad** `Onboarding.tsx:484-536`
- Título: `serif text-[28px] leading-tight font-bold text-ink` «El criterio de tus amigos»; descripción `text-mute text-xs leading-relaxed max-w-xs mx-auto` «Sin algoritmos comerciales. Ves quién la ha visto, en qué puesto de su ranking la coloca y sus notas reales.». `Onboarding.tsx:489-494`.
- Tarjeta social de demostración: `w-full max-w-[270px] mx-auto rounded-3xl bg-surface border border-line p-4 shadow-xl text-left space-y-3`. `Onboarding.tsx:498`.
  - Fila superior: portada `w-12 h-16` (48 × 64), `rounded-xl overflow-hidden shrink-0 border border-line`. Título `text-xs font-bold text-ink truncate`; subtítulo `text-[11px] text-mute` «1972 · Coppola»; caras de amigos `Avatar` de tamaño 24 px (Carlos y Laura) con texto `text-[11px] text-mute font-medium` «La tienen en su top». `Onboarding.tsx:499-511`.
  - Comentario simulado: caja `bg-surface2 rounded-2xl p-3 border border-line text-xs space-y-1`. Fila con nombre «Carlos» `font-semibold text-ink` y puesto `text-accent font-bold` «Puesto #1». Cita `text-mute text-[11px] leading-snug` ««Una obra maestra absoluta de ritmo y fotografía.»». `Onboarding.tsx:514-522`.
- Botón continuar: `w-full min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm active:scale-[0.98] transition-transform` con texto «Siguiente». `Onboarding.tsx:526-534`.

**Paso 4: Elección de inicio de cuenta** `Onboarding.tsx:540-612`
- Título: `serif text-[28px] leading-tight font-bold text-ink` «¿Cómo quieres empezar?»; descripción `text-mute text-xs` «Elige cómo prefieres comenzar a guardar tus obras.». `Onboarding.tsx:545-550`.
- Opción 1 (Google): caja `bg-surface border border-line rounded-3xl p-4 space-y-2`. Botón `w-full min-h-[48px] rounded-2xl bg-white text-black text-sm font-semibold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform shadow` con logo oficial SVG de Google de 18 px y texto «Entrar con Google». Subtítulo `text-[11px] text-mute text-center px-1 leading-snug` «Sincroniza tus listas en la nube de forma segura para no perder tus datos.». `Onboarding.tsx:554-574`.
- Opción 2 (Importar): caja `bg-surface border border-line rounded-3xl p-4 space-y-2`. Botón `w-full min-h-[48px] rounded-2xl bg-surface2 border border-line text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-ink` con icono `sparkle` de 17 `text-accent` y texto «Importar mis listas existentes». Subtítulo `text-[11px] text-mute text-center px-1 leading-snug` «Trae tu historial de Letterboxd, IMDb, Goodreads o Netflix en segundos.». `Onboarding.tsx:577-592`.
- Opción 3 (Sin cuenta): caja `bg-surface/50 border border-line/60 rounded-3xl p-3.5 space-y-1.5`. Botón `w-full min-h-[44px] rounded-2xl bg-transparent text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform text-mute hover:text-ink` con icono `chevron` de 14 y texto «Explorar sin cuenta». Subtítulo `text-[11px] text-mute/80 text-center px-1 leading-snug` «Pruébala directamente en tu móvil sin iniciar sesión.». `Onboarding.tsx:595-610`.

**Paso 5: Selección de estanterías** `Onboarding.tsx:615-678`
- Título: `serif text-[28px] leading-tight font-bold text-ink` «¿Qué te interesa guardar?»; descripción `text-mute text-xs` «Elige qué estanterías quieres tener activas en tu biblioteca.». `Onboarding.tsx:619-625`.
- Lista de estanterías: `space-y-2` (8). Cada botón: `w-full min-h-[52px] rounded-2xl px-4 flex items-center justify-between border transition-all active:scale-[0.99]`.
  - Si está seleccionada: `bg-accent/10 border-accent text-ink font-semibold`; icono de 18 `text-accent`; casilla `w-5 h-5 rounded-full bg-accent border-accent text-accent-ink` con marca «✓». `Onboarding.tsx:640-659`.
  - Si no está seleccionada: `bg-surface border-line text-mute`; icono de 18 `text-mute`; casilla `w-5 h-5 rounded-full border-line text-transparent`. `Onboarding.tsx:642-659`.
- Botón entrar: `w-full min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm tracking-wide active:scale-[0.98] transition-transform` con texto «Entrar a mi biblioteca». `Onboarding.tsx:666-675`.

---

## Profile (`app/src/screens/Profile.tsx`)

**Cabecera y acciones superiores** `Profile.tsx:124-170`
- Cabecera `ScreenTitle`:
  - Etiqueta: «PERFIL». `Profile.tsx:125`.
  - Título: `unnamed ? 'Tu perfil' : profile.name`. `Profile.tsx:126`.
  - Subtítulo: combinación de `@${authProfile.handle}` y nombre del país (`countryName`). `Profile.tsx:127`.
  - Acción derecha: botón enlace a `/ajustes`, `min-h-[36px] pl-2.5 pr-3.5 rounded-full bg-surface border border-line text-ink text-[13px] font-medium flex items-center gap-1.5 active:scale-95 transition-transform`, icono `gear` de 17, texto «Ajustes». `Profile.tsx:129-131`.
- Fila de perfil: `flex items-center gap-4` (16).
  - Avatar: tamaño 72 px (`size={72}`). `Profile.tsx:139`.
  - Contadores: `flex-1 grid grid-cols-3 text-center`. Cada contador (`Counter`, `:305-312`): cifra `text-lg font-bold tabular-nums leading-none`, etiqueta `text-[11px] text-mute mt-1`. Métricas: `stats.seen` («vistas»), `stats.pending` («pendientes»), `realFriends.length` («amigos»). `Profile.tsx:140-144`.
- Botones de acción: `flex gap-2.5 mt-4` (10 × 16).
  - Botón secundario «Editar perfil»: `Button variant="secondary" className="flex-1"` (alto 48 px). Navega a `/perfil/editar`. `Profile.tsx:147-153`.
  - Botón secundario «Compartir»: `Button variant="secondary" className="flex-1"` con icono `share` de 16. Abre hoja inferior `shareOpen`. `Profile.tsx:154-161`.
- Aviso de perfil incompleto: enlace `mt-3 flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line text-meta text-mute hover:text-ink`. Icono `edit` de 16 `text-accent shrink-0`, chevrón de 16 `text-mute`. Texto: «Pon tu nombre para que tus amigos te reconozcan» (si falta nombre) o «Elige tu @usuario para que te encuentren». `Profile.tsx:163-169`. **(condicional)**.

**Sección «Lo que más me marcó» (Top 3 por estantería)** `Profile.tsx:173-208`
- Título: `text-title font-medium text-ink mb-3` (20 px). `Profile.tsx:174`.
- Por cada estantería activa con obras (`space-y-4`):
  - Fila de cabecera: `flex items-center justify-between mb-2`. Etiqueta `label-caps text-mute` con plural; enlace «Ranking completo» `text-xs text-accent font-semibold flex items-center gap-1` con icono `chevron` de 14. `Profile.tsx:179-184`.
  - Rejilla de 3 columnas: `grid grid-cols-3 gap-3` (12). `Profile.tsx:185`.
  - Tarjeta de obra: póster con ratio de su tipo (`posterBox(it)`), radio `posterRadius(it.type, 10)` (10 px), `rounded-[10px]`. Insignia numérica en esquina superior izquierda: `absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-accent text-accent-ink text-[11px] font-bold flex items-center justify-center tabular-nums` con puesto (1, 2 o 3). Título debajo: `serif text-item text-ink leading-tight mt-1.5 line-clamp-2`. `Profile.tsx:186-198`.
- Estado vacío (sin rankings): enlace a `/comparar`, `block text-body text-mute rounded-2xl border border-dashed border-line p-4` (16). Texto literal: «Cuando ordenes tus obras en ¡Duelos!, aquí saldrá tu top 3 de cada estantería.». `Profile.tsx:204-206`. **(condicional)**.

**Sección «Mis números»** `Profile.tsx:210-225`
- Título: `text-title font-medium text-ink mb-3`. Rejilla: `grid grid-cols-2 gap-2.5` (10).
- Tarjetas de estantería: enlace `bg-surface rounded-2xl border border-line p-3 active:bg-surface2`. Cifra `text-2xl font-semibold tabular-nums leading-none text-ink`; etiqueta `text-meta text-mute mt-1.5 truncate` con `${plural} ${seen}` (p. ej. «Películas vistas»). `Profile.tsx:214-219`.
- Tarjeta de género más frecuente: `bg-surface rounded-2xl border border-line p-3`. Texto `text-lg font-semibold leading-none truncate text-ink` (`stats.topGenre ?? '—'`); etiqueta `text-meta text-mute mt-1.5` «Tu género más frecuente». `Profile.tsx:220-224`.

**Sección «Amigos y afinidad»** `Profile.tsx:227-276`
- Fila de cabecera: `flex items-center justify-between mb-3`. Título `text-title font-medium text-ink`. Botón «Añadir»: `min-h-[36px] px-3.5 rounded-full bg-accent text-accent-ink text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform`, icono `plus` de 14. `Profile.tsx:229-239`. **(condicional)** `user`.
- Lista de amigos (`aff.length > 0`): `space-y-2.5` (10). Fila: `flex items-center gap-3 bg-surface rounded-2xl border border-line p-3` (12).
  - Avatar: tamaño 40 px (`size={40}`). `Profile.tsx:246`.
  - Nombre y afinidad: `flex-1 min-w-0`. Nombre `font-semibold text-sm` (añade «(ejemplo)» si no hay sesión iniciada). Barra de afinidad: `h-1.5 rounded-full bg-line mt-1.5 overflow-hidden`, relleno `h-full bg-accent rounded-full` con ancho porcentual `${a}%`. Si no hay obras en común: `text-xs text-mute` «Aún sin obras en común». `Profile.tsx:247-258`.
  - Cifra de afinidad derecha: `text-base font-bold tabular-nums text-accent` con `${a}%`. `Profile.tsx:259`. **(condicional)**.
- Estado vacío (sin amigos): tarjeta `bg-surface rounded-3xl border border-line p-5 text-center space-y-2.5`. Icono en caja `w-10 h-10 rounded-2xl bg-surface2 mx-auto flex items-center justify-center text-accent`, icono `user` de 20. Título `font-semibold text-sm` «Sin amigos conectados»; descripción `text-xs text-mute max-w-xs mx-auto leading-relaxed`. `Profile.tsx:264-274`. **(condicional)**.

**Hoja inferior «Compartir perfil» (`shareOpen`)** `Profile.tsx:280-297` **(condicional)**
- Hoja `Sheet`: etiqueta «Compartir perfil», altura `auto`. Título `serif text-lg font-bold mb-3` «Compartir tu perfil». `Profile.tsx:280-281`.
- Botón Enlace: `w-full min-h-[52px] rounded-2xl bg-surface2 border border-line px-4 flex items-center gap-3 text-sm font-semibold active:scale-[0.98] transition-transform`, icono `link` de 18, texto «Enviar enlace». `Profile.tsx:283-286`.
- Botón Tarjeta Story: `w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink px-4 flex items-center gap-3 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60`, icono `cards` de 18, texto `generatingCard ? 'Creando la tarjeta…' : 'Tarjeta para Story'`. `Profile.tsx:287-295`.

---

## EditProfile (`app/src/screens/EditProfile.tsx`) y AvatarCropper (`app/src/components/AvatarCropper.tsx`)

**EditProfile: Cabecera y botón Guardar**
- Cabecera `ScreenTitle`: etiqueta «PERFIL», título «Editar perfil», botón atrás `onBack={() => nav(-1)}`. `EditProfile.tsx:128-131`.
- Acción derecha: botón «Guardar» `text-meta font-medium text-accent hover:underline disabled:opacity-40`. Si está guardando muestra «Guardando…». `EditProfile.tsx:132-139`.

**Foto y selector de color** `EditProfile.tsx:145-174`
- Contenedor: `flex flex-col items-center gap-3 pt-1` (12 × 4).
- Avatar: tamaño 96 px (`size={96}`). `EditProfile.tsx:146`.
- Botones de acción de foto: `flex items-center gap-4 text-sm font-semibold` (16).
  - Botón cambiar/poner foto: `text-accent flex items-center gap-1.5 min-h-[40px]`, icono `camera` de 15. Texto: `uploadingAvatar ? 'Subiendo…' : profile.avatarUrl ? 'Cambiar foto' : 'Poner foto'`. `EditProfile.tsx:149-152`.
  - Botón quitar foto: `text-mute min-h-[40px]` «Quitar». `EditProfile.tsx:154-156`. **(condicional)** solo si hay `avatarUrl`.
- Selector de color de avatar (sin foto subida): `flex gap-2.5` (10), rol `radiogroup`. Cada botón de color (`AVATAR_COLORS`): `w-8 h-8 rounded-full border-2 transition-transform`. Si está seleccionado: `border-white scale-110`; si no: `border-transparent`. `EditProfile.tsx:159-173`. **(condicional)** `!profile.avatarUrl`.

**Campos de formulario (`Group title="Sobre ti"`)** `EditProfile.tsx:176-228`
- Estilo común de inputs (`fieldCls`): `w-full bg-surface2 border border-line rounded-xl px-3.5 min-h-[44px] text-sm focus:outline-none focus:border-accent`. `EditProfile.tsx:19-20`.
- Campo Nombre: etiqueta `text-xs font-semibold text-mute` «Nombre»; input con placeholder «Cómo te verán tus amigos», límite 40 caracteres (`maxLength={40}`). `EditProfile.tsx:177-180`.
- Campo @usuario (con sesión iniciada): etiqueta `text-xs font-semibold text-mute` «@usuario». Contenedor relativo con prefijo «@» a `left-3.5 top-1/2 -translate-y-1/2 text-mute text-sm`. Input con `pl-8` (32), placeholder «tu_usuario», límite 20 caracteres (`maxLength={20}`). Filtro en tecleo: minúsculas, números, punto y guion bajo (`/[^a-z0-9_.]/g`). Mensaje inferior: error en rojo `text-[11px] text-stamp-red` si falla disponibilidad; o ayuda `text-[11px] text-mute` «Con él te encuentran tus amigos y se forma el enlace de tu perfil.». `EditProfile.tsx:181-203`. **(condicional)** `user`.
- Campo País: etiqueta «País»; selector `<select>` con `appearance-none`, opciones de `COUNTRIES`. Texto inferior `text-[11px] text-mute` «Para enseñarte primero lo que se conoce en tu país, con sus títulos.». `EditProfile.tsx:204-214`.
- Campo Año de nacimiento: etiqueta «Año de nacimiento (opcional)»; input numérico con `inputMode="numeric"`, placeholder «1995», 4 dígitos. Si es inválido (`yearInvalid`, fuera de 1930 a año actual − 6): borde `border-stamp-red` y mensaje `text-[11px] text-stamp-red` «Pon un año entre 1930 y [año].»; si es válido: `text-[11px] text-mute` «No lo ve nadie. Si no lo pones, lo deducimos de lo que vas marcando.». `EditProfile.tsx:215-227`.

**Plataformas (`Group title="Tus plataformas"`)** `EditProfile.tsx:230-234`
- Pie de grupo: «Decidir solo te propone lo que puedes ver; en Descubrir no se filtra nada.». Contenedor con `p-4` (16) que integra `PlatformPicker`.

**AvatarCropper (`app/src/components/AvatarCropper.tsx`)**
- Capa modal: `Portal`, pantalla completa `absolute inset-0 z-50 bg-bg flex flex-col items-center justify-center px-6 gap-6` (24 × 24). Animación: `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`. `AvatarCropper.tsx:91-98`.
- Textos de título: `text-title text-ink` «Encuadra tu foto»; subtítulo `text-meta mt-1` «Muévela y acércala hasta que te guste». `AvatarCropper.tsx:100-101`.
- Visor de recorte interactivo:
  - Marco cuadrado: ancho y alto `VIEW + 60` (320 × 320 px, con `VIEW = 260`), `rounded-[20px]` (20), fondo `bg-black`, `touch-none-all cursor-grab active:cursor-grabbing`. `AvatarCropper.tsx:9`, `:104-106`.
  - Círculo de encuadre visible: `absolute rounded-full border-2 border-white/85`, posición `left: 30, top: 30`, diámetro 260 × 260 px (`VIEW`). Sombra perimetral para oscurecer el exterior: `boxShadow: '0 0 0 400px rgb(0 0 0 / 0.6)'`. `AvatarCropper.tsx:128-131`.
  - Imagen interior: arrastrable en 2D, con límite para no dejar bordes vacíos (`clamp`, `:39-44`). Zoom máximo 4x (`MAX_ZOOM = 4`). Gesto de pellizco con 2 dedos (`pinchStart`, `:55-66`). `AvatarCropper.tsx:113-125`.
- Control deslizante de zoom: fila centrada `w-full max-w-[300px] flex items-center gap-3 text-mute`. Iconos textuales «−» y «+». Deslizador `input[type=range]` de 1 a 4 con paso 0.01 (`step={0.01}`), clase `accent-[var(--color-accent)]`. `AvatarCropper.tsx:134-147`.
- Botones inferiores: contenedor `w-full max-w-[300px] flex gap-2.5` (10). Botón secundario «Cancelar» (`Button variant="secondary" className="flex-1"`); botón primario «Usar foto» (`Button variant="primary" className="flex-1"`, deshabilitado si la imagen aún no ha cargado). Genera WebP cuadrado de 512 × 512 px con compresión 0.88 (`OUT = 512`, calidad 0.88). `AvatarCropper.tsx:10`, `:86`, `:149-156`.

---

## Settings (`app/src/screens/Settings.tsx`)

**Cabecera y tarjeta de perfil/cuenta** `Settings.tsx:124-187`
- Cabecera `ScreenTitle`: etiqueta «AJUSTES», título «Ajustes», botón volver `onBack={() => nav(-1)}`. `Settings.tsx:124-128`.
- Tarjeta de usuario: `rounded-3xl bg-surface border border-line overflow-hidden`. Botón `w-full p-4 flex items-center gap-3.5 text-left active:bg-surface2 transition-colors`.
  - Avatar: tamaño 56 px (`size={56}`). `Settings.tsx:134`.
  - Textos: nombre `text-title text-ink truncate`; si tiene cuenta: indicador verde `w-1.5 h-1.5 rounded-full bg-stamp-green shrink-0` y texto `text-meta truncate mt-0.5` con `@${handle}` o email; si no tiene cuenta: `text-meta mt-0.5` «Sin cuenta · todo está solo en este móvil». Pie de tarjeta: `text-[12px] text-accent font-medium mt-1` «Editar foto, nombre y plataformas». Chevrón derecho de 16 `text-mute`. `Settings.tsx:135-147`.
- Acceso rápido sin cuenta (`!user`): contenedor inferior `px-4 pb-4 pt-3 space-y-2.5 border-t border-line`.
  - Texto: `text-meta` «Entra para guardarla en la nube, usarla en otro móvil y ver a tus amigos.». `Settings.tsx:151`.
  - Botón Google: `w-full min-h-[46px] rounded-2xl bg-white text-black text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform` con logo oficial SVG de 18 px y texto «Entrar con Google». `Settings.tsx:152-163`.
  - Acceso por enlace de email: fila `flex gap-2` (8). Input email `flex-1 min-w-0 bg-surface2 border border-line rounded-2xl px-3.5 text-xs focus:outline-none focus:border-accent`, placeholder «o tu email para un enlace». Botón «Enviar enlace» (o «Enviado»): `min-h-[42px] px-3.5 rounded-2xl bg-surface2 border border-line text-xs font-semibold text-accent disabled:opacity-50`. `Settings.tsx:164-185`.

**Grupos de configuración** `Settings.tsx:189-274`
- Grupo «Tus listas»: fila con icono `link`, tinte `#2f9e6e`, título «Conectar otras apps», subtítulo «Letterboxd, Goodreads, Netflix…», enlace a `/conectar`. `Settings.tsx:189-191`.
- Grupo «Preferencias»:
  - Valorar al marcar: icono `star`, tinte `#d9932b`, título «Valorar al marcar como vista», interruptor `Toggle`. `Settings.tsx:194-199`.
  - Comentario tras duelo: icono `message`, tinte `#7a64e0`, título «Nota tras cada duelo», interruptor `Toggle`. `Settings.tsx:200-205`.
  - Notificaciones: icono `bell`, tinte `#e0584b`, título «Notificaciones», subtítulo dinámico («Solo importantes», «Todas las notificaciones» o «Desactivadas»), interruptor `Toggle`. `Settings.tsx:206-212`.
  - Selector de frecuencia (si notificaciones activas): barra `px-4 py-2.5 bg-surface2/60 border-t border-line/60 flex items-center justify-between text-xs`. Etiqueta «Frecuencia de avisos»; selector de pastilla `flex bg-surface p-0.5 rounded-xl border border-line` con botones «Solo importantes» y «Todas» (`px-2.5 py-1 rounded-lg text-xs font-medium`). `Settings.tsx:213-247`. **(condicional)**.
- Grupo «Privacidad» (con sesión): contenedor `p-4` (16) que integra `PhoneDiscovery`. `Settings.tsx:250-256`. **(condicional)** `user`.
- Grupo «Ayuda»:
  - Fila tutorial: icono `cards`, tinte `#3d7fd9`, título «Ver el tutorial otra vez», navega a `/onboarding`. `Settings.tsx:259`.
  - Fila sugerencia/error: icono `mail`, tinte `#3d7fd9`, título «Enviar una sugerencia o un error», abre hoja de feedback. `Settings.tsx:260`.
- Grupo «Sesión» (con sesión):
  - Sincronizar: icono `rotateCcw`, título `syncing ? 'Sincronizando…' : 'Sincronizar ahora'`. `Settings.tsx:265-269`.
  - Cerrar sesión: icono `back`, título «Cerrar sesión». `Settings.tsx:270`.
  - Borrar cuenta: icono `trash`, título «Borrar mi cuenta», color de peligro `danger`. `Settings.tsx:271`.

*(Nota: el selector de duelos de juegos y la sección de listas aparcadas se omiten al no portarse a la app nativa, de acuerdo con `docs/PLAN_NATIVO.md` §4 y el encargo).*

**Pie informativo y zona de pruebas (plegada)** `Settings.tsx:306-333`
- Texto legal inferior: `text-[11px] text-mute leading-relaxed px-1` con «[APP_NAME] · Motor [VERSION]. Catálogo de fuentes públicas: Wikidata (CC0), Wikipedia, TVmaze (CC BY-SA), Open Library y MusicBrainz.». `Settings.tsx:306-308`.
- Cabecera desplegable «Zona de pruebas»: botón `w-full py-2 flex items-center justify-between text-xs text-mute font-semibold uppercase tracking-wider` con flecha indicadora «▲» / «▼». `Settings.tsx:311-318`.
- Contenedor plegado: `rounded-3xl bg-surface2/60 border border-line divide-y divide-line/60 overflow-hidden mt-1`. Filas:
  - Cargar ejemplos: icono `sparkle`, título «Cargar obras de ejemplo». `Settings.tsx:321-328`.
  - Métricas motor: icono `scale`, título «Métricas del motor», navega a `/metricas`. `Settings.tsx:329`.
  - Reiniciar: icono `trash`, título «Reiniciar (borra todo en este móvil)», peligro `danger`. `Settings.tsx:330`.

**Hojas y diálogos de confirmación**
- Diálogo Confirmación Reiniciar: título «¿Reiniciar toda la app?», texto «Se borrarán todas tus obras y rankings guardados en este dispositivo. Esta acción no se puede deshacer.», botón «Reiniciar». `Settings.tsx:337-349`.
- Diálogo Confirmación Borrar cuenta: título «¿Borrar tu cuenta definitivamente?», texto «Se eliminará tu perfil, todos tus guardados en la nube y tus listas. Es una acción irreversible.», botón «Borrar cuenta». `Settings.tsx:351-364`.
- Hoja de Feedback (`Sheet height="65%"`): etiqueta «Enviar sugerencia». Título `serif text-xl font-bold` «Dinos qué piensas»; subtítulo `text-xs text-mute` «¿Hay algo confuso, alguna obra que no encuentras o alguna mejora que eches de menos?». Textarea con `rows={4}`, `rounded-2xl p-3 text-sm focus:border-accent`. Input de contacto opcional con `rounded-xl p-3 text-xs`, placeholder «Tu email o WhatsApp (opcional, por si quieres respuesta)». Botón enviar `w-full min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50`, texto `sendingFeedback ? 'Enviando…' : 'Enviar sugerencia'`. `Settings.tsx:366-398`.

---

## JoinInvite (`app/src/screens/JoinInvite.tsx`)

**Contenedor y tarjeta central** `JoinInvite.tsx:87-173`
- Contenedor a pantalla completa: `h-full flex flex-col items-center justify-center p-6 bg-bg text-ink text-center`. `JoinInvite.tsx:87`.
- Tarjeta de invitación: `w-full max-w-sm bg-surface border border-line rounded-2xl p-6 shadow-xl space-y-5`. `JoinInvite.tsx:88`.
- Avatar del anfitrión: contenedor centrado `flex justify-center`, `Avatar` de tamaño 64 px (`size={64}`), color `#F5B544` por defecto o foto personalizada. `JoinInvite.tsx:89-91`.
- Bloque de títulos: título `text-title font-medium text-ink` «[Nombre] te invita a su biblioteca»; descripción `text-body text-mute mt-2` «Descubre qué pelis, series, libros y juegos le han marcado y comparte tus gustos.». `JoinInvite.tsx:93-98`.

**Estados de la invitación** `JoinInvite.tsx:100-172`
- Estado Cargando (`loading`): `py-4 text-meta text-mute` «Cargando invitación...». `JoinInvite.tsx:100-102`.
- Estado Error o Invalidez (`inviteStatus !== 'ok'`): contenedor `space-y-3 pt-2`. Mensaje `text-body text-ink/90 leading-relaxed` según el motivo:
  - Usada (`used`): «Esta invitación ya la ha usado otra persona. Pídele a quien te la mandó una nueva: cada enlace es para una sola persona.». `JoinInvite.tsx:14`.
  - Caducada (`expired`): «Esta invitación ha caducado. Pídele a quien te la mandó una nueva.». `JoinInvite.tsx:15`.
  - No encontrada (`missing`): «No encontramos esta invitación. Revisa que el enlace esté completo.». `JoinInvite.tsx:16`.
  - Botón: `Button variant="secondary" className="w-full"` con texto «Ir a la app». `JoinInvite.tsx:105-107`.
- Estado Con Cuenta (`user !== null`): contenedor `space-y-3 pt-2`.
  - Botón aceptar: `Button variant="primary" className="w-full"` con icono `check` de 18, texto `joining ? 'Conectando...' : 'Aceptar y conectar con ' + creatorName`. `JoinInvite.tsx:111-119`.
  - Botón cancelar: `Button variant="text" className="w-full"` con texto «Ir a mi biblioteca». `JoinInvite.tsx:120-126`.
- Estado Sin Cuenta (`user === null`): contenedor `space-y-4 pt-2`.
  - Texto: `text-xs text-mute/90` «Para ver sus recomendaciones reales, inicia sesión o crea tu cuenta en 1 clic:». `JoinInvite.tsx:130-132`.
  - Botón Google: `w-full min-h-[48px] rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-2 shadow active:scale-95 transition-transform` con logo oficial SVG de Google de 18 px y texto «Entrar con Google». `JoinInvite.tsx:134-140`.
  - Formulario email (enlace mágico): si enviado, caja `p-3 bg-surface2 border border-line rounded-xl text-xs text-accent` «Revisa tu email ([email]) y haz clic en el enlace para entrar.». Si no enviado: fila `flex gap-2` (8) con input email `flex-1 min-h-[44px] bg-surface2 border border-line rounded-xl px-3 text-sm focus:border-accent` y botón submit `min-h-[44px] px-3.5 bg-surface2 border border-line rounded-xl text-sm font-medium flex items-center justify-center` con icono `mail` de 16. `JoinInvite.tsx:142-163`.
  - Enlace de paso: `text-xs text-mute hover:underline pt-2 block mx-auto` «Continuar como invitado sin cuenta». `JoinInvite.tsx:165-170`.

---

## Public (`app/src/screens/Public.tsx`)

**Shell compartido (`PublicShell`)** `Public.tsx:19-31`
- Contenedor web pública: `min-h-full bg-bg text-ink`. Ancho máximo central `mx-auto max-w-[480px] min-h-screen px-5 pb-32 relative`. Padding superior `pt-[max(env(safe-area-inset-top),20px)]`. `Public.tsx:21-22`.
- Cabecera: `flex items-center justify-between mb-6` (24). Marca `text-label text-accent` («BIBLIOTECA»); enlace `text-meta text-mute hover:text-ink underline underline-offset-2` «Abrir la app». `Public.tsx:23-26`.

**Estado enlace roto (`Broken`)** `Public.tsx:33-45`
- Contenedor: `py-24 text-center text-mute space-y-3` (96 × 12).
- Icono en círculo: `w-12 h-12 rounded-full bg-surface border border-line flex items-center justify-center mx-auto text-mute`, icono `link` de 24. `Public.tsx:37-39`.
- Título: `text-title font-medium text-ink` «Este link no funciona». `Public.tsx:40`.
- Descripción: `text-body text-mute max-w-xs mx-auto` «Puede que esté cortado o incompleto. Pide que te lo vuelvan a enviar.». `Public.tsx:41`.

**PublicList (lista compartida)** `Public.tsx:47-144`
- Cabecera de autor: `flex items-center gap-3` (12). Avatar de tamaño 40 px (`size={40}`). Texto `text-meta text-mute` con «[Autor] te ha preparado esta lista». `Public.tsx:92-95`.
- Título y descripción: título `text-display font-medium text-ink mt-3` (`list.t`); descripción `text-body text-mute mt-2` (`list.d`). `Public.tsx:96-97`.
- Metadatos: `text-meta text-mute mt-3` con `${n} obra[s]` y mención opcional si hay descatalogadas. `Public.tsx:98`.
- Lista de obras: `mt-6 space-y-3` (24 × 12). Tarjeta: `flex gap-3.5 bg-surface rounded-2xl border border-line p-3.5` (14 × 14).
  - Portada: ancho `w-[84px]`, ratio según `posterBox(it)`, radio `posterRadius(it.type, 10)` (10 px), `rounded-[10px] shrink-0 self-center object-cover`. `Public.tsx:107`.
  - Información: `flex-1 min-w-0 flex flex-col`. Etiqueta `text-label text-mute` con `${typeName} · ${year}`; título `serif text-item font-medium text-ink leading-tight mt-0.5 line-clamp-2`; creador `text-meta text-mute mt-0.5`; nota personalizada opcional `serif italic text-body text-accent mt-1.5` ««[nota]»»; sinopsis `text-meta text-mute mt-1.5 line-clamp-2`. `Public.tsx:108-113`.
  - Enlace Spotify (música): `mt-1 text-meta text-accent hover:underline flex items-center gap-1.5 self-start`, icono `disc` de 13, texto «Abrir en Spotify». `Public.tsx:114-124`. **(condicional)**.
  - Botón individual: `mt-auto pt-2 self-start min-h-[36px] px-3 rounded-xl bg-surface2 border border-line text-meta font-medium flex items-center gap-1.5 disabled:text-stamp-green`. Icono `check` si ya está guardada o `bookmark` si no. Textos: «Ya en tu biblioteca» o «Guardar en mi biblioteca». `Public.tsx:125-130`.
- Barra fija inferior de guardado masivo: `fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-bg via-bg/95 to-transparent`. Botón primario `Button variant="primary" className="w-full"` (48 px de alto) con texto «Guardar toda la lista». `Public.tsx:136-140`.

**PublicProfile (perfil compartido)** `Public.tsx:146-200`
- Cabecera: `flex items-center gap-4` (16). Avatar de tamaño 56 px (`size={56}`). Título `text-display font-medium text-ink` (`data.n`); subtítulo `text-meta text-mute` «Lo que más le ha marcado». `Public.tsx:163-169`.
- Secciones por estantería: margen `mt-7` (28). Título `text-title font-medium text-ink mb-3`. Rejilla de 3 columnas `grid grid-cols-3 gap-3` (12). `Public.tsx:174-176`.
  - Tarjeta: póster con `posterBox(it)`, radio `posterRadius(it.type, 10)` (10 px), `rounded-[10px] border border-line`. Insignia numérica superior izquierda `absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-accent text-accent-ink text-[11px] font-bold flex items-center justify-center tabular-nums` (1, 2 o 3). Título `serif text-item font-medium text-ink leading-tight mt-1.5 line-clamp-2`. `Public.tsx:181-188`.
- Barra fija inferior: contenedor `fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-bg via-bg/95 to-transparent`. Botón enlace `w-full min-h-[48px] rounded-2xl bg-accent text-accent-ink font-medium text-base flex items-center justify-center` con texto «Crear mi biblioteca». `Public.tsx:194-198`.

---

## FindFriends (`app/src/components/FindFriends.tsx`)

**Estructura y cabecera**
- Hoja inferior `Sheet`: altura `82%` en pantalla de resultados (`step === 'results'`), o `58%` en pantalla introductoria (`step === 'intro'`). Etiqueta «Añadir amigos». Título `serif text-[24px] font-semibold` «Añadir amigos». `FindFriends.tsx:95-96`.

**Paso 1: Introducción (`step === 'intro'`)** `FindFriends.tsx:98-125`
- Párrafo explicativo: `text-[14px] text-mute leading-relaxed` «Cada invitación es para una persona: le llega un enlace personal y, al abrirlo, quedáis conectados y veis vuestra afinidad.». `FindFriends.tsx:100-102`.
- Tarjeta de agenda telefónica (`pickerAvailable`, en Android/Chrome): caja `rounded-2xl bg-surface2/70 border border-line p-4`. Título `font-semibold text-[15px]` «Buscar en tus contactos»; descripción `text-[13px] text-mute leading-relaxed mt-1` «Elige los contactos que quieras (puedes marcarlos todos). Sus números se comparan con los de quien ha decidido que le encuentren por teléfono y no se guardan.»; botón de selección `mt-3 w-full min-h-[48px] rounded-xl bg-accent text-accent-ink font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform` con icono `user` de 18 y texto «Elegir contactos». `FindFriends.tsx:104-114`. **(condicional)**.
- Botón de invitación individual estándar: `w-full min-h-[48px] rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`. Color: `bg-surface2 text-ink` si el selector está disponible, `bg-accent text-accent-ink` si no. Icono `share` de 18. Texto: `busy === 'share' ? 'Creando invitación…' : 'Invitar a alguien'`. `FindFriends.tsx:116-118`.
- Enlace inferior a ajustes: `text-xs text-accent font-medium` «Que tus amigos te encuentren por tu teléfono →». `FindFriends.tsx:123`.

**Paso 2: Buscando (`step === 'loading'`)** `FindFriends.tsx:127-136`
- Lista de 4 esqueletos (`space-y-3`): fila `flex items-center gap-3`, avatar esqueleto circular `w-10 h-10 rounded-full`, barra de texto `skeleton h-4 rounded flex-1`.

**Paso 3: Resultados (`step === 'results'`)** `FindFriends.tsx:138-152`
- Contenedor de lista desplazable: `mt-2 flex-1 min-h-0 scroll-y -mx-1 px-1`. `FindFriends.tsx:139`.
- Sección «Ya usan la app»: título `label-caps text-mute mt-2` con «Ya usan [APP_NAME] · ${onApp.length}». Lista dividida con líneas `divide-y divide-line`. `FindFriends.tsx:140-145`. **(condicional)**.
- Sección «Invitar»: título `label-caps text-mute mt-4` con «Invitar · ${others.length}». Si no hay otros: `text-sm text-mute mt-2` «Todos tus contactos elegidos ya están en [APP_NAME].». `FindFriends.tsx:146-149`.
- Fila de contacto (`row`, `:74-92`): `flex items-center gap-3 py-2.5` (12 × 10).
  - Avatar: tamaño 40 px (`size={40}`), color azul `#5B9CF5`. `FindFriends.tsx:78`.
  - Nombre y estado: `flex-1 min-w-0`. Nombre `text-[15px] font-medium truncate`; si ya está en la app: subtítulo `text-xs text-accent truncate` «En [APP_NAME] como [displayName]». `FindFriends.tsx:79-82`.
  - Botón de acción: `min-h-[40px] px-3.5 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform disabled:opacity-60`.
    - Si ya se envió invitación: `bg-surface2 text-mute`, icono `check` de 15, texto «Enviada». `FindFriends.tsx:86-88`.
    - Si ya está en la app (sin enviar): `bg-accent text-accent-ink`, icono `whatsapp` de 15, texto «Conectar». `FindFriends.tsx:86-88`.
    - Si no está en la app: `bg-surface2 text-ink`, icono `whatsapp` de 15, texto «Invitar». `FindFriends.tsx:86-88`.
- Botón reintentar selección: `mt-4 mb-2 text-sm text-accent font-medium` «Elegir otros contactos». `FindFriends.tsx:150`.

---

## PhoneDiscovery (`app/src/components/PhoneDiscovery.tsx`)

- Tarjeta contenedora: `rounded-3xl bg-surface border border-line p-4 space-y-3` (16 × 12). `PhoneDiscovery.tsx:30`.
- Textos informativos: título `font-semibold text-[15px]` «Que tus amigos te encuentren por tu teléfono»; descripción `text-[13px] text-mute leading-relaxed mt-1` «Si alguien que te tiene en su agenda busca amigos, le aparecerás para conectar. Tu número no se muestra a nadie y en el servidor solo queda una huella de la que no se puede sacar.». `PhoneDiscovery.tsx:31-36`.
- Estado Activado (`on === true`): fila `flex items-center justify-between gap-3`. Etiqueta verde/acento `text-sm text-accent font-medium` «Activado». Botón «Desactivar»: `min-h-[40px] px-3.5 rounded-xl bg-surface2 text-sm font-medium disabled:opacity-50`. `PhoneDiscovery.tsx:37-43`. **(condicional)**.
- Estado Desactivado (`on === false`): formulario en fila `flex gap-2` (8).
  - Campo de entrada telefónica: `type="tel" inputMode="tel" autoComplete="tel"`, `flex-1 min-w-0 min-h-[44px] bg-surface2 border border-line rounded-xl px-3 text-sm focus:outline-none focus:border-accent`. Placeholder literal: «Tu móvil (p. ej. 600 11 22 33)». `PhoneDiscovery.tsx:45-61`.
  - Botón activar: `min-h-[44px] px-4 rounded-xl bg-accent text-accent-ink text-sm font-semibold disabled:opacity-50`. Texto: `saving ? '…' : 'Activar'`. Deshabilitado si no hay texto o si está guardando. `PhoneDiscovery.tsx:62-64`.

---

# 3. Fase 4: Conectar e importar

## Connect (`app/src/screens/Connect.tsx`)

**Pantalla principal** `Connect.tsx:86-186`
- Contenedor: `h-full flex flex-col bg-bg text-ink scroll-y`. `Connect.tsx:86`.
- Cabecera `ScreenTitle`: etiqueta «CONECTAR», título «Conectar», botón volver atrás (o reseteo del flujo de importación si está en marcha). `Connect.tsx:87-91`.
- Descripción superior: `px-5 pb-16 pt-2 w-full max-w-md mx-auto space-y-7` (20 × 64 × 8), texto `text-sm text-mute leading-relaxed` «Trae lo que ya has visto, leído o escuchado desde tus plataformas de siempre. Sin notas numéricas vacías y sin pedirte nunca tu contraseña.». `Connect.tsx:96-99`.

**Grupo «Tus conexiones» (conexiones activas)** `Connect.tsx:101-127`
- Si Spotify está conectado (`spotifyConnected === true`): fila `min-h-[64px] px-4 py-3 flex items-center justify-between gap-3`. Logo de Spotify de 40 px (`size={40}`). Título `text-[15px] font-semibold text-ink leading-tight` «Spotify»; subtítulo `flex items-center gap-1.5 mt-0.5 text-xs text-mute` con punto verde `w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0` y texto «Conectada con tu cuenta». Botón derecho: `px-3 py-1.5 rounded-full text-xs font-medium text-mute hover:text-ink transition-colors active:scale-95` con texto «Desconectar». `Connect.tsx:102-121`.
- Si no hay cuentas conectadas: caja `px-4 py-4 text-xs text-mute leading-relaxed` «Aún no has conectado ninguna cuenta. Elige tu plataforma habitual para empezar.». `Connect.tsx:123-125`.

**Grupos de servicios (`GROUPS`: Cine y series, Libros, Música)** `Connect.tsx:129-184`
- Cada fila de servicio: `min-h-[68px] px-4 py-3 flex items-center justify-between gap-3 transition-colors`. `Connect.tsx:145-148`.
- Icono / Logo de marca (`BrandLogo`): tamaño 40 px (`size={40}`). `Connect.tsx:150`.
- Textos: título `text-[15px] font-semibold text-ink leading-tight truncate` (`s.name`); subtítulo `text-xs text-mute mt-0.5 leading-snug truncate` (`s.subtitle || s.blurb`). `Connect.tsx:151-158`.
- Botón de acción: `min-h-[34px] px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all active:scale-95`.
  - Acción activa («Conectar» o «Importar»): `bg-surface2 border border-line text-ink hover:border-accent shadow-sm`. `Connect.tsx:174`.
  - Acción próxima («Avísame» / «Anotado»): si no se ha pedido, `bg-transparent text-mute border border-line/60`; si ya se pidió, `bg-transparent text-accent font-medium border border-accent/40`. `Connect.tsx:170-173`.

**UsernameSheet (conectar por usuario público)** `Connect.tsx:224-299`
- Hoja `Sheet`: etiqueta `'Conectar ' + service.name`, altura `65%`. `Connect.tsx:258`.
- Cabecera: logo de 44 px (`BrandLogo size={44}`), título `serif text-xl font-semibold leading-tight text-ink`, subtítulo `text-xs text-mute mt-0.5` «Con tu usuario». `Connect.tsx:212-222`, `:259`.
- Descripción: `text-sm text-ink/80 leading-relaxed` (`service.blurb`). `Connect.tsx:260`.
- Campo de usuario: margen `mt-5` (20). Etiqueta `text-[11px] font-semibold uppercase tracking-wider text-mute` (`u.label`). Input: `mt-2 w-full min-h-[50px] rounded-2xl bg-surface2 border border-line px-4 text-sm text-ink placeholder:text-mute/60 outline-none focus:border-accent`. Texto de ayuda: `text-xs text-mute mt-2 leading-snug` (`u.hint`). `Connect.tsx:261-274`.
- Mensaje de error/estado: `text-sm mt-3`, rojo `text-stamp-red` si es error o texto normal si es aviso de disponibilidad próxima. `Connect.tsx:275-280`.
- Botón enviar: `mt-5 w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md`. Texto: `busy ? 'Buscando…' : 'Conectar'`. `Connect.tsx:281-287`.
- Botón alternativo a archivo: `mt-3 w-full py-2 text-xs font-medium text-mute hover:text-ink text-center transition-colors` «¿Prefieres subir el archivo completo? Toca aquí». `Connect.tsx:289-296`. **(condicional)**.

**FileSheet (subir archivo de exportación)** `Connect.tsx:301-375`
- Hoja `Sheet`: etiqueta `'Subir archivo de ' + service.name`, altura `70%`. Subtítulo cabecera: «Con tu archivo de exportación». `Connect.tsx:331-332`.
- Instrucciones de exportación: caja `mt-4 rounded-2xl bg-surface2 border border-line p-4 space-y-2.5`. Título `text-[11px] font-semibold uppercase tracking-wider text-mute` «Cómo descargarlo». Lista numerada `<ol>` con `list-decimal list-inside text-xs text-ink/80 space-y-1.5 leading-relaxed`. Enlace opcional a la web oficial con `text-xs font-semibold text-accent underline underline-offset-2`. `Connect.tsx:335-352`.
- Botón selector de archivo: etiqueta `<span>` interactiva `w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform shadow-md`. Texto: `reading ? 'Leyendo archivo…' : 'Elegir archivo descargado'`. Input `type="file"` oculto con extensiones permitidas (`f.extensions`). `Connect.tsx:354-370`.
- Mensaje de error: `text-xs text-stamp-red mt-3 text-center` (p. ej. «No hemos encontrado ninguna obra en ese archivo.»). `Connect.tsx:372`. **(condicional)**.

**OAuthSheet (conexión directa)** `Connect.tsx:377-411`
- Hoja `Sheet`: etiqueta `'Conectar ' + service.name`, altura `55%`. Subtítulo cabecera: «Conexión directa». `Connect.tsx:394-395`.
- Aviso de privacidad: caja `mt-4 p-4 rounded-2xl bg-surface2 border border-line text-xs text-mute space-y-1`. Textos literales: «Solo leemos lo que nos autorices: tus artistas y música guardada.» y «Puedes revocar el acceso en cualquier momento desde tu cuenta o desde aquí.». `Connect.tsx:397-400`.
- Botón continuar: `mt-6 w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-[0.98] transition-transform shadow-md disabled:opacity-50`. Texto: `starting ? 'Abriendo…' : 'Continuar a ' + service.name`. `Connect.tsx:401-408`.

---

## ConnectSpotify (`app/src/screens/ConnectSpotify.tsx`)

- Contenedor: `h-full flex flex-col bg-bg text-ink scroll-y`. Cabecera `ScreenHeader title="Spotify"` con botón volver a `/conectar`. `ConnectSpotify.tsx:38-39`.
- Estado Error (`error !== null`): `flex-1 flex flex-col items-center justify-center text-center p-8 gap-4` (32 × 16). Mensaje `text-sm text-mute max-w-xs leading-relaxed`. Botón `px-6 min-h-[48px] rounded-2xl bg-surface2 border border-line font-semibold` con texto «Volver a Conectar». Mensajes literales posibles: «Spotify estará disponible muy pronto.», «No has dado permiso a Spotify, así que no hemos traído nada.», «La conexión con Spotify ha caducado. Vuelve a intentarlo.», «No hemos encontrado artistas en tu cuenta de Spotify.», «No hemos podido leer tu cuenta de Spotify. Inténtalo de nuevo más tarde.». `ConnectSpotify.tsx:21-32`, `:40-46`.
- Estado Cargando inicial (`flow.step === 'idle'`): `flex-1 flex flex-col items-center justify-center text-center p-8 gap-4`. Espinner circular `w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin`. Texto `text-sm text-mute` «Trayendo tus artistas de Spotify…». `ConnectSpotify.tsx:47-52`.
- Estado Flujo activo: pasa el control a `<ImportFlowView flow={flow} />`. `ConnectSpotify.tsx:53`.

---

## Import (`app/src/screens/Import.tsx`) e ImportFlowView (`app/src/components/ImportFlowView.tsx`)

**Import (`app/src/screens/Import.tsx`)**
- Componente de redirección pura: `<Navigate to="/conectar" replace />`. `Import.tsx:5`.

**ImportFlowView (`app/src/components/ImportFlowView.tsx`)**
Flujo compartido en 3 fases:

1. **Fase emparejando (`step === 'matching'`)** `ImportFlowView.tsx:12-21`
   - Contenedor: `flex-1 flex flex-col items-center justify-center text-center p-8 gap-4` (32 × 16). `ImportFlowView.tsx:14`.
   - Espinner: `w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin`. `ImportFlowView.tsx:15`.
   - Título: `serif text-xl font-semibold` «Buscando tus obras…». `ImportFlowView.tsx:16`.
   - Progreso numérico: `text-sm text-mute` con `${progress.current} de ${progress.total}`. `ImportFlowView.tsx:17`. **(condicional)**.
   - Subtítulo explicativo: `text-xs text-mute max-w-xs leading-relaxed` «Las casamos con el catálogo (Wikidata, TVmaze, Open Library y MusicBrainz).». `ImportFlowView.tsx:18`.

2. **Fase de revisión (`step === 'review'`)** `ImportFlowView.tsx:23-79`
   - Contenedor: `flex-1 flex flex-col gap-6 p-5 max-w-md mx-auto w-full` (24 × 20). `ImportFlowView.tsx:25`.
   - Tarjeta de resultado: `rounded-3xl bg-surface border border-line p-5` (20).
     - Etiqueta: `label-caps text-mute` «Resultado». `ImportFlowView.tsx:27`.
     - Título: `serif text-3xl font-semibold mt-1` con `${sure.length} encontradas`. `ImportFlowView.tsx:28`.
     - Detalle: `text-xs text-mute mt-2` con `${doubtful.length} dudosas · ${notFound.length} sin encontrar`. `ImportFlowView.tsx:29-31`.
   - Sección de dudosas (`doubtful.length > 0`): `space-y-3` (12). Título `label-caps text-mute px-1` «Revisa las dudosas». Cada obra dudosa: caja `bg-surface border border-line rounded-2xl p-4 space-y-3` (16 × 12).
     - Título de fila: `text-sm font-semibold` con `${d.row.title}` y año opcional `text-mute font-normal`. `ImportFlowView.tsx:40-42`.
     - Botones de candidatos: `flex flex-wrap gap-2` (8). Cada candidato: `min-h-[40px] text-xs px-3 rounded-xl border text-left`. Si está elegido: `bg-accent text-accent-ink border-accent` con sufijo « ✓»; si no: `bg-surface2 border-line text-ink`. Muestra hasta 3 candidatos (`slice(0, 3)`). `ImportFlowView.tsx:43-55`.
     - Botón descartar candidato: `min-h-[40px] text-xs px-3 rounded-xl border`. Si está descartado: `bg-stamp-red/20 text-stamp-red border-stamp-red`; si no: `bg-surface2 border-line text-mute`. Texto «Ninguna». `ImportFlowView.tsx:56-61`.
   - Botón confirmar adición: contenedor fijo al fondo `mt-auto pt-2`. Botón `w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-[0.98] transition-transform`. Texto literal: `'Añadir ' + resolved + ' ' + (resolved === 1 ? 'obra' : 'obras')`. `ImportFlowView.tsx:69-76`.

3. **Fase completada (`step === 'done'`)** `ImportFlowView.tsx:81-98`
   - Contenedor: `flex-1 flex flex-col items-center justify-center text-center p-8 gap-5` (32 × 20). `ImportFlowView.tsx:83`.
   - Icono éxito: pastilla circular `w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center text-2xl font-bold` con «✓». `ImportFlowView.tsx:84`.
   - Título: `serif text-2xl font-semibold` «Hecho». `ImportFlowView.tsx:85`.
   - Resumen numérico: `text-sm text-mute max-w-xs leading-relaxed` con «Hemos añadido N obra[s] nueva[s] a tus estanterías [y puesto estrellas a N]. [Otras N ya estaban.]». `ImportFlowView.tsx:86-92`.
   - Botón finalizar: `mt-2 px-6 min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-95 transition-transform` con texto «Ir a mis estanterías». Navega a `/`. `ImportFlowView.tsx:93-95`.

---

## Metrics (`app/src/screens/Metrics.tsx`)

**Cabecera y filtros** `Metrics.tsx:63-126`
- Contenedor: `h-full flex flex-col bg-bg text-white overflow-y-auto`. `Metrics.tsx:63`.
- Cabecera: `safe-top px-4 pb-3 pt-2 shrink-0 border-b border-line flex items-center justify-between` (16 × 12 × 8).
  - Botón volver: `w-10 h-10 rounded-full bg-surface flex items-center justify-center text-mute active:scale-95 transition-transform`, icono `chevron` de 20 rotado 180°. Navega a `/perfil`. `Metrics.tsx:67-73`.
  - Títulos: `text-xl font-bold font-serif` «Métricas del motor»; subtítulo `text-xs text-mute` con `${events.length} eventos registrados`. `Metrics.tsx:75-76`.
  - Botones de acción: `flex gap-2` (8). Botón exportar `h-9 px-3 rounded-xl bg-accent text-accent-ink text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 active:scale-95 transition-transform`, icono `sparkle` de 14, texto «Exportar JSON». Botón borrar `h-9 w-9 rounded-xl bg-surface border border-line text-stamp-red flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform`, icono `trash` de 15. `Metrics.tsx:80-97`.
- Barra de filtros: `px-4 py-3 border-b border-line/60 space-y-2 bg-surface/50` (16 × 12 × 8).
  - Fila estantería: `flex items-center gap-2 overflow-x-auto no-scrollbar`. Etiqueta `text-xs text-mute shrink-0` «Estantería:»; pastillas `Chip` para «Todas» y cada estantería activa. `Metrics.tsx:102-112`.
  - Fila versión: `flex items-center gap-2 overflow-x-auto no-scrollbar`. Etiqueta `text-xs text-mute shrink-0` «Versión:»; pastillas `Chip` para «Todas» y cada versión del motor. `Metrics.tsx:114-124`.

**Tarjetas de KPIs (`KpiCard`, `:267-275`)**
- Caja: `rounded-2xl bg-surface border border-line p-3` (12). Etiqueta `text-xs text-mute`; valor `serif text-xl font-bold text-white tabular-nums mt-0.5` (2); descripción `text-[10px] text-mute/80 mt-0.5 truncate`.

**Secciones de métricas** `Metrics.tsx:128-250`
1. **Descubrir (Mazo)** `Metrics.tsx:130-165`:
   - Cabecera: `serif text-lg font-semibold text-accent` «Descubrir (Mazo)» con contador de swipes. `Metrics.tsx:132-133`.
   - Rejilla 2 columnas `grid grid-cols-2 gap-2`: «Acierto primeras 20», «AUC de R», «Tasa de guardado», «Tasa de descarte», «Ritmo medio». `Metrics.tsx:136-142`.
   - Rendimiento por cupo: caja `rounded-2xl bg-surface border border-line p-3 space-y-2`. Título `text-xs font-semibold uppercase text-mute` «Rendimiento por cupo». Fila por cada cupo (`seen_likely`, `social`, `friend_gem`, `explore`): nombre de cupo, desglose «N vistos · N pendientes · N fuera», tasa porcentual de éxito `font-semibold tabular-nums text-accent` y total mostradas. `Metrics.tsx:145-164`.

2. **Decidir** `Metrics.tsx:167-235`:
   - Cabecera: `serif text-lg font-semibold text-accent` «Decidir» con contador de sesiones. `Metrics.tsx:169-171`.
   - Rejilla 2 columnas `grid grid-cols-2 gap-2`: «Aceptación 1ª ronda», «Tasa de abandono», «Duelos por sesión», «Latencia duelo», «InfoGain duelos», ««No conozco ninguna»». `Metrics.tsx:174-181`.
   - Desglose «No conozco ninguna» por fase (F1, F2, F3): caja `rounded-2xl bg-surface border border-line p-3 space-y-2`. Rejilla 3 columnas `grid grid-cols-3 gap-2 text-center pt-1`. Cada celda: `rounded-xl bg-surface2/60 p-2 border border-line/40`, etiqueta de fase, porcentaje en blanco `text-lg font-bold font-serif tabular-nums text-white`, ratio `text-[9px] text-mute` con `${slow}/${total} duelos`. `Metrics.tsx:184-212`.
   - Métrica Estrella (acierto real a 14 días): caja `rounded-2xl bg-surface border border-line p-3.5 space-y-1.5`. Título `text-xs font-semibold uppercase tracking-wide text-accent` «Métrica Estrella» con obras aceptadas. Cifra principal `text-2xl font-serif font-bold text-white tabular-nums` con porcentaje y texto «Acabaron vistas en 14 días»; cifra derecha `text-xl font-serif font-bold text-accent tabular-nums` con «Top N%» y texto «Puesto medio en tu ranking». `Metrics.tsx:215-234`.

3. **Limpieza de pendientes** `Metrics.tsx:237-250`:
   - Cabecera: `serif text-lg font-semibold text-accent` «Limpieza de pendientes» con total de tarjetas revisadas. `Metrics.tsx:239-241`.
   - Rejilla 3 columnas `grid grid-cols-3 gap-2`: «Vistas» (`rightRate`), «Se quedan» (`upRate`), «Fuera» (`leftRate`). `Metrics.tsx:244-248`.

- Diálogo Confirmación Borrado: `Confirm` con título «¿Borrar todos los eventos?», texto «Se restablecerán a cero los eventos locales de métricas. Las valoraciones y biblioteca no se verán afectadas.», botón «Borrar eventos». `Metrics.tsx:252-260`.
- Toast: duración 1500 ms (`Metrics.tsx:262`).

---

## PushPrompt (`app/src/components/PushPrompt.tsx`)

- Capa modal: contenedor a pantalla completa `fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs`. `PushPrompt.tsx:48`.
- Animación de entrada y salida: `initial={{ y: 80, opacity: 0 }}`, `animate={{ y: 0, opacity: 1 }}`, `exit={{ y: 80, opacity: 0 }}`, muelle `transition={{ type: 'spring', damping: 28, stiffness: 320 }}`. `PushPrompt.tsx:50-53`.
- Caja del diálogo: `w-full max-w-sm rounded-[24px]` (24), `bg-surface border border-line p-5` (20), `shadow-2xl text-ink space-y-4` (16). `PushPrompt.tsx:56`.
- Fila superior de icono: `flex items-center justify-between`. Icono en caja `w-12 h-12` (48 × 48), `rounded-2xl` (16), fondo `bg-accent/15 text-accent flex items-center justify-center`, icono `bell` de 26. Pastilla derecha: `text-[11px] font-semibold tracking-wider uppercase text-mute bg-surface2 px-2.5 py-1 rounded-full border border-line` con texto «Alertas». `PushPrompt.tsx:58-65`.
- Bloque de títulos: título `text-lg font-bold` «¿Qué notificaciones quieres recibir?»; descripción `text-xs text-mute leading-relaxed` «Elige con qué frecuencia quieres enterarte de novedades, estrenos y la actividad de tus amigos.». `PushPrompt.tsx:67-74`.
- Botones de selección de nivel (`flex flex-col gap-2 pt-1`, `:76`):
  1. **Opción 1: Solo importantes (Recomendado)**: botón `w-full p-3 rounded-2xl bg-accent text-accent-ink font-medium text-sm flex items-center justify-between active:scale-[0.98] transition-transform shadow-sm text-left`. Título `font-semibold text-[13px] flex items-center gap-1.5` con texto «Solo importantes» y distintivo `text-[10px] uppercase font-bold tracking-wider bg-black/15 text-accent-ink px-1.5 py-0.5 rounded-full` «Recomendado». Subtítulo `text-[11px] opacity-85 font-normal` «Estrenos pendientes y duelos de amigos». Chevrón derecho de 16 (o texto «Activando…» con pulso). `PushPrompt.tsx:78-100`.
  2. **Opción 2: Todas las notificaciones**: botón `w-full p-3 rounded-2xl bg-surface2 border border-line hover:border-line2 text-ink font-medium text-sm flex items-center justify-between active:scale-[0.98] transition-transform text-left`. Título `font-semibold text-[13px]` «Todas las notificaciones»; subtítulo `text-[11px] text-mute font-normal` «Recomendaciones semanales y toda la actividad». Chevrón derecho de 16 (o texto «Activando…» con pulso). `PushPrompt.tsx:103-120`.
  3. **Opción 3: Desactivar**: botón `w-full min-h-[38px] rounded-xl text-mute text-xs font-medium hover:text-ink transition-colors mt-0.5` con texto «No activar ninguna». `PushPrompt.tsx:123-130`.
- Pie informativo: `text-[11px] text-center text-mute/80 pt-0.5` «Podrás cambiar tus preferencias en cualquier momento en tu Perfil → Ajustes.». `PushPrompt.tsx:133-135`.
- Disparo automático del diálogo: se activa tras catalogar 10 o más obras vistas (`seenCount >= 10`), con un retardo de 1500 ms tras alcanzar la condición, siempre que no se haya descartado previamente en `localStorage`. `PushPrompt.tsx:21-28`.

---

# 4. Dudas (lo que no se puede deducir leyendo el código)

1. **Gestión de la agenda de contactos en iOS nativo vs Web:**
   En la PWA (`FindFriends.tsx:30`, `:60`), el selector de contactos se apoya en `navigator.contacts.select` (`pickContacts`), que solo existe en Chrome para Android. En iOS web no está soportado. En la app nativa (Expo / React Native), se usará `expo-contacts` con permisos del sistema (`READ_CONTACTS` / `CNContactStore`). Al portar `FindFriends.tsx`, ¿se sustituye la pantalla introductoria por la petición directa de permisos nativos o se mantiene el paso previo de consentimiento RGPD diseñado en `docs/APP_NATIVA.md` §RGPD?
2. **Dimensiones de tarjetas de duelos con pósteres no estándar:**
   En `PlaceFlow.tsx:15` y `PairCompare.tsx:40`, `Poster` recibe `ratio: it.posterRatio` para juegos de mesa, pero `PairCompare` fuerza `relative flex-1 min-h-0` para las dos cartas con `Poster` a sangre `absolute inset-0 w-full h-full object-cover`. Por tanto, los juegos de mesa en duelos verticales pierden su proporción natural y se recortan. En `DuelFan` de `SwipePair` existe lógica de ajuste según `DuelFit` (`caja`, `area`, `alto`). Conviene confirmar si en duelos verticales A/B se mantiene el recorte o se respeta la caja contenedora.
3. **Persistencia de `biblio_push_prompt_dismissed` en nativo:**
   `PushPrompt.tsx:8` utiliza `localStorage` del navegador para recordar si el aviso de notificaciones fue cerrado. En la app nativa, este estado deberá persistir en `AsyncStorage` / almacenamiento clave-valor nativo para no volver a solicitar permisos del sistema en cada sesión.
