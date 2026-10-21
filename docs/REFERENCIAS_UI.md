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

## Lo que más valor tendría (propuesta de Claude, por orden)
1. **S3, cuadrícula de «las que has visto»** al empezar: cero fricción y el mejor dato para R y el cerebro.
2. **S1/S2, Conectar en vez de Importar**, empezando por las fuentes que solo piden tu usuario.
3. **S8, ranking por niveles y después duelos dentro del nivel.**
4. **P2, hoja de obra con «Recomendar a un amigo».**
5. **S6, estados de ánimo en chips** en Decidir.
