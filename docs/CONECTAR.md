# CONECTAR — Importar desde otras apps y mantenerlo al día

> 22/10/2026. Decisión de Igor: la mejor forma de empezar es **conectar otra plataforma** y que la biblioteca se mantenga al día sola (como Spotify en Shelf). La página Importar pasa a ser **Conectar**, con todos los servicios posibles (los de Shelf, Popcorn y Achriom). Referencias en `docs/REFERENCIAS_UI.md`.
> Lo que dice este documento sobre cada servicio está escrito de memoria a 10/2026: **compruébalo en su documentación oficial antes de programarlo** y anota aquí lo que cambie.

## 1. Cuatro formas de conectar (de mejor a peor)
| Forma | Cómo lo vive el usuario | Se mantiene al día | Etiqueta en la app |
|---|---|---|---|
| **Con tu cuenta** (OAuth) | botón «Conectar», da permiso en la otra app y vuelve | **sí**, sola (refrescando el token) | «Con tu cuenta» |
| **Con tu usuario** (perfil público) | escribe su usuario | **sí**, leemos su perfil público cada día | «Con tu usuario» |
| **Con un archivo** | descarga su historial y lo sube | no (se puede repetir) | «Con un archivo» |
| **Próximamente** | sin forma oficial de sacar los datos | — | «Próximamente» (con «Avísame») |

**Nunca pedimos la contraseña de otra app** ni entramos por el usuario en su cuenta: incumple sus condiciones y nadie debería fiarse de una app que lo hace.

## 2. Servicios
| Servicio | Estanterías | Forma | Qué traemos | Notas para programarlo |
|---|---|---|---|---|
| **Spotify** | artistas | Con tu cuenta | artistas más escuchados (4 semanas, 6 meses, años), artistas seguidos, álbumes guardados | OAuth **PKCE en el navegador** (sin servidor). Permisos `user-top-read user-follow-read user-library-read`. ⚠️ En modo desarrollo, Spotify solo deja entrar a **25 usuarios dados de alta a mano**; para abrirlo hay que pedir la ampliación de cuota. |
| **Trakt** | pelis, series | Con tu cuenta / con tu usuario | vistas con fecha, valoraciones, lista de pendientes | API gratuita con `client_id`. Perfil público sin OAuth; OAuth (código de dispositivo o redirección) para perfiles privados. |
| **Letterboxd** | pelis | Con tu usuario + archivo | **usuario:** el diario reciente (RSS `letterboxd.com/<usuario>/rss/`, ~50 últimas con nota y fecha). **Archivo:** todo el histórico (ZIP, ya soportado) | La API oficial es privada (hay que solicitarla). El RSS necesita servidor (CORS). |
| **Goodreads** | libros | Con tu usuario + archivo | **usuario:** estanterías por RSS (`goodreads.com/review/list_rss/<id>?shelf=read` y `to-read`), que necesita el **id numérico** del perfil; la app lo saca de la URL de su perfil. **Archivo:** CSV completo (ya soportado) | La API cerró en 2020. RSS con servidor (CORS). |
| **StoryGraph** | libros | Con un archivo | CSV de exportación | Formato distinto al de Goodreads: parser propio. |
| **Open Library** | libros | Con tu usuario | registro de lectura público (`/people/<usuario>/books/already-read.json`, `want-to-read`) | API abierta, sin clave. |
| **Last.fm** | artistas | Con tu usuario | artistas más escuchados por periodos | API key gratuita (`user.getTopArtists`). |
| **AniList** | series (anime) | Con tu usuario | lista vista y pendiente | GraphQL público, sin clave. |
| **MyAnimeList** | series (anime) | Con tu usuario | lista vista y pendiente | API con `client_id` gratuito. |
| **BoardGameGeek** | juegos | Con tu usuario | colección (lo tiene, lo jugó, lo quiere) | API XML de la colección. ⚠️ Desde 2025 exige registrar la aplicación y es **solo para uso no comercial**. |
| **Netflix** | pelis, series | Con un archivo | historial completo | Ya soportado (CSV de «Actividad de visionado»). |
| **IMDb** | pelis, series | Con un archivo | valoraciones y lista de pendientes | Ya soportado (CSV). |
| **YouTube** | (canales; futuro: pódcasts) | Con tu cuenta | canales suscritos, vídeos con «me gusta» | OAuth de Google + YouTube Data API. **El historial no está en la API** (solo por Google Takeout). Prioridad baja. |
| **YouTube Music** | artistas | Con un archivo | historial de escuchas | No hay API: Google Takeout (JSON). Parser del archivo. |
| **Prime Video** | pelis, series | Con un archivo (lento) | historial | Solo con la «Solicitud de tus datos» de Amazon (tarda días). Instrucciones paso a paso. |
| **Kindle** | libros | Con un archivo (lento) | biblioteca | Igual que Prime Video (datos de Amazon). |
| **Apple Music** | artistas | Próximamente | — | MusicKit pide cuenta de Apple Developer (de pago). |
| **Disney+**, **Max**, **Movistar Plus+**, **Filmin**, **Crunchyroll**, **SkyShowtime** | pelis, series | Próximamente | — | Sin API ni exportación. Se ofrece «Avísame» y, mientras, el swipe. |

