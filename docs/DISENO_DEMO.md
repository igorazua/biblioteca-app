# Documento de diseño — Demo navegable de la Biblioteca

> **Para quien construya la demo (otra sesión de Claude u otra persona):** este documento es autosuficiente. Antes de empezar, lee también `docs/IDEA.md` (la idea completa y las decisiones tomadas). Si algo de aquí contradice a `IDEA.md`, manda `IDEA.md` y avisa a Igor.
>
> Versión **1.4** · 22/10/2026 · ⚠️ **Las secciones §12, §13, §14 y §15 (cambios tras probar la demo y pulido de UI) mandan sobre las anteriores** donde se contradigan; la más reciente manda.
>
> Versión 1.0 · 15/10/2026 · Nombre del producto aún sin decidir (D17): usar **«Biblioteca»** como nombre provisional en toda la interfaz, centralizado en una constante para cambiarlo luego.

---

## 0. Objetivo de la demo

Una **web instalable en el móvil** (PWA) que Igor pueda **enseñar a amigos** y que se sienta como una app real:

- Fiel a las mecánicas descritas en `IDEA.md`: swipe de tres gestos, modal de valoración, valoración a pares, «¿qué vemos hoy?», listas compartibles.
- Con **datos de prueba realistas**: pelis, series y libros de verdad con sus portadas, y **amigos simulados** con notas y comentarios.
- **Sin backend**: todo en el navegador (`localStorage`). Los links de listas compartidas funcionan en otro móvil porque llevan los datos dentro de la URL (ver §7).

**No es** el producto final. No hay registro, ni amigos reales, ni servidor. Prioridad: **que se sienta bien en la mano** (gestos fluidos, animaciones, respuesta táctil) por encima de la exhaustividad.

### Fuera de alcance
- Autenticación, base de datos y amigos reales.
- Ingesta con IA, importación de guardados de redes.
- Modo grupo de «¿qué vemos hoy?».
- Estanterías de enlace o manuales.
- Monetización.

### La demo antigua
`demo/mockup.html` (hecha con Antigravity) es solo **referencia visual**. No se reutiliza: usa imágenes de stock, botones en vez de gestos e incluye pantallas que ya no forman parte de la idea (feed, reproductor, herramientas). Se construye desde cero en `app/`.

---

## 1. Stack y estructura

| Pieza | Elección | Por qué |
|---|---|---|
| Base | **Vite + React + TypeScript** | Mismo stack que otros proyectos de Igor (Smart Vault) |
| Estilos | **Tailwind CSS** | Ídem |
| Gestos y animación | **framer-motion** (`drag`, `useMotionValue`, `animate`) | Arrastre con física, rotación y salida de tarjetas |
| Estado | **zustand** con `persist` a `localStorage` | Simple, sin servidor |
| Rutas | **react-router** | Necesario para las rutas públicas de listas (`/l/...`) y perfil (`/p/...`) |
| PWA | **vite-plugin-pwa** | Instalable en la pantalla de inicio, funciona sin conexión |
| Despliegue | **Vercel** (proyecto estático) | Un link para pasar a los amigos. **Pedir confirmación a Igor antes de desplegar.** |

```
biblioteca-app/
├─ docs/                 ← IDEA.md, este documento, COMPETENCIA.md
├─ demo/mockup.html      ← demo antigua (solo referencia)
└─ app/
   ├─ scripts/build-seed.mjs   ← genera src/data/seed.json (ver §9)
   ├─ public/                  ← iconos PWA, manifest
   └─ src/
      ├─ data/seed.json        ← catálogo + amigos simulados (generado, se commitea)
      ├─ lib/ranking.ts        ← motor A/B (§5)
      ├─ lib/deck.ts           ← orden del mazo (§4.3)
      ├─ lib/share.ts          ← codificar/decodificar links (§7)
      ├─ store/                ← zustand
      ├─ screens/              ← una carpeta por pantalla
      └─ components/           ← SwipeCard, RatingSheet, PairCompare, FriendBubbles…
```

---

## 2. Modelo de datos

```ts
type ShelfType = 'movie' | 'series' | 'book';            // demo: 3 estanterías

interface Item {                                          // ficha de catálogo (seed)
  id: string;              // 'movie:603', 'series:1396', 'book:OL123W'
  type: ShelfType;
  title: string;
  year: number;
  creator: string;         // director / showrunner / autor
  durationMin?: number;    // pelis: duración; series: duración media del episodio
  seasons?: number;        // series
  pages?: number;          // libros
  genres: string[];
  synopsis: string;        // en español, 1-3 frases
  posterUrl: string | null;
  platforms?: string[];    // 'Netflix', 'Prime Video', 'HBO Max', 'Disney+', 'Movistar+', 'Filmin', 'Apple TV+'
  popularity: number;      // 0-100, para ordenar el mazo
}

type Status = 'seen' | 'pending' | 'dismissed';           // seen = visto/leído

interface UserEntry {                                     // lo que el usuario ha hecho con un item
  itemId: string;
  status: Status;
  stars?: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  ranked: boolean;         // false = está en «Sin ordenar»
  updatedAt: number;
}

interface Friend {                                        // simulado (seed)
  id: string;
  name: string;
  avatarColor: string;     // avatar = iniciales sobre color; sin servicios externos
  entries: { itemId: string; status: 'seen' | 'pending'; score?: number; comment?: string }[];
}

interface List {                                          // lista curada (mezcla tipos)
  id: string;
  title: string;
  description?: string;
  items: { itemId: string; note?: string }[];
  createdAt: number;
}

interface UserState {
  profile: { name: string; avatarColor: string; birthYear?: number; platforms: string[] };
  entries: Record<string, UserEntry>;
  rankings: Record<ShelfType, string[]>;  // itemIds ordenados, mejor primero (solo ranked)
  lists: List[];
  settings: { placeWithAB: boolean; commentBoxInPairs: boolean };
  categoryVotes: Record<string, boolean>;
  history: { itemId: string; prev: UserEntry | null }[]; // para «deshacer»
}
```

