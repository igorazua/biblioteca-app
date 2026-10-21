# Referencias de UI — apps que Igor ha probado

> Patrones sacados de capturas reales que pasa Igor. Cada uno dice **qué hace la otra app**, **qué nos llevamos** y **dónde iría**. No es una decisión: es la despensa de ideas. Lo que se apruebe pasa a `docs/PLAN_MEJORAS.md` o a una tarea.

---

## Shelf (21/10/2026) — guarda de todo: música, pelis, series, libros

Estilo: editorial y «brutalista»: titulares enormes en mayúsculas condensadas, etiquetas en monoespaciada, fondo crema, collages recortados (cámara, iPod, DVD, libros). Muy reconocible.

| # | Pantalla | Qué hace | Qué nos llevamos | Dónde |
|---|---|---|---|---|
| S1 | **Plataformas** (pestaña propia) | Lista de plataformas con su logo, etiquetas de lo que trae cada una (TV SHOWS · MOVIES · BOOKS · SONGS…) y botón CONNECT. Abajo, «Conexiones activas» como fichas, y una línea de confianza: «Tus datos son tuyos». | Convertir Importar en **«Conectar»**: una lista de fuentes con lo que trae cada una y su estado (conectada / última sincronización). Primero las que van **solo con tu usuario** (Letterboxd, Goodreads, BGG, Last.fm) y OAuth donde exista (Trakt, Spotify); el archivo, como alternativa. | Importar → «Conectar tus apps» |
| S2 | Hoja «Conectar YouTube» | Los dos logos unidos, una frase de qué se importa y por qué, un solo botón grande. | Una hoja por fuente con esa estructura exacta: qué traemos, qué no, botón único. | ídem |
| S3 | **Arranque sin historial** | «Esta experiencia necesita tu historial» → conectar plataformas o «Buscar y añadir». Después, una cuadrícula de pósteres populares con «+» y un contador «faltan 3». | **Cuadrícula de «las que has visto»** en la bienvenida: 30-40 pósteres de lo más reconocible de tu país (sale de R) y tocas las que has visto. Es más rápido que el swipe para arrancar y alimenta el cerebro desde el minuto 1. | Onboarding, antes del primer mazo |
| S4 | **Inicio por estanterías** | Tarjetas por categoría (Artistas, Álbumes, Canciones, Pelis, Series, Libros) con un carrusel de portadas y la última obra. Vacías: icono + «Añadir series» y los logos de las fuentes que podrían llenarla. | Biblioteca con una tarjeta viva por estantería; la vacía invita a **conectar** o a **descubrir**, no solo un hueco. | Biblioteca |
| S5 | **Buscar/añadir** | Chips de categoría (TODO · PELIS · SERIES · LIBROS), «Búsquedas en tendencia ahora» cuando está vacío, **barra de búsqueda abajo** (al alcance del pulgar) con ✕. | Barra abajo, chips por estantería y tendencias de tu país cuando no has escrito nada. | AddFlow / buscador |
| S6 | **Recomendación por ánimo** | Portada → «¿Cómo estás ahora?» con 21 estados (aventurero, nostálgico, acogedor, melancólico, romántico…), eliges 1-3 → «¿Qué quieres que te recomiende?» (álbum, serie, peli, sorpréndeme). | Vocabulario de estados de ánimo como chips de 1-3 en Decidir, en vez de preguntas sueltas. Cada estado se traduce a ejes (MOTOR §8.2, `MOOD_AXES`). «Sorpréndeme» = cualquier estantería. | Decidir, primera pregunta |
| S7 | **Valorar lo reciente** | Portada → una obra cada vez, póster grande, estrellas (con medias), «1 de 3». | Flujo de valoración de una en una con progreso, para lo que marcas en tanda (imports, cuadrícula S3). | RatingFlow |
| S8 | **Ranking por niveles** | Arrastras cada póster a un nivel S/A/B/C/D; pide mínimo 7 obras. | **Ranking en dos pasos**: primero niveles (rápido, una decisión por obra), luego duelos A/B **solo dentro de cada nivel**. Menos comparaciones para el mismo orden, y es divertido. | Comparar |
| S9 | **Tarjeta para Story** con diseño temático | Tu semana como un iPod (canción top, lista, botón «Compartir en Instagram Story»), con 👍/👎 para afinar. | Tarjetas temáticas por estantería (taquilla, carátula de VHS, estantería de libros, caja de juego) y un resumen **semanal** para compartir. | Perfil → Compartir; aviso semanal |
| S10 | Barra inferior | 3 pestañas (Estantería, Flux, Plataformas) + botón «+» separado y grande. | Valorar un «+» flotante para añadir desde cualquier sitio. | TabBar (a decidir) |

