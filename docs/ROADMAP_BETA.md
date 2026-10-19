# Hoja de ruta — de la demo a la beta (17/10/2026)

> ⚠️ **19/10/2026: NO hay API de TMDB.** Todo lo que este documento dice de TMDB queda sustituido por Wikidata + TVmaze (ver `docs/PLAN_MEJORAS.md` §0 y §1.1).

> Dos objetivos distintos:
> - **Beta con amigos**: la PWA actual, abierta a quien tenga el enlace, para aprender de uso real. Es lo que se construye ahora.
> - **Lanzamiento público / tiendas**: más adelante, puede ser otra app (nativa) con nombre propio.
>
> El diseño técnico de la beta, listo para construir, está en `docs/SISTEMA_BETA.md`.

---

## A. Beta con amigos (ahora)

Decisiones tomadas con Igor:
- **Supabase**: se queda en el proyecto compartido (`pvewnpemlwmvaduzhjso`, tablas `biblio_*`). Se separará cuando la app crezca.
- **Sin nombre ni dominio definitivos**: se sigue en `biblioteca-social.vercel.app`.
- **Registro libre**: cualquiera con el enlace entra; la invitación sirve para hacerse amigo, no para dar acceso.

| # | Qué | Por qué | Prioridad |
|---|---|---|---|
| B1 | **Catálogo vivo** en el servidor: buscar en TMDB / Open Library / MusicBrainz y guardar la obra en un catálogo compartido. Sin IA. Ver §B1 abajo. | Con 4.276 obras dentro de la app, casi cualquier búsqueda falla, y los imports necesitan casar contra un catálogo grande. | 🔴 Primero |
| B2 | **Cuentas básicas**: arreglar el borrado, @usuario único, la foto de Google por defecto, pasar a la nube lo que había en local. | Ya existe el login; faltan piezas para que sea fiable. | 🔴 |
| B3 | **Aviso de nueva versión** en la PWA («Hay una versión nueva · Actualizar»). | Ahora se actualiza en silencio y los amigos se quedan con versiones viejas. | 🔴 |
| B4 | **Importar listas** (orden: Letterboxd, IMDb, Goodreads/StoryGraph, Netflix; después Last.fm). | La estantería no empieza vacía; lo importado sin nota entra como «vista sin colocar» y se ordena con los duelos A/B. | 🟠 |
| B5 | **Foto de perfil** subida por el usuario (Supabase Storage, recortada a 256 px en el móvil). | Las caras de los amigos son el corazón de la tarjeta. | 🟠 |
| B6 | **Botón «Todas»** en los selectores de plataformas (Onboarding, Perfil, Decidir). | Pedido por Igor. | 🟠 (rápido) |
| B7 | **Mejora visual**: paleta, formas y micro-gestos (ver §B7). | La primera impresión con amigos. | 🟠 |
| B8 | **Tarjetas para compartir** en stories (top 5 o una lista como imagen). | Crecimiento boca a boca. | 🟡 |

**Secundario en la beta** (solo si sobra tiempo): registro de errores (Sentry o similar), botón de feedback, pruebas de punta a punta, panel de métricas con los eventos de `biblio_events`.

### B1. Catálogo vivo: cómo evita duplicados y títulos mal escritos
- **Nunca se crea una obra a partir de texto libre.** Al buscar a mano, el usuario elige entre resultados de TMDB, Open Library o MusicBrainz, que ya traen su identificador externo. Si escribe mal el título, simplemente no aparece nada o aparece la obra correcta.
- El servidor guarda la obra **por su identificador externo** (`tmdb`, `olwork`, `mbid`…), con una restricción única: si dos usuarios añaden la misma, es la misma fila.
- Los imports pasan por el mismo paso «resolver a identificador externo». Lo dudoso se le enseña al usuario para que lo confirme.
- **No hace falta IA.** Se ejecuta en el servidor (Supabase Edge Function), que es quien guarda las claves de TMDB. La IA queda como ayuda opcional para casar títulos de Netflix muy ambiguos.
- El enriquecimiento (ejes, vectores, vecinos) llega después, por lotes, con los scripts `engine:*` que ya existen; mientras tanto la obra funciona con lo básico.