**Nota mostrada (0-10)**: se calcula a partir del ranking y las estrellas (§5.4). El usuario nunca escribe un número.

---

## 3. Navegación

Barra inferior con 5 pestañas (iconos + texto corto):

| Pestaña | Pantalla |
|---|---|
| 📚 Biblioteca | §6.2 |
| 🃏 Descubrir | §4 (swipe) |
| 🍿 **¿Qué vemos?** (botón central destacado) | §6.3 |
| ⚖️ Comparar | §5 (A/B) |
| 👤 Perfil | §6.4 |

En escritorio la app se muestra dentro de un **marco de móvil centrado** (≈ 400 × 850 px), con el fondo de la página difuminado. Así se enseña igual desde un portátil.

---

## 4. Descubrir — Swipe de curación y descubrimiento

### 4.1 Pantalla
- Arriba: **chips de estantería** (Pelis · Series · Libros). El mazo es de la estantería seleccionada.
- Centro: **tarjeta** a casi toda la altura, proporción de póster (2:3), con la imagen a sangre. Detrás asoman 1-2 tarjetas apiladas (escala 0,95 y 0,9).
- Sobre la imagen, abajo, con degradado: tipo + año, **título** grande, creador, duración/temporadas/páginas, 2 géneros.
- **Burbujas de amigos** (esquina superior de la tarjeta): hasta 4 avatares solapados y luego «+N». Cada avatar de un amigo que lo ha visto lleva un **pequeño badge con su nota** (ej. `8,5`). Los que lo tienen en pendientes llevan un 🔖 pequeño. Debajo, una línea: «Laura y 2 más la han visto».
- Debajo de la tarjeta: **botones equivalentes a los gestos** (✕ / 🔖 / ✓) y un botón pequeño de **deshacer** (↶). Los botones son necesarios en escritorio y por accesibilidad.
- Indicador discreto: «Te quedan 37 en Pelis».

### 4.2 Gestos

| Gesto | Significado | Feedback durante el arrastre | Resultado |
|---|---|---|---|
| ⬅️ Izquierda | No la he visto y no me interesa | Sello rojo «NO ME INTERESA» que aparece con la distancia; la tarjeta rota | `status = dismissed`; pasa a la siguiente |
| ➡️ Derecha | ¡La he visto! | Sello verde «¡VISTA!» (en Libros: «¡LEÍDO!») | Sale la **hoja de valoración** (§4.4) |
| ⬆️ Arriba | No la he visto, me interesa | Sello azul «PENDIENTE» | `status = pending`; pasa a la siguiente |
| 👆 Toque | Ver ficha | — | Abre la **ficha** (§6.1) |

- Umbral: soltar más allá del 30 % del ancho (horizontal) o del 20 % del alto (vertical), **o** con velocidad suficiente. Si no, la tarjeta vuelve a su sitio con un muelle.
- Gana la dirección dominante (|dx| contra |dy|). Hacia abajo no hace nada: vuelve al centro.
- Vibración corta (`navigator.vibrate(10)`) al confirmar, si existe.
- **Deshacer**: recupera la última tarjeta y su estado anterior (pila de 20).
- Cuando el mazo se agota: pantalla «¡Has repasado todo Pelis!» con accesos a Comparar y a otra estantería.

### 4.3 Orden del mazo (`lib/deck.ts`)
Se excluyen los items con cualquier `UserEntry`. Para el resto:

```
score = popularity
      + 15 × (nº de amigos que lo han visto o lo tienen pendiente)
      + 20 si el año de estreno está entre birthYear+12 y birthYear+25
      + 10 si está en alguna plataforma del usuario
      + ruido aleatorio estable de 0-5 (para que no parezca una lista fija)
```
Orden descendente. Objetivo: que las primeras tarjetas sean **«¡esta la vi!»**.

### 4.4 Hoja de valoración (tras swipe derecho)
Hoja inferior (bottom sheet) que sube a ~45 % de la pantalla, con la miniatura y el título:
- **5 estrellas** grandes y tocables.
- **Cajita de comentario** de una línea que crece («¿Qué significó para ti? (opcional)»).
- Botón **Guardar**.
- **Cerrar rápido**: deslizar la hoja hacia abajo o tocar fuera **también guarda** lo que haya (nada, solo estrellas, solo comentario o ambos). Nunca se pierde el «visto».
- Al guardar, el item queda `seen`:
  - **Con estrellas** y `settings.placeWithAB = true` (por defecto) y al menos 2 items ordenados con las mismas estrellas → lanza la **colocación A/B** (§5.2) en un modal de 2-4 comparaciones. Termina con «Colocada nº 7 de tus pelis · nota 8,1».
  - **Sin estrellas** → `ranked = false` (va a «Sin ordenar»).

---

## 5. Valoración a pares (A/B)

### 5.1 Pantalla «Comparar»
- Selector de estantería y contador: «Sin ordenar: 12 · Ordenadas: 34».
- **Dos tarjetas a la vez**: una arriba y otra abajo en móvil (lado a lado en pantallas anchas). Cada una con póster, título y año.
- **Elegir = deslizar la tarjeta ganadora hacia el centro, o tocarla.** Siempre hay que elegir una: no hay empate ni «saltar». Solo existe **deshacer** la última elección.
- **Cajita de comentario** (si `settings.commentBoxInPairs`): bajo las tarjetas, «Comentario para la que elijas». Al elegir, el texto se guarda en la **ganadora**.
  - Si en **3 comparaciones seguidas** no se escribe nada, aparece un aviso: «¿Ocultar la cajita de comentarios?» [Ocultar] [Mantener]. Se puede reactivar en Perfil → Ajustes.
- Tras cada elección, animación breve: la ganadora sube con «▲», la perdedora se atenúa.
- Si no hay nada que comparar (menos de 2 vistos): estado vacío con botón «Importar datos de ejemplo» (§6.5).

### 5.2 Motor de ranking (`lib/ranking.ts`)
Una lista ordenada por estantería, `rankings[shelf]` (mejor primero). Funciones puras y con tests unitarios.

