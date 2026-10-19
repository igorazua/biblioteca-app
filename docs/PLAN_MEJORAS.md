# PLAN_MEJORAS — Mejoras tras revisar la app (v1, 19/10/2026)

> Para quien construya (Gemini en Antigravity). Sale de recorrer la app como usuario nuevo el 19/10/2026 y de las decisiones de Igor.
> Reglas del repo: `docs/SISTEMA_BETA.md` §0 (tests con moderación, claves fuera del repo, no desplegar sin Igor).

## 0. Regla nueva: NO hay API de TMDB
- No existe clave de TMDB ni se va a pedir. **Nada puede depender de `api.themoviedb.org`.**
- Fuentes sin clave:
  - **Pelis y series**: Wikidata (búsqueda `wbsearchentities` + SPARQL; título y géneros en español; IMDb ID en P345).
  - **Series**: TVmaze (`api.tvmaze.com`, sin clave; pósteres incluidos; datos CC BY-SA, citar).
  - **Libros**: Open Library.
  - **Música**: MusicBrainz.
- Los `tmdbId` de la semilla se conservan como dato, pero no se usan para llamar a TMDB.

## 1. Lo que hay que arreglar primero

### 1.1 Catálogo vivo sin TMDB (`supabase/functions/biblio-catalog/index.ts`)
- Quitar TMDB de `search` y `resolve`:
  - movie/series → Wikidata;
  - series → además, TVmaze para el póster.
- Identificador externo de pelis y series: `wikidata_id` (QID), con índice único `(type, wikidata_id)` en `biblio_catalog` (migración nueva). Se mantiene la regla de no crear obras desde texto libre.
- Imports: IMDb `tconst` → Wikidata por P345; Letterboxd → título + año en Wikidata; Netflix → título en español en Wikidata/TVmaze.
- `AddFlow.tsx` e `Import.tsx`: quitar cualquier referencia a TMDB.
- Perfil → Fuentes: quitar la atribución de TMDB y añadir TVmaze.

### 1.2 Portadas
- **Problema:**
  - ~450 pelis y ~410 series tienen como «póster» una foto de Wikimedia que no es un póster (E.T. → figura de cera, Regreso al futuro → recorte del logo, El padrino → logo SVG).
  - ~500 pelis enlazan imágenes de `m.media-amazon.com` (IMDb), sin permiso de uso.
- **Arreglo:**
  - Series: póster de TVmaze (ya hay 581).
  - Pelis: póster de Wikidata solo si es de verdad un póster (propiedad P3383 «film poster»).
  - Si no hay póster legal: **portada tipográfica generada** en `components/Poster.tsx` con título, año y creador, en el color de la estantería y un fondo con textura. Debe verse intencionada, no como un hueco.
- **Script** `app/scripts/fix-posters.mjs`: limpia `posterUrl` en la semilla y en `biblio_catalog`. Quita las de Wikimedia que no vengan de P3383 y las de Amazon, y rellena con TVmaze o P3383.
- **Decisión de Igor pendiente:** quitar ya las de Amazon (más legal, más portadas generadas) o mantenerlas durante la beta privada.

### 1.3 Catálogo en español
- **Géneros:** mapa fijo inglés→español en `scripts/engine/genres-es.mjs` (Drama→Drama, Comedy→Comedia, Sci-Fi→Ciencia ficción, Crime→Crimen, Adventure→Aventura, Biography→Biografía, Film-Noir→Cine negro, War→Bélica…), aplicado a la semilla y a `biblio_catalog`. Hoy el 90 % de pelis y series lo tiene en inglés y los filtros de Decidir se confunden.
- **Títulos:** etiqueta `es` de Wikidata (`rdfs:label@es`) cuando exista; si no, se deja el original. Ejemplo: «Back to the Future» → «Regreso al futuro».
- **Sinopsis:** se mantienen; ya están en español.

### 1.4 Errores honestos (aprobado, F)
- La búsqueda distingue «no existe» de «no he podido buscar»: «No he podido conectar con el catálogo. Reintentar».
- Lo mismo en sincronización e imports: un aviso visible con la causa y «Reintentar», nunca un silencio ni un vacío engañoso.

