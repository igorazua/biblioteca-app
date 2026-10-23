# T18 — Conectar: que funcionen las plataformas importantes (23/10/2026)

> Encargo para Gemini. Diseño de base en `docs/CONECTAR.md`. Va después de T17. Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.

## Estado real (medido el 23/10)
`lib/connect/services.ts` lista 26 servicios, pero **solo funcionan de verdad unos 8**:
- **Con un archivo:** Netflix, IMDb, el ZIP de Letterboxd, el CSV de Goodreads y StoryGraph.
- **Con tu usuario:** Open Library y AniList; Letterboxd y Goodreads dependen de la función `biblio-connect`.
- **Apagados:** Spotify (falta `VITE_SPOTIFY_CLIENT_ID`) y **13 en «Próximamente»**.

Igor ve «solo 4». **Comprueba también que la versión de Vercel tenga la página Conectar nueva**; puede que siga desplegada la de Importar. No despliegues sin su OK.

## Lo que se puede hacer ya, sin claves (prioridad 1)
La idea: **casi todas las plataformas dejan descargar tus datos.** Se ofrece «Con un archivo» con instrucciones paso a paso y un parser por formato. Cada parser devuelve `ImportRow[]` y entra en el flujo de emparejar y revisar que ya existe.

| Servicio | Archivo que descarga el usuario | Qué traemos | Notas |
|---|---|---|---|
| **Spotify** (además de la conexión) | «Descargar tus datos» en privacidad de su cuenta: `StreamingHistory_music_*.json` (o el «historial ampliado», `Streaming_History_Audio_*.json`) | artistas con su número de escuchas → vistos; los 20 primeros, marcados como favoritos | Se sumen las reproducciones por artista. **Así Spotify funciona ya sin Client ID.** |
| **YouTube Music** | Google Takeout → «Historial de YouTube y YouTube Music» → `watch-history.json` | artistas con escuchas (entradas con `header: "YouTube Music"`; el artista va en `subtitles[0].name`, sin « - Topic») | Se suman las escuchas por artista |
| **YouTube** | El mismo `watch-history.json` | canales más vistos; de momento solo se guardan para el futuro (pódcasts), no entran en estanterías | Prioridad baja: parser hecho, sin estantería |
| **Apple Music** | privacy.apple.com → «Apple Media Services information» → `Apple Music Play Activity.csv` | artistas con escuchas | Formato: columnas `Artist Name`, `Song Name`, `Play Duration Milliseconds`… Comprueba las cabeceras con un ejemplo real |
| **Prime Video** | Amazon «Solicitar mis datos» → `Digital.PrimeVideo.Viewinghistory.csv` | pelis y series vistas con fecha | El correo con los datos tarda días: dilo en las instrucciones |
| **Kindle** | Amazon «Solicitar mis datos» → `Digital Items.csv` (o `Kindle.Devices.ReadingSession`) | libros | Ídem |
| **Disney+, Max, Movistar+, Filmin, SkyShowtime, Crunchyroll** | No dan exportación propia; solo la solicitud de datos de la ley (RGPD) por correo | — | Siguen en «Próximamente» con «Avísame», y una línea: «Mientras tanto, márcalas en Descubrir» |

Para cada archivo:
- **Instrucciones paso a paso** en la hoja, con el enlace directo a la página de descarga de cada servicio. Comprueba las URL actuales; no las escribas de memoria.
- **Tolerancia de formato:** acepta varias cabeceras posibles y archivos ZIP. Si el formato no se reconoce, el mensaje dice qué archivo esperábamos.
- **Tests** (zona de riesgo de datos): un ejemplo pequeño de cada formato en `lib/import/__fixtures__/` y un test por parser.

## Lo que necesita claves (prioridad 2, cuando Igor las pase)
| Servicio | Forma | Clave | Dónde la consigue Igor |
|---|---|---|---|
| **Spotify** | con tu cuenta, sincronización continua | `VITE_SPOTIFY_CLIENT_ID` | developer.spotify.com/dashboard (redirecciones: `https://biblioteca-social.vercel.app/conectar/spotify` y `http://127.0.0.1:5173/conectar/spotify`) |
| **Trakt** | con tu usuario o tu cuenta | `TRAKT_CLIENT_ID` | trakt.tv/oauth/applications/new |
| **Last.fm** | con tu usuario | `LASTFM_API_KEY` | last.fm/api/account/create |
| **MyAnimeList** | con tu usuario | `MAL_CLIENT_ID` | myanimelist.net/apiconfig |
| **BoardGameGeek** | con tu usuario | registro de la aplicación | boardgamegeek.com/applications (solo no comercial; puede tardar) |

- Los conectores van en `supabase/functions/biblio-connect` (servicios `trakt`, `lastfm`, `mal`, `bgg`), con las claves en sus secretos y **nunca en el navegador**.
- Mientras no haya clave, el servicio sale como «Muy pronto», nunca roto.

## Orden de la lista en la página
Arriba, lo más usado en España: **Netflix, Spotify, Prime Video, Letterboxd, Goodreads, YouTube Music, IMDb, Kindle**. Después, el resto.

## Hecho cuando
- Spotify (archivo), YouTube Music, Apple Music, Prime Video y Kindle importan con un archivo de ejemplo de verdad hasta la pantalla de revisar.
- La página enseña cada servicio con su forma real: ninguno «Próximamente» si ya tiene archivo.
- Los tests de los parsers pasan y `tsc` está limpio.
- La versión desplegada (con el OK de Igor) es la de Conectar.