**a) Colocar un item nuevo** (desde la hoja de valoración o desde «Sin ordenar»):
- Rango de búsqueda: si tiene estrellas, los items ordenados con **las mismas estrellas**; si no hay ninguno, la frontera entre los de más y menos estrellas (cero comparaciones). Sin estrellas: toda la lista.
- **Búsqueda binaria** dentro del rango: compara con el elemento medio; si gana, sube a la mitad superior; si pierde, baja. Coste ≈ log₂(tamaño del rango); con rangos típicos, 2-4 comparaciones.
- Al terminar: insertar en la posición y `ranked = true`.

**b) Sesión libre de pares** (la pantalla Comparar):
- Prioridad 1: items de **«Sin ordenar»** → se colocan con (a) sobre toda la lista.
- Prioridad 2 (todo ordenado): **refinar**. Se elige un item al azar (con preferencia por los que menos comparaciones llevan) y se compara con un **vecino cercano** (±1-3 posiciones).
  - Gana → intercambia posición con el vecino si estaba por encima.
  - **Racha**: si un item gana **3 seguidas** contra vecinos, la siguiente comparación es contra un item del **primer cuartil por encima de él**. Si también gana, **salta** justo debajo de ese item («sube mucho»). Simétrico para rachas de 3 derrotas: compara con el último cuartil por debajo y, si pierde, salta hacia abajo.
- Nunca enseñar dos veces seguidas la misma pareja.

### 5.3 Estrellas frente a ranking
Las estrellas **sitúan** (franja) y el A/B **ordena** dentro de ella. Si un item con 3★ acaba por encima de uno con 4★ (por el refinado libre), se respeta el orden del A/B, que manda, y las estrellas del item se actualizan a las de sus vecinos.

### 5.4 Nota 0-10
Por estantería, para cada item ordenado en la posición `i` de `n`:
- Con franja de estrellas `s`: franjas 5★ → [9,0-10], 4★ → [7,0-8,9], 3★ → [5,0-6,9], 2★ → [3,0-4,9], 1★ → [0,5-2,9]. Dentro de su franja, interpolación lineal según su posición entre los de su misma franja.
- Sin estrellas: `nota = 10 × (1 − i / n)`, acotada a [1, 10].
- Mostrar con un decimal y coma decimal (`8,3`).

---

## 6. Resto de pantallas

### 6.1 Ficha de una obra
Se abre al tocar cualquier tarjeta o item. Pantalla completa con:
- Póster grande con degradado; título, año, creador, duración/temporadas/páginas, géneros y plataformas en etiquetas visuales pasivas (`<Tag>`).
- Sinopsis.
- **Tu estado**: botones de acción táctiles dispuestos en el orden exacto del swipe (§15.1): 1. **«No me interesa»** (izquierda), 2. **«Guardar»** (centro), 3. **«Vista»** (derecha); si está vista, estrellas, posición («nº 3 de tus series») y tu comentario, editable.
- **Tus amigos** («¿Quién la vio antes que yo?»): lista con avatar, nombre, **nota** y **comentario** completo; los que la tienen pendiente aparte («La tienen pendiente: Marta, Javi»).
  - Botón por amigo: **«Pregúntale»** → abre WhatsApp (`https://wa.me/?text=...`) con un texto prellenado: «Oye Laura, he visto que le pusiste un 9 a *Dark*, ¿me la recomiendas?». Es lo que hace real lo social de la idea.
- Botón **«Añadir a una lista»**.

### 6.2 Biblioteca (pestaña principal)
- Cabecera: nombre del usuario y contadores («142 vistas · 23 pendientes»).
- **Una fila por estantería** (Pelis, Series, Libros) con scroll horizontal de pósters **en orden de ranking** y la nota en un badge. Al tocar el título de la fila → detalle de estantería.
- Fila **«Mis listas»** con tarjetas de collage de 4 portadas; botón «+ Nueva lista».
- Tarjeta **«Vota nuevas estanterías»** (§6.6).

**Detalle de estantería**: segmentos **Ordenadas** (lista numerada 1…n con miniatura, título, nota y estrellas; el top 3 destacado como «lo que más te marcó») · **Sin ordenar** (con botón «Ordenar ahora» → Comparar) · **Pendientes** (con botón «¿Qué vemos?» en Pelis/Series).

### 6.3 ¿Qué vemos hoy?
Para Pelis y Series (en Libros: «¿Qué leo ahora?» con las mismas mecánicas, cambiando la pregunta de tiempo).

1. **Tres preguntas**, una por pantalla, con botones grandes:
   - **¿Cuánto tiempo tienes?** — Menos de 1 h (series cortas) · Una peli (≤ 2 h 15) · Tarde entera / maratón (sin límite).
   - **¿Con quién?** — Solo · En pareja · Con amigos (en la demo filtra suavemente por géneros: «con amigos» favorece comedia y acción; no es un filtro estricto).
   - **¿Qué plataformas tenéis?** — chips preseleccionados con las del perfil.
2. Candidatos = **pendientes** que cumplen. Si hay menos de 3, se completan con items no vistos bien valorados por amigos, marcados «Sugerida por amigos».
3. **Propuesta**: una tarjeta grande, la candidata con mejor **puntuación prevista** (media de las notas de amigos; si no hay, popularidad), con el motivo («Laura le dio un 9 · Está en Netflix · 1 h 58»).
   - **«¡Esta!»** → pantalla final «A disfrutar 🍿» con el botón de la plataforma (no enlaza de verdad en la demo) y la opción de marcarla como vista después.
   - **«Otra»** → **3 comparaciones A/B rápidas** entre candidatas restantes (mismo componente de pares) → nueva propuesta, que es la ganadora de esos duelos. Bucle hasta aceptar o agotar candidatas.