## 3. Cómo se programa
### 3.1 Página «Conectar» (sustituye a «Importar»; `/importar` redirige a `/conectar`)
- Arriba, **«Tus conexiones»**: fichas de las conectadas con la última sincronización y un botón «Sincronizar ahora» (estilo Shelf S1).
- Debajo, **todas las plataformas agrupadas por estantería** (Pelis y series · Libros · Música · Juegos · Anime). Cada fila lleva el icono de la plataforma (cuadrado de color con su inicial; nada de logos con marca registrada por ahora), su nombre, las etiquetas de lo que trae («PELIS», «SERIES», «LIBROS», «ARTISTAS»…), la etiqueta de la forma y su botón:
  - **Con tu cuenta** → «Conectar»;
  - **Con tu usuario** → abre una hoja con un campo «Tu usuario de X», un ejemplo de dónde encontrarlo y el botón «Conectar»;
  - **Con un archivo** → la hoja con los pasos que ya existen y «Subir archivo»;
  - **Próximamente** → «Avísame» (guarda el interés en `biblio_events`).
- Hoja de conexión (estilo Shelf S2): los dos logos unidos, una frase de qué traemos y qué no, y una línea de confianza: «Solo leemos lo que nos dejes. Puedes desconectarlo cuando quieras».
- Lo importado entra por el **flujo que ya existe**: filas `ImportRow[]` → emparejar con el catálogo → revisar dudosas → aplicar (`lib/import/*`). Cada conector solo tiene que devolver `ImportRow[]`.

### 3.2 Conectores
- `app/src/lib/connect/<servicio>.ts`, uno por servicio, todos con la misma interfaz:
  ```ts
  interface Connector {
    id: string
    method: 'oauth' | 'username' | 'file' | 'soon'
    shelves: ShelfType[]
    fetchRows(conn: Connection): Promise<ImportRow[]> // username/oauth
    parseFile?(file: File): Promise<ImportRow[]>       // file
  }
  ```
- **Servidor** (para los RSS y para no exponer claves): nueva función de Supabase `supabase/functions/biblio-connect/` con `?service=letterboxd|goodreads|lastfm|trakt|bgg|anilist|mal&user=…`. Pide los datos, los normaliza a `ImportRow[]` y los devuelve. Las claves (`TRAKT_CLIENT_ID`, `LASTFM_API_KEY`, `MAL_CLIENT_ID`, `BGG_TOKEN`) van en los secretos de la función, nunca en el navegador.
- **Spotify** sin servidor: `lib/connect/spotify.ts` con PKCE, `VITE_SPOTIFY_CLIENT_ID` en `.env.local`, redirección a `/conectar/spotify`; el token y el de refresco se guardan en el móvil (store) y, con cuenta, en `biblio_connections`.

### 3.3 Mantenerlo al día
- Tabla nueva `biblio_connections` (`user_id`, `service`, `handle`, `token` cifrado si hay, `last_sync`, `status`), con RLS: cada usuario solo ve las suyas.
- **Al abrir la app**, si una conexión lleva más de 24 h sin sincronizar, se sincroniza en segundo plano. Lo nuevo entra **directamente** (vistas → vistas, pendientes → pendientes) y lo dudoso se queda en una bandeja «Por revisar» en Conectar. Un aviso discreto: «3 pelis nuevas de Letterboxd».
- Nunca se borra nada en Biblioteca porque haya desaparecido de la otra app.

## 4. Orden
1. Página Conectar con todos los servicios y sus etiquetas, y los de archivo que ya funcionan (Netflix, IMDb, Letterboxd, Goodreads), más el parser nuevo de StoryGraph.
2. **Con tu usuario:** Letterboxd, Goodreads, Open Library, AniList (los dos últimos no necesitan clave). Función `biblio-connect`.
3. **Spotify** (con tu cuenta, PKCE).
4. Trakt, Last.fm, MyAnimeList, BGG (necesitan clave gratuita).
5. Sincronización diaria y `biblio_connections`.
6. YouTube, YouTube Music (Takeout), Prime Video y Kindle (petición de datos).

## 5. Lo que tiene que hacer Igor (nadie puede hacerlo por él)
- **Spotify:** crear una app en developer.spotify.com, añadir como URI de redirección `http://localhost:5173/conectar/spotify`, `http://192.168.1.55:5173/conectar/spotify` y la de Vercel, y pasar el **Client ID** (no es secreto). Dar de alta a los probadores (máx. 25) hasta pedir la ampliación.
- **Claves gratuitas:** Trakt (`client_id`), Last.fm (API key), MyAnimeList (`client_id`) y BGG (registro de la aplicación).
- **Supabase:** dar el OK para la migración de `biblio_connections` y para desplegar la función `biblio-connect`.