### 1.5 Fallos menores
- El contador «Te quedan N en Pelis» no baja al marcar una obra.
- Comparar enseña «Comparación 1 / 7» encima del estado vacío.
- Sin cuenta, los amigos de ejemplo («Carlos la ha visto») parecen reales: marcarlos «de ejemplo» o no mostrarlos.

## 2. Onboarding de verdad
**Por qué:** quien entra no sabe qué es la app ni qué significan los gestos.

Pantallas (deslizables, con «Saltar» siempre visible y puntos de progreso):
1. **Qué es:** «Tus pelis, series, libros, música y juegos en estanterías. Lo que te ha formado, ordenado por ti.» Con una ilustración de estanterías.
2. **Los 3 gestos, practicando:** una tarjeta de ejemplo de verdad que el usuario desliza.
   - ← no me interesa · → la he visto · ↑ (o botón azul) pendiente.
   - Cada gesto completado se marca ✓. No se avanza hasta probar los tres o pulsar «Saltar».
3. **Tu ranking:** animación de dos pósteres enfrentados: «No pones notas: eliges entre dos y la app ordena tu lista».
4. **Amigos:** las caras de amigos sobre una tarjeta: «Ves qué han visto tus amigos y qué puesto le dan».
5. **Cómo empezar:** las 3 opciones actuales (Entrar con Google · Importar mis listas · Explorar sin cuenta), cada una con su explicación.
6. Después, solo si eligió explorar o entró: **elegir estanterías que te interesan** (por defecto, todas). Las preferencias de año y plataformas pasan a preguntarse en Decidir la primera vez.

- Se guarda `onboardingDone` en `useStore`. «Ver tutorial otra vez» queda en Ajustes.
- Animaciones de entrada suaves (ver §5) y respeto de `prefers-reduced-motion`.

## 3. Perfil y Ajustes separados (aprobado, D)
- **Perfil** (`screens/Profile.tsx`, lo que ven los demás): foto, nombre y @usuario, «Lo que más me marcó» (top 3 por estantería), mis números, amigos e invitar, compartir enlace y tarjeta para story. Engranaje arriba a la derecha → Ajustes.
- **Ajustes** (nuevo `screens/Settings.tsx`, ruta `/ajustes`):
  - **Cuenta y nube:** entrar, sincronizar, cerrar sesión, borrar cuenta.
  - **Importar listas:** se mueve aquí desde Biblioteca; también un acceso en Perfil.
  - **Preferencias:** plataformas, año de nacimiento, valorar al guardar, comentario al comparar.
  - **Avisos:** ver §4.
  - **Ayuda:** ver tutorial, enviar feedback.
  - **Fuentes y atribución.**
  - **Zona de pruebas:** plegada; cargar datos de ejemplo, reiniciar demo.
- `Profile.tsx` (772 líneas) se trocea en componentes; sin cambiar la lógica.

## 4. Importar fuera de la cabecera
- Quitar el botón «Importar» de la cabecera de Biblioteca (`screens/Library.tsx`).
- Accesos que quedan: onboarding (opción 2), Ajustes → Importar, Perfil, y las estanterías vacías (tarjeta «Trae tus pelis de Letterboxd o IMDb»).
- Además, un recordatorio de §5 mientras el usuario no haya importado nada.

## 5. Recordatorios para empujar lo que el usuario no hace
**Idea:** pequeños avisos que empujan la siguiente acción útil según lo que el usuario **no** ha hecho todavía. Nunca más de uno a la vez; cada uno se puede cerrar.

### 5.1 Motor de recordatorios (`src/lib/nudges.ts`, puro y con tests: decide qué se muestra)
- Entrada: estado de `useStore`, `useAuth` y `useEvents` (vistas, imports, amigos, días de uso, último aviso).
- Salida: el aviso con más prioridad que toque, o ninguno.