### 6.4 Perfil
- Avatar (iniciales sobre color), nombre, año de nacimiento opcional, plataformas.
- **«Lo que más me marcó»**: top 3 de cada estantería en tarjetas grandes.
- Estadísticas sencillas: vistas por estantería, género más frecuente, nota media que pones.
- **Amigos** (simulados): lista con avatar y **% de afinidad** contigo (coincidencia de notas en items comunes; ver §9.3).
- **Compartir mi perfil** → link `/p/...` (§7).
- **Ajustes**: colocación A/B al valorar (sí/no), cajita de comentario en pares (sí/no), **reiniciar demo** (borra `localStorage`, con confirmación).

### 6.5 Onboarding (primera visita)
3 pantallas, rápidas y saltables:
1. Bienvenida + nombre + color del avatar.
2. **Año de nacimiento** (para el orden del mazo) — opcional.
3. **Plataformas** que tienes o has tenido.

Al final: «Empieza a hacer swipe» → Descubrir.
Opción visible en Biblioteca y Comparar: **«Cargar datos de ejemplo»**, que marca ~25 items populares como vistos **sin ordenar** (simula una importación de CSV de Letterboxd/FilmAffinity) para poder enseñar el A/B en segundos.

### 6.6 Votar estanterías
Lista de estanterías futuras con un botón ❤️ por cada una y un contador falso de votos de la comunidad: Documentales, Anime, Podcasts, Videojuegos, Juegos de mesa, Cómics y manga, Canciones, Artistas, Canales de YouTube, Restaurantes. Guarda el voto en local.

---

## 7. Listas y links compartibles (sin backend)

- **Crear lista**: título, descripción opcional, seleccionar items de **cualquier estantería** (buscador + filtros por estantería y estado) y una **nota por item** opcional («Escúchala con cascos»).
- **Compartir** → genera un link y abre el menú nativo de compartir (`navigator.share`, con alternativa de copiar al portapapeles).
- **Formato del link**: `https://<dominio>/l/<payload>` donde `payload` = JSON compacto `{t: título, d: descripción, a: autor, c: colorAvatar, i: [[itemId, nota?], …]}` → comprimido con **lz-string** (`compressToEncodedURIComponent`). Funciona en cualquier móvil porque los items viven en el `seed.json` desplegado.
- **Vista pública** de `/l/...` (y de `/p/...`, que lleva nombre + top 3 de cada estantería):
  - **Sin la barra de navegación de la app**: parece una web normal, para quien no tiene la app.
  - Cabecera «*Igor* te ha preparado esta lista», portadas grandes, nota del autor por item.
  - Botón por item **«Guardar en mi biblioteca»** y uno general **«Guardar toda la lista»** → si es la primera visita, pasa por el onboarding y vuelve; luego marca los items como **pendientes** (con origen «de Igor»).
  - Previsualización en WhatsApp: título y descripción genéricos en `index.html` (con datos variables haría falta un servidor; fuera de alcance).

---

## 8. Dirección visual