## Popcorn (21/10/2026) — pelis y series, fondo negro

| # | Pantalla | Qué hace | Qué nos llevamos | Dónde |
|---|---|---|---|---|
| P1 | **Inicio** | Buscador arriba, «Pelis en tendencia» y «Series en tendencia» en cuadrícula de 3 con «Ver todo». Pestañas: Inicio, Sorpréndeme, Biblioteca, Series, Social. | Bloques «En tendencia en España» (sale de `trend.ES`) en Descubrir o Biblioteca. | Descubrir / Biblioteca |
| P2 | **Hoja de la obra** | Hoja que sube desde abajo: póster, categoría, título, año, nota, reparto, sinopsis y **4 acciones grandes en filas**: Añadir a mi lista · La he visto · Compartir · **Recomendar** (a un amigo). | Ficha rápida en hoja (sin salir de la pantalla) con acciones en filas grandes. **«Recomendar a un amigo»** como acción de primera. | ItemDetail / tarjeta |
| P3 | Hoja «La he visto» | Comentario opcional, «¿a qué lista?» y un botón. | Al marcar vista: estrellas + comentario opcional + lista, en una sola hoja. | RatingFlow |

---

## Achriom (21/10/2026) — artículo «best all-in-one media tracker»
Competidor directo: pelis, series, libros, música, anime, videojuegos y podcasts en una biblioteca.
- **Importa casi de todo:** Letterboxd (zip, CSV **o solo el usuario**), Goodreads, StoryGraph, IMDb, Trakt, Apple Music, AniList, Kitsu, MyAnimeList y «pegar una lista». **AniList, Kitsu y Trakt se sincronizan a diario** tras la primera importación.
- **Entrada:** búsqueda, enlace, escaneo de ISBN y **foto de una estantería o de cajas de juegos**.
- **«Bibliotecario» con IA** que responde sobre toda tu biblioteca («¿qué conecta mis pelis y libros favoritos?»), y un **retrato de gustos** entre formatos.
- Seguimiento de series por episodio y calendario de estrenos.
- Perfil privado por defecto; **exportación completa a CSV**. Gratis; Pro (9,99 $/mes) solo amplía la IA.
- **Blog y SEO muy trabajados** (visto por Igor): artículos de comparativa entre otras dos apps («X vs Y») en los que meten la suya, y guías tipo «el mejor tracker todo en uno». Es la forma de aparecer en Google y en las respuestas de los LLM cuando alguien pregunta por alternativas. A copiar cuando haya producto público (nombre decidido y dominio).
- **Bibliotecario con IA y conexión con ChatGPT/Claude:** muy buena idea para nosotros (el cerebro ya sabe responder «¿qué conecta lo que me gusta?»), con cuidado de coste por usuario y de no inventar datos. No sabemos cuántos usuarios ni de pago tienen.
- **Nuestra ventaja:** amigos reales con su puesto y comentario en cada tarjeta, swipe, ranking por duelos y Decidir. **Lo que nos llevamos:** sincronización continua, foto de estantería, exportarlo todo y el retrato de gustos (sale gratis del cerebro).

---

## Decisiones de Igor (21/10/2026)
- ❌ **Ranking por niveles (S8): no.**
- **Cuadrícula de «las que has visto» (S3):** como mucho en la bienvenida, nunca como acción principal; el swipe sigue siendo lo principal.
- ✅ **Lo mejor para empezar es conectar otra plataforma** y que se mantenga al día por API (como Spotify en Shelf). Conectar (S1/S2) con sincronización continua donde haya API (Spotify, Trakt) y por usuario donde haya feed público (Letterboxd, Goodreads, BGG, Last.fm); el archivo, como último recurso.
- **Diseño:** Shelf y Achriom se ven más limpios que nuestra app (mejor separación entre elementos, más legibilidad). Pendiente una pasada de limpieza visual.
- **Duelo A/B:** los pósteres salen cortados por la diagonal y con el título encima. Claude propone 3 alternativas (lado a lado, filas apiladas, cartas en abanico) e Igor elige.

## Prioridad actual
1. Conectar plataformas con sincronización (Spotify, Trakt, Letterboxd, Goodreads, BGG, Last.fm).
2. Nuevo diseño del duelo A/B (la propuesta que elija Igor).
3. Pasada de limpieza visual en toda la app.
4. Hoja de obra con «Recomendar a un amigo» (P2).
5. Estados de ánimo en chips en Decidir (S6).