| Id | Cuándo | Mensaje (ejemplo) | Acción |
|---|---|---|---|
| `login` | Sin cuenta y ≥ 5 obras guardadas | «Tus 23 obras solo viven en este móvil. Entra para no perderlas.» | Entrar con Google |
| `import` | Nunca importó y < 30 obras en una estantería de pelis/series/libros | «¿Tienes tus pelis en Letterboxd o IMDb? Tráelas en 1 minuto.» | Importar |
| `explore` | Una estantería sin tocar con ≥ 10 en otra | «Aún no has mirado Libros. ¿Probamos 10 tarjetas?» | Ir a Descubrir en esa estantería |
| `rank` | ≥ 5 vistas sin colocar | «Tienes 6 sin colocar en tu ranking. 1 minuto de duelos.» | Ir a Comparar |
| `invite` | Con cuenta, 0 amigos y ≥ 15 obras | «Invita a alguien y mirad vuestra afinidad.» | Compartir invitación |
| `decide` | ≥ 10 pendientes y nunca usó Decidir | «Tienes 14 pendientes. ¿Te ayudo a elegir una?» | Decidir |
| `install` | Móvil, PWA sin instalar, 2.º día de uso | «Añádela a tu pantalla de inicio para abrirla como una app.» | Instrucciones de instalación |

Reglas:
- Prioridad en el orden de la tabla (`login` primero: es el riesgo de perder datos).
- Tras cerrar uno, no vuelve hasta 3 días después; tras 3 cierres, no vuelve nunca.
- Máximo 1 aviso por sesión en la app.
- Eventos: `nudge_shown`, `nudge_tap`, `nudge_dismiss` con su id, para medir cuáles sirven.

### 5.2 En la app
Componente `NudgeCard` arriba de Biblioteca y, en Descubrir, como tarjeta dentro del mazo (cada ~15 tarjetas), con el estilo de la paleta y entrada animada.

### 5.3 Notificaciones (web push)
- **Funciona en:** Android (Chrome) siempre; iPhone solo con la PWA instalada en la pantalla de inicio (iOS 16.4+). Por eso existe el aviso `install`.
- **Permiso:** pedirlo solo después de un momento de valor (p. ej. al guardar la décima obra), con una pantalla propia que explique antes del diálogo del sistema. Nunca al abrir la app.
- **Técnica:**
  - Claves VAPID en los secrets de Supabase.
  - Tabla `biblio_push_subs` (endpoint, keys, `device_id`, `user_id` opcional, porque también vale sin cuenta).
  - Función `biblio-push-send`.
  - `pg_cron` diario que evalúa las mismas reglas de `nudges.ts`, con el estado resumido que el cliente sube a `biblio_push_subs`, para no depender de la cuenta.
- **Límite:** como mucho 2 notificaciones por semana, nunca entre las 22:00 y las 9:00 hora de España.
- **Ajustes → Avisos:** interruptor general y uno por tipo.

## 6. Pulido de animaciones (aprobado)
Con framer-motion y respetando `prefers-reduced-motion`:
- **Swipe:**
  - inclinación proporcional al arrastre;
  - sello (✓ / ✕ / 🔖) que aparece según la distancia;
  - vuelta con muelle si no se completa;
  - salida con inercia.
- **Botones del mazo:** pulsación (`scale 0.92`) y un destello del color del gesto.
- **Póster que vuela** de la tarjeta o la lista a la ficha (`layoutId`).
- **Cambio de pestaña:** fundido corto (≤ 150 ms). Revisar por qué el cambio de pestaña tardó ~1-2 s en desarrollo; medirlo en `npm run build-preview` antes de tocar nada.
- **Carga:** esqueletos en listas y pósteres en vez de huecos negros (la primera tarjeta salió negra mientras cargaba la imagen).
- **Hojas** (valorar, añadir): entrada con muelle y arrastre para cerrar con resistencia.
- **Comparar:** el ganador crece y el perdedor se aparta; al terminar la tanda, celebración discreta en el color de la estantería.
- **Recordatorios y avisos:** entrada desde arriba con muelle; salida al deslizar.
- **Vibración corta** al confirmar (`navigator.vibrate?.(10)`, solo Android).

## Orden propuesto
1. §1 (catálogo sin TMDB, portadas, español, errores, fallos menores). Imprescindible antes de pasar el enlace.
2. §3 y §4 (Perfil/Ajustes, importar fuera de la cabecera). Rápido.
3. §2 (onboarding).
4. §5.1 y §5.2 (recordatorios en la app).
5. §6 (animaciones).
6. §5.3 (notificaciones push).

## Descartado por ahora
Entrar directo al swipe sin onboarding, swipe sin hoja de valoración, pestaña Amigos en lugar de Comparar, invitación tras la décima vista (queda solo como recordatorio `invite`).