- **Oscuro y cinematográfico**: fondo casi negro (#0E0E10), tarjetas con póster a sangre, **un solo color de acento** (propuesta: ámbar cálido #F5B544, que recuerda a las luces de una biblioteca); rojo, verde y azul **solo** para los sellos de gesto.
- Tipografía: una sans geométrica para la interfaz (p. ej. *Inter* u *Outfit*) y una serif con carácter **solo para títulos de obras** (p. ej. *Fraunces* o *Playfair Display*), para dar sensación de biblioteca.
- **Movimiento**: tarjetas con física de muelle, rotación proporcional al arrastre (máx. ±15°), sellos que aparecen con opacidad según la distancia, hojas inferiores con muelle. Nada de animaciones largas: todo < 300 ms.
- Áreas táctiles ≥ 44 px. Funciona a 360 px de ancho.
- Accesibilidad: todos los gestos tienen botón equivalente, textos alternativos en pósters, contraste AA.
- **Sin imágenes de stock**: solo portadas reales del catálogo o, si faltan, una portada generada (degradado a partir del título + título en la serif).

---

## 9. Datos de prueba

### 9.1 Catálogo (`scripts/build-seed.mjs` → `src/data/seed.json`)
- **Películas: 80**, **series: 50**, **libros: 40**. Mezcla de populares en España de los últimos 30 años (para que el swipe acierte a gente de 25 a 50 años), algunos clásicos y algo de cine y series españoles (*La casa de papel*, *Élite*, *El hoyo*, *As bestas*, *Cuéntame*, *Merlí*…).
- **Pelis y series**: API de **TMDB** (gratuita para uso no comercial), en español (`language=es-ES`), con plataformas para España vía `watch/providers` (región `ES`).
  - ⚠️ Requiere una **API key de TMDB**. La cuenta la tiene que crear **Igor** en themoviedb.org (gratis, 5 minutos) y guardar la clave en `app/.env.local` como `TMDB_API_KEY` (no se commitea). El script **solo** se ejecuta en local para generar el JSON; la clave nunca llega al navegador.
  - Incluir en Perfil → «Acerca de» la atribución obligatoria: «Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB», con su logo.
- **Libros**: **Open Library** (sin clave): búsqueda por título y autor, portada vía `covers.openlibrary.org`. Sinopsis en español escritas a mano en el script si Open Library no las tiene en español.
- **Sin clave de TMDB**: el script debe funcionar igualmente con una lista escrita a mano (título, año, creador, géneros, sinopsis breve) y `posterUrl: null` → portadas generadas (§8). Así la demo se puede construir antes de tener la clave.
- `popularity`: normalizar la popularidad de TMDB a 0-100; para libros, a mano.

### 9.2 Amigos simulados (6)
Generados por el script con semilla fija (resultado estable). Cada uno con un **perfil de gusto** reconocible, para que las notas y los comentarios tengan sentido:

| Nombre | Perfil |
|---|---|
| Laura | Thrillers y series nórdicas; notas exigentes |
| Carlos | Ciencia ficción y cine de autor |
| Marta | Comedia, romántica y realities |
| Javi | Acción, superhéroes y anime |
| Ane | Lectora voraz; drama y novela histórica |
| Dani | Clásicos y documentales |

- Cada amigo: 40-70 items vistos con nota (0,5-10, coherente con su perfil) y 10-20 pendientes.
- **Comentarios**: unos 60 en total, breves, en español coloquial y con personalidad («La vi en el instituto y me cambió la vida», «El final me lo esperaba, pero vale la pena por la fotografía»). Escribirlos a mano en el script; no generarlos en tiempo de ejecución.

### 9.3 Afinidad
`afinidad = 100 − 10 × (media de |tu nota − su nota|)` sobre los items comunes (mínimo 3); si hay menos de 3: «Aún no hay datos».

---

## 10. Criterios de aceptación

La demo está terminada cuando, **en un móvil real** (Chrome Android y Safari iOS) y en escritorio:

1. [ ] Se instala en la pantalla de inicio y abre a pantalla completa.
2. [ ] Swipe izquierda / derecha / arriba funcionan con el dedo, con sellos y física; los botones hacen lo mismo; deshacer funciona.
3. [ ] El swipe derecho abre la hoja de valoración; cerrarla de cualquier forma guarda el «visto».
4. [ ] Con estrellas, la colocación A/B aparece y en ≤ 4 comparaciones coloca la obra con su nota.
5. [ ] La pantalla Comparar ordena «Sin ordenar» y refina con rachas; el comentario va a la ganadora; el aviso de ocultar la cajita aparece tras 3 vacías.
6. [ ] Las burbujas de amigos con nota aparecen en las tarjetas y la ficha muestra sus comentarios; «Pregúntale» abre WhatsApp con el texto.
7. [ ] «¿Qué vemos hoy?» hace las 3 preguntas, propone, y el bucle de «Otra» con 3 pares funciona.
8. [ ] Una lista mixta (pelis + libros) se comparte, y el link abierto en **otro móvil** muestra la vista pública y permite guardar como pendientes.
9. [ ] La biblioteca muestra cada estantería ordenada por nota; el perfil muestra el top 3 y la afinidad con amigos.
10. [ ] «Cargar datos de ejemplo» y «Reiniciar demo» funcionan.
11. [ ] Tests unitarios de `lib/ranking.ts` (inserción binaria, rachas, nota 0-10) y `lib/share.ts` (codificar y decodificar) pasan.
12. [ ] Recarga sin perder estado; funciona sin conexión tras la primera visita.

## 11. Orden de construcción sugerido

1. Esqueleto (Vite, Tailwind, rutas, barra inferior, marco de móvil) + `seed.json` con datos escritos a mano (sin TMDB).
2. **Descubrir** (tarjeta, gestos, hoja de valoración), lo más importante para enseñar.
3. Motor de ranking con tests + **Comparar** + colocación A/B.
4. Biblioteca + ficha + amigos simulados.
5. ¿Qué vemos hoy?
6. Listas + links + vista pública.
7. Perfil, onboarding, votar estanterías, PWA.
8. Script de TMDB y Open Library cuando Igor tenga la clave → regenerar `seed.json`.
9. Despliegue en Vercel (con confirmación de Igor).

---

## 12. Cambios v1.1 — feedback de Igor tras probar la demo (15/10/2026)

> Estos cambios **sustituyen** a lo indicado antes en las secciones citadas. Fuente: `IDEA.md` v0.3.

### 12.1 Añadir a mano (nuevo)
- En el **detalle de cada estantería** (y en su fila de la Biblioteca): botón **+** → **buscador** del catálogo de esa estantería (por título, con resultados instantáneos mientras escribes; portada, título, año).
- Botón **+ general** (en la cabecera de la Biblioteca): primero **elegir estantería** (Pelis / Series / Libros) y luego el mismo buscador.
- Al tocar un resultado: dos botones, **«La he visto/leído»** (abre la hoja de valoración de §4.4) y **«Pendiente»**. Si ya estaba en la biblioteca, se indica su estado y se abre su ficha.
- Sin resultados: «No está en nuestro catálogo todavía» (regla: solo catálogo).

### 12.2 Compartir desde una estantería (nuevo)
- En el detalle de estantería, botón **Compartir** → modo selección: casillas en cada item, **«Seleccionar todas»** y contador.
- «Crear lista» → pantalla de §7 con los items ya puestos (título sugerido: «Mis pelis favoritas de Igor»), y desde ahí compartir el link.

### 12.3 Descubrir: guardar sin interrupciones (sustituye a §4.4, segunda mitad)
- **Quitar la colocación A/B y el modal «Colocada nº X · nota Y»** tras guardar.
- Tras la hoja de valoración solo aparece un **aviso breve** (~1,5 s): «Guardada ✓», y la siguiente tarjeta.
- Colocación provisional **sin comparaciones**: con estrellas → en la frontera de su franja de estrellas; sin estrellas → «Sin ordenar». El orden fino se hace en Comparar (§12.5), que prioriza los items provisionales y los sin ordenar.
- Eliminar el ajuste `placeWithAB`.

### 12.4 Las estrellas no se muestran nunca más (sustituye a §5.3, §6.1, §6.2)
- Las estrellas solo existen en la **hoja de valoración inicial**. Después **no se muestran en ningún sitio**: ni en la ficha, ni en la lista de la estantería, ni en el perfil. Solo se ve la **nota 0-10**.
- Internamente se siguen usando para la colocación provisional y para la nota (§5.4). No hace falta actualizar las estrellas al reordenar.
- En la ficha, la valoración del usuario se muestra como «Tu nota: 8,3 · nº 3 de tus series».

### 12.5 Comparar: sesiones de 10, con swipe y lados claros (sustituye a §5.1)
- **Sesión de 10 comparaciones** (constante `PAIRS_PER_SESSION = 10`), con una barra de progreso «4 / 10». Al terminar, pantalla de resumen: qué ha subido y bajado más (con flechas), y dos botones: **«Ver mi ranking»** (abre el detalle de la estantería) y **«Seguir valorando»** (otras 10).
- **Elegir con swipe izquierda/derecha** (y tocar como alternativa):
  - Las dos obras **lado a lado** a pantalla completa, separadas por una **diagonal** (la izquierda ocupa el triángulo izquierdo, la derecha el derecho), cada una con su póster recortado y su título.
  - **Cada lado tiene su color** (izquierda: el ámbar del acento; derecha: un azul o violeta contrastado) en el borde y en una etiqueta «◀ ESTA» / «ESTA ▶».
  - Al deslizar, el **lado hacia el que vas se ilumina y crece** proporcionalmente a la distancia, y el otro se oscurece; al pasar el umbral, vibración y queda elegido. Deslizar a la izquierda = gana la izquierda.
  - Debe entenderse sin leer nada: probarlo con alguien que no conozca la app.
- **Comentario** (sustituye a la cajita del medio): al elegir la ganadora sale una **hoja inferior como la de Descubrir pero sin estrellas** («¿Algo que decir de *Dark*?», cajita, Guardar). Se cierra deslizando o tocando fuera (guarda lo que haya). En la hoja, un interruptor **«No preguntar más»** (se reactiva en Perfil → Ajustes, `commentBoxInPairs`). Eliminar la regla de «3 vacías seguidas».

### 12.6 ¿Qué vemos hoy? rediseñado (sustituye a §6.3)
- **Sin pregunta de tipo**: la categoría es la estantería desde la que entras (botón en Pelis, Series y Libros; en la pestaña central, chips para elegir estantería antes de empezar). En Libros es «¿Qué leo ahora?» y ahí va el **test del lector** que ya existe en el código (solo en ese flujo).
- **5 preguntas propias de cada categoría**, una por pantalla, que **avanzan solas al tocar** una respuesta (sin «Aceptar»; con botón atrás). Preguntas provisionales (se pulirán más adelante, D21):
  - **Pelis**: mood (Acción · Romántica · Profunda · Risas · Miedo · Me da igual), tiempo, con quién, plataformas (multiselección + «Seguir»), ¿algo reciente o un clásico?
  - **Series**: mood, ¿miniserie o algo largo?, duración del episodio, con quién, plataformas.
  - **Libros**: el test del lector existente + mood + extensión.
- **Después, siempre duelos**, nunca una recomendación directa: **mínimo 5 duelos** con el mismo componente de §12.5 (sin hoja de comentario).
  - **Duelos de tipos o estilos** (decisión provisional, D19): cada lado es un **estilo** con nombre y collage de 3-4 pósters de ejemplo del catálogo, no un título concreto. Ej.: «Thriller nórdico» vs «Comedia ligera», «Ciencia ficción cerebral» vs «Acción sin pensar». Los estilos se definen en `src/data/styles.ts` (por categoría: nombre, géneros y palabras clave que lo componen, 3-4 items de ejemplo). Los pares se eligen según las respuestas (no enfrentar estilos que contradigan el mood elegido).
  - Con las respuestas y los estilos ganadores se puntúan los candidatos: **primero los pendientes** del usuario, luego títulos del catálogo no vistos, bien valorados por amigos o populares.
- Tras los 5 duelos: **«Te propongo esta»** con el motivo («Encaja con *Thriller nórdico* · Laura le dio un 9 · En Netflix»). Botones: **«¡Esta!»** y **«Seguir buscando»** → 3 duelos más **entre títulos candidatos concretos** → nueva propuesta. Bucle.

### 12.7 Contacto con amigos (amplía §6.1)
- Cada amigo simulado tiene `contact: { whatsapp?: string; instagram?: string }` (en la semilla, unos por WhatsApp, otros por Instagram y alguno con ambos; números y usuarios ficticios).
- **«Pregúntale»** usa el canal disponible:
  - WhatsApp: `https://wa.me/<teléfono>?text=<mensaje>` (con número) o `https://wa.me/?text=<mensaje>` (sin número).
  - Instagram: copia el mensaje al portapapeles, avisa «Mensaje copiado, pégalo en el chat» y abre `https://ig.me/m/<usuario>` (Instagram no permite prellenar el texto).
  - Si hay ambos, menú con las dos opciones.
- **Agenda real (opcional en la demo)**: en Perfil → Amigos, botón «Buscar en mis contactos» con la **Contact Picker API** (`navigator.contacts.select(['name','tel'])`). Solo existe en Chrome Android: si no está disponible, **ocultar el botón**. El usuario elige qué contactos compartir; en la demo solo se muestran («Aún no usan la app · Invitar», con link de WhatsApp) y no se suben a ningún sitio.

### 12.8 Criterios de aceptación añadidos
13. [ ] El + dentro de una estantería y el + general (con elección de estantería) añaden por búsqueda.
14. [ ] Compartir desde una estantería, con «Seleccionar todas» o selección parcial, crea una lista con link.
15. [ ] Tras guardar en Descubrir solo aparece «Guardada ✓»; no hay modal ni duelos.
16. [ ] Las estrellas no aparecen en ninguna pantalla salvo la hoja inicial.
17. [ ] Comparar va por sesiones de 10 con resumen final; se elige con swipe y el lado elegido se ilumina; el comentario sale en una hoja tras elegir y se puede desactivar.
18. [ ] «¿Qué vemos hoy?» no pregunta el tipo; las preguntas avanzan solas; hay al menos 5 duelos de estilos antes de proponer; «Seguir buscando» hace duelos de títulos.
19. [ ] «Pregúntale» usa WhatsApp o Instagram según el amigo.

### 12.9 Diseño visual: skills instaladas
Igor tiene instaladas tres skills de diseño en Claude Code. Para esta demo (pantallas de app, no una web pública) la adecuada es **`redesign-existing-projects`**: úsala para auditar y pulir la interfaz existente **sin romper funcionalidad**, manteniendo la dirección de §8 (oscuro, cinematográfico, acento ámbar). `design-taste-frontend` es para webs públicas: servirá para una futura landing o para la vista pública de listas `/l/...`. `minimalist-ui` no encaja con la dirección oscura elegida.

---

## 13. Cambios v1.2 — segunda ronda de feedback (15/10/2026)

### 13.1 Duelos de colocación solo al añadir a mano (amplía §12.1 y §12.3)
- **Descubrir: nunca hay duelos** (se mantiene §12.3: solo «Guardada ✓»).
- **Añadir a mano** (botón +, §12.1) → «La he visto/leído» → hoja de valoración (estrellas + comentario) → **2-4 duelos de colocación** con el componente de duelo (§13.3), sin hoja de comentario en los duelos (el comentario ya se pidió en la hoja) → aviso breve «Guardada ✓». Sin pantalla de «puesto X».
- Si la estantería tiene menos de 2 obras ordenadas en su franja, no hay duelos.

### 13.2 El asistente: nombre nuevo y primero la categoría (sustituye a §12.6, primer punto)
- Deja de llamarse «¿Qué vemos hoy?». Nombre provisional **«Decidir»** (pestaña central: «Decidir»; título de la pantalla: «¿Te ayudo a elegir?»). Centralizar el nombre en `config.ts` (D22).
- **Paso 0: elegir categoría** con tres tarjetas grandes (Pelis · Series · Libros), cada una con un collage de portadas. Desde una estantería se entra con la categoría ya elegida.
- Después, como en §12.6: las 5 preguntas de esa categoría (en Libros, el test del lector), que avanzan solas; mínimo 5 duelos de estilos; propuesta; «Seguir buscando».

### 13.3 Componente de duelo rediseñado (sustituye al diseño de §12.5)
El diseño actual (dos columnas partidas por una línea diagonal fina) no funciona: no se lee qué es cada lado y las letras gigantes de las portadas generadas lo ensucian. Nuevo diseño:

- **Las dos opciones apiladas**: una en la **mitad superior** y otra en la **mitad inferior**.
- **Cada una «pertenece» a un lado de forma inequívoca**:
  - **Superior = IZQUIERDA**: tarjeta **pegada al borde izquierdo** de la pantalla (sin margen ni esquinas redondeadas en ese borde, esquinas grandes en el derecho), desplazada ~12 % a la izquierda. **Color ámbar**: banda vertical gruesa en el borde izquierdo con una **flecha grande ◀** y la etiqueta «DESLIZA ◀».
  - **Inferior = DERECHA**: espejo exacto: **pegada al borde derecho**, desplazada a la derecha, **color violeta**, banda en el borde derecho con **▶** y «DESLIZA ▶».
  - Entre ambas, una **separación en curva o diagonal** (forma de S o corte inclinado, con `clip-path` o SVG) que refuerce la idea de «arriba-izquierda / abajo-derecha». Nada de líneas finas.
- **Durante el arrastre** (el dedo puede estar en cualquier parte de la pantalla):
  - Hacia la izquierda: la superior **se desliza hacia el centro, crece y se ilumina en ámbar**; la inferior se oscurece y se encoge. Hacia la derecha, al revés con el violeta.
  - Al pasar el umbral, vibración y la ganadora ocupa la pantalla un instante con «✓».
- Tocar una tarjeta también la elige.
- **Contenido de cada tarjeta**: póster o collage a sangre (cuadrado o apaisado según la mitad), con degradado inferior; título en la serif; una línea de subtítulo. En los duelos de estilos, collage de 3-4 portadas reales del catálogo.
- Usar este mismo componente en Comparar, en la colocación al añadir a mano y en el asistente.

### 13.4 Portadas generadas más dignas (sustituye a la portada generada de §8)
Las letras gigantes semitransparentes parecen un error. Mientras no haya portadas reales:
- Degradado de 2 colores derivado del título (paleta oscura y saturada, no rojos y azules planos), **título completo** en la serif bien compuesto (tamaño ajustado al ancho, con salto de línea), año y creador pequeños abajo, y una textura sutil (grano o viñeta). Debe parecer una portada minimalista de diseño, no un hueco vacío.

### 13.5 Pase de pulido visual (D23)
Objetivo: que deje de parecer una maqueta. **Se hace en esta ronda, después de 13.1-13.4.**
1. **Portadas reales**: es el salto visual más grande. Requiere la clave de TMDB que tiene que crear Igor (§9.1). En cuanto esté en `app/.env.local`, regenerar `seed.json` con `npm run seed`.
2. Usar la skill **`redesign-existing-projects`**: auditoría de la interfaz y corrección de patrones genéricos, sin romper funcionalidad.
3. **Referencias** que mirar (como inspiración, no copiar): Letterboxd (fichas y listas), Beli (comparación y perfil), Spotify (pantallas oscuras, jerarquía y tipografía), Apple TV (pósters a sangre).
4. **Sistema visual coherente**: escala tipográfica fija (4-5 tamaños), espaciado en múltiplos de 4, un juego de iconos único y lineal, radios consistentes, sombras y desenfoques sutiles en hojas y barras, estados vacíos ilustrados.
5. **Movimiento**: transiciones entre pantallas, aparición escalonada de listas, feedback táctil en todos los botones.
6. Entregar **capturas antes/después** de Descubrir, el duelo, Biblioteca y el asistente.

### 13.6 Criterios de aceptación añadidos
20. [ ] Descubrir no tiene duelos; añadir a mano sí (2-4) y termina en «Guardada ✓».
21. [ ] El asistente se llama «Decidir», empieza eligiendo categoría y luego hace preguntas y duelos.
22. [ ] En el duelo, alguien que no conoce la app sabe sin leer que la de arriba se elige deslizando a la izquierda y la de abajo a la derecha.
23. [ ] Las portadas generadas muestran el título completo y no tienen letras gigantes.
24. [ ] Capturas antes/después del pase de pulido.


---

## 14. Cambios v1.3 — tercera ronda de feedback (15/10/2026)

### 14.1 Preguntas de Decidir: sobre lo que quieres ahora (sustituye a §12.6 en Libros)
- Fuera el test del lector de Decidir («Un sábado perfecto…»). En Libros, 5 preguntas sobre la **siguiente lectura**: qué te apetece, extensión, ¿ficción o no ficción?, ¿que te enganche o algo pausado?, ¿parecido a lo que te gusta o salir de tu zona?

### 14.2 Duelos orientadores (sustituye a los duelos de estilos y de títulos de §12.6)
- Cada duelo: «¿Te apetece más algo como esto o como esto?», con **dos obras concretas de la misma categoría**, conocidas (populares) y **contrastadas entre sí** (géneros distintos), dentro de lo que encaja con el ánimo elegido. Nunca tipos ni géneros. Desaparece `data/styles.ts`.
- **No son candidatas**: no se proponen ni entran en la lista de candidatas.
- Cada elección suma peso a los géneros (y al autor) de la elegida y resta a los de la descartada; con eso se puntúan las candidatas (primero tus pendientes).
- Mínimo 5 duelos → propuesta, con el motivo «Algo como *X*». «Seguir buscando» = **3 duelos orientadores más** → nueva propuesta. Bucle.

### 14.3 Animación del duelo: la elegida se expande (amplía §13.3)
- Al arrastrar hacia un lado, la tarjeta de ese lado **crece sobre la otra** hasta ocupar la pantalla entera: deslizar a la derecha (gana la de abajo) hace que la de abajo **suba** cubriendo la de arriba; deslizar a la izquierda (gana la de arriba) hace que la de arriba **baje** cubriéndola. Al soltar pasado el umbral, termina de cubrir la pantalla, ✓, y siguiente duelo.

### 14.4 Sin «sin ordenar» (sustituye a §6.2 y a lo visible de §12.3)
- Ni en la Biblioteca, ni en la estantería, ni en Comparar aparece «sin ordenar». Lo no valorado se muestra al final de la estantería, sin número ni nota.
- Cada entrada guarda cuántas comparaciones lleva (`cmp`); Comparar prioriza las que menos llevan (primero las nunca comparadas).
- La estantería tiene dos pestañas: **Mis {pelis}** (ranking) y **Pendientes**. En la Biblioteca, cada estantería muestra un acceso «🔖 N pendientes».

### 14.5 Añadir a mano: lista inicial (amplía §12.1)
- Con el buscador vacío, sugerencias ordenadas como el mazo de Descubrir (popularidad, amigos, época, plataformas), **excluyendo lo que ya tienes** (vistas y pendientes). Al escribir, se busca en todo el catálogo y se marca lo que ya tienes.

### 14.6 Puesto en vez de nota (D25, sustituye a §5.4 en todo lo visible)
- La nota 0-10 **no se muestra en ningún sitio**. Se muestra el **puesto**: badge «nº 3» (componente `RankBadge`).
  - Biblioteca: número grande y hueco detrás de cada portada (todas las posiciones); sin badge de nota.
  - Estantería: el número de puesto a la izquierda de cada fila; sin badge de nota.
  - Ficha: «Tu puesto · nº 3» y «nº 3 de tus 42 series». Cada amigo: «nº 2 de sus 48 pelis», y «Pregúntale» usa el puesto en el mensaje.
  - Burbujas de amigos en Descubrir: «nº 2» del ranking de cada amigo.
  - Perfil: sin «Nota media que pones»; el top 3 solo con su número.
- **Percentil interno** (`lib/rank.ts`): 1º = 100, último = 0. Se usa para la **afinidad** (100 − media de |diferencia de percentil| en obras comunes), para la «media de amigos» que pesa en recomendaciones y en el orden del mazo, y nunca se enseña.
- Los amigos simulados de la semilla siguen trayendo nota; su ranking se deriva ordenando esas notas.


---

## 15. Cambios v1.4 — Coherencia de gestos, botones y diseño de etiquetas (22/10/2026)

### 15.1 Reordenación de botones de acción en la Ficha (`ItemDetail`)
Los 3 botones de acción en la ficha de obra se reordenan de izquierda a derecha para reflejar exactamente la memoria muscular y dirección física de los gestos del mazo de swipe:
1. **Izquierda (Swipe Izquierda): «No me interesa»** (`status === 'dismissed'`) — icono `x`, iluminación semántica *rose* (`bg-rose-500/15 border-rose-500/60 text-rose-400`).
2. **Centro (Swipe Arriba): «Guardar»** (`status === 'pending'`) — icono `bookmark`, iluminación semántica *sky* (`bg-sky-500/15 border-sky-500/60 text-sky-400`).
3. **Derecha (Swipe Derecha): «Vista» / «{label.actionPast}»** (`status === 'seen'`) — icono `check`, iluminación semántica *emerald* (`bg-emerald-500/15 border-emerald-500/60 text-emerald-400`).

### 15.2 Sistema de Diseño: Diferenciación estricta entre Botones y Etiquetas
Se resuelve la ambigüedad donde metadatos pasivos y controles interactivos compartían la misma apariencia (píldoras `rounded-full` con fondos idénticos):
- **Etiquetas (`<Tag>` en `ui.tsx`):**
  - **Uso:** Metadatos informativos no interactivos (géneros, plataformas, hechos/duración).
  - **Apariencia:** Cajas rectangulares con esquinas suavizadas (`rounded-lg`, 6-8px), tipografía compacta (`text-[11px] font-medium`), borde fino (`border-white/10`) y fondo discreto (`bg-white/[0.05]`).
  - **Propósito:** Se identifican al instante como etiquetas de lectura pasiva, evitando que el usuario intente pulsarlas.
- **Botones de acción táctiles:**
  - **Uso:** Acciones directas sobre la obra (marcar estado, añadir a listas).
  - **Apariencia:** Controles táctiles prominentes (`rounded-2xl`, altura $\ge 52\text{ px}$), iconos vectoriales claros, respuesta elástica al toque (`active:scale-95`) e iluminación temática reactiva por estado.
- **Pastillas de filtrado (`<Chip>`):**
  - **Uso:** Exclusivamente para selección de pestañas o filtros de catálogo (`Todas`, `Películas`, `Series`...).

### 15.3 Rediseño del Onboarding / Tutorial interactivo
- Paso 1 del tutorial recreado con una tarjeta real a sangre extraída del catálogo, con física háptica de resorte y cabeceo 3D (`tilt`).
- Eliminación de emojis informales a favor de sellos tipográficos limpios y una iconografía lineal profesional.
- Duelo A/B del Paso 2 con portadas auténticas y mecánicas idénticas al motor de comparación real.