### B7. Propuestas de paleta
Contraste medido sobre el fondo de cada propuesta (AA = 4,5 o más para texto).

**1 · «Biblioteca de noche»** — evolución de la actual: cálida, de lámpara de lectura. Riesgo bajo.
| Token | Hex | Contraste |
|---|---|---|
| bg | `#100E0C` | — |
| surface | `#1A1816` | — |
| ink | `#F4EFE6` | 16,8 |
| mute | `#A39D92` | 7,2 |
| accent (ámbar) | `#F2B04A` | 10,2 |
| secundario (terracota) | `#D9714E` | 5,9 |

**2 · «Papel y tinta»** — clara, editorial, de librería independiente. Diferencia mucho frente a las apps oscuras de cine.
| Token | Hex | Contraste |
|---|---|---|
| bg (crema) | `#F6F1E7` | — |
| surface | `#FFFDF8` | — |
| ink | `#1E1B16` | 15,2 |
| mute | `#6E675C` | 5,0 |
| accent (burdeos) | `#9E2B3A` | 6,5 |
| secundario (mostaza) | `#B5832A` | 3,0 → solo decorativo o texto grande |

**3 · «Sesión de cine»** — oscura y viva, más juvenil y social.
| Token | Hex | Contraste |
|---|---|---|
| bg (azul noche) | `#0C0C14` | — |
| ink | `#EDEDF5` | 16,7 |
| mute | `#8D8CA3` | 5,9 |
| accent (coral) | `#FF6B5B` | 7,0 |
| secundario (lila) | `#9D8CFF` | 7,1 |
| éxito (menta) | `#4FD1A5` | 10,2 |

Recomendación: **1 como base** con un **color por estantería**, todos por encima de 6,9 sobre `#100E0C`: pelis ámbar `#F2B04A` (10,2), series coral `#FF6B5B` (6,9), libros rosa `#E37D8C` (7,0; el burdeos de la paleta 2 da 2,6 sobre fondo oscuro y no vale), música lila `#9D8CFF` (7,0), juegos menta `#4FD1A5` (10,1) para que cada estantería se reconozca de un vistazo, y modo claro inspirado en la 2 más adelante.

**Formas y movimiento:** radios de 20 px en tarjetas y 999 px en chips; sombras de profundidad en el mazo; el sello aparece mientras arrastras y la tarjeta vuelve con muelle; el póster «vuela» de la tarjeta a la ficha (`layoutId`); esqueletos de carga; celebración al terminar una tanda de duelos; vibración corta al confirmar (solo Android).

---

## B. Más adelante (antes del lanzamiento público)

| Qué | Notas |
|---|---|
| **Nombre y dominio (D17)** | Antes de la ficha de tienda y de la identidad visual definitiva. |
| **Supabase propio** | Migrar las tablas `biblio_*` con las migraciones versionadas que se crean en la beta. |
| **Legal completo** | Privacidad, términos, edad mínima (14 en España), descargar mis datos. Las atribuciones de TMDB / Open Library / MusicBrainz se ponen ya en la beta. |
| **Moderación** | Denunciar comentarios y bloquear usuarios; Apple la exige con contenido de usuarios. |
| **Notificaciones** | Con la app nativa: en iPhone, las de la PWA solo funcionan instalada. |
| **Dónde verla** | Aparcado («meh»). |
| **App nativa** | React Native con Expo: reaprovecha `lib/engine`, ranking, stores y tipos; swipe con gesture-handler + reanimated. Extensión de compartir («Compartir → app» desde Netflix o IMDb), widgets e iniciar sesión con Apple. Desde ya: que `lib/engine` no dependa del navegador. |
| **Ingesta con IA (D13)**, Wrapped anual, perfil de gustos, contactos e Instagram (D20), estanterías del lanzamiento (D11), inglés | Ver `docs/IDEA.md`. |
| **FilmAffinity** | Sin exportación oficial; raspar está prohibido. Como mucho, aceptar un CSV que aporte el usuario. Decisión pendiente. |
| **Juegos de mesa en vivo** | La API de BGG exige registro y es no comercial; decidir antes de usarla. |
