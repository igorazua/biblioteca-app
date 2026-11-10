# NOTAS PARA LA FASE 2 — lo que dejó la fase 1

> 05/11/2026. Rama `native/fase-1`, especificación `web-congelada-v1`. Leer junto a `docs/DECISIONES_NATIVA.md` y `docs/MEDIDAS_NATIVA.md`.
> **La fase 2 no empieza hasta que Igor dé su veredicto de la prueba en el móvil.**

## Cómo se usa `@biblioteca/core`

La app carga los datos y se los entrega al paquete; el paquete no lee nada por su cuenta.

- **Catálogo:** `setCatalogIndex`, `setShelfCatalog`, `setLiveItems` (la caché viva, antes `useCatalog.items`) y `subscribeCatalog` (sustituye a `useCatalog.version++`). `setSeedChecker` ya no existe: usar `isSeedItem`.
- **Alias:** llamar a `setAliases` antes de usar `canonicalId`.
- **Motor:** `setShelfEngine(shelf, data)`, `setCrossEngine(raw)`, `setShelfAnchors(shelf, file, tree)`, `isShelfEngineLoaded(shelf)`, `engineLoadOrder(first?)`. Tras cargar un motor, la app recalcula los vectores de usuario (antes lo hacía `ensureShelfEngine`).
- **Canciones:** `setSongs(items)` respeta `SHELF_ENABLED.song`.
- **Eventos:** `EngineEvent` y `EventType` están en `lib/engine/events.ts`.
- **Otros:** `userLang(profileLang)` recibe el idioma. `duelCardSize` recibe el modo, por defecto `area`. `parseFile` recibe `string | Uint8Array`.
- **Exportaciones:** Decidir v1 está en `decideV1`; `lib/reader.Question` se exporta como `ReaderQuestion`.

## Decidir: ojo con las obras dudosas

`DecideInput` recibe `doubtfulItems?` y `passedItems?`, y los estados los devuelven. Tras cada `skipDuelUnknown` la app guarda `state.passedItems` y `state.doubtfulItems`.

**Riesgo para el 1:1:** la PWA nunca pasa `doubtfulItems` a `initDecideSession`: se leían de `localStorage` dentro de `decide.ts`. Si la nativa los pasa al iniciar, en v2 `recog` les aplica ×0,5 desde el principio, y la PWA no hace eso. Hay que leer cómo usa cada función esas listas en `web-congelada-v1` y reproducir el mismo efecto. Añadir un test de igualdad con almacenamiento lleno.

## Tests y módulos que faltan por llevar

- **Con los stores (fase 2):** `data/catalog.test.ts` («shelfOf no devuelve movie…», «arranque en frío…»), `data/songs.test.ts` («con el interruptor apagado…»), `lib/ranking.test.ts` («deshacer quita el registro del duelo», «la migración del store conserva…», «migrateStore v5 repara…»).
- **Con `lib/sync` (fase 3):** `sync.test.ts` y la parte de `mergeCloudAndLocal` de `aliases.test.ts`.
- **Con los conectores (fase 4):** `lib/connect/services.ts`, retirado de core porque depende de `anilist`, `openlibrary`, `server` y `spotify`.

## Andamiaje de la fase 1 (se sustituye)

- El hub de Descubrir (D1) no está hecho: los chips de estantería y de tipo de duelo son de prueba.
- El mazo usa `nextCards` con perfil, entradas y amigos vacíos. Sin burbujas de amigos y sin canciones.
- Decidir y Perfil solo muestran su título. La ficha `i/[id]` es mínima.
- El vuelo del póster sale solo del mazo y no vuelve (al volver, fundido).

## Elegido por el agente sin decisión expresa (revisar con Igor)

- Póster de la ficha: ancho máximo 260 (320 si es apaisado).
- Leyenda D3: «→ vista · ↑ pendiente · ← no me interesa»; contador guardado en AsyncStorage.
- Conservado el pequeño «tick» al cruzar el umbral del mazo.
- `blurRadius` 24 de expo-image en lugar de `blur-xl`; títulos del duelo sin desenfoque; sin brillo de carga; resplandor de la carta elegida solo en iOS.

## Riesgos sin comprobar en un móvil

- Lectura de los `.data` con expo-asset y `File` en Expo Go. Es el mayor riesgo de arranque; si falla, `_layout` muestra el error.
- Fluidez, muelles y vibración.
- Texto SVG con `Fraunces144-800`, sobre todo en Android.
- `measureInWindow` en el vuelo del póster con Android a borde completo.
- `zIndex` animado en las cartas del duelo, `resizeMode="repeat"` del grano en Android, y `BlurView` con intensidad 45.
- Tiempo de análisis de los JSON. Cargar estanterías mientras se hace swipe puede retrasar la vibración.

## Cuestiones técnicas

- **`expo-doctor` da 19/20:** aviso de `react` duplicado (`react-dom ^19.3.1`, peer de la raíz, sube el `react` elevado a 19.3.1; `apps/native` usa 19.3.0). Probado sin éxito: `overrides` en la raíz y fijar `react-dom`. El bundle lleva una sola copia gracias a `resolveRequest` en `metro.config.js`. Conviene resolverlo antes del primer dev build.
- `assets/data` está en `.gitignore`: `npm start` lo regenera; antes de un `expo export` suelto hay que ejecutar `npm run copy-data`.
- Regenerar las fuentes (`packages/tokens/scripts/make-fonts.py`) requiere el paquete `brotli` de Python.
- Iconos con trazo 1,9 como en la PWA. `SISTEMA_DISENO.md` dice 1,75: manda la PWA por el 1:1.
- Los motores de `packages/core` son una copia de `web-congelada-v1`. Para ver lo que cambie en la PWA: `git diff web-congelada-v1 main -- app/src/lib`.

## Estado al cerrar la fase 2 (10/11/2026)

Hechas: Biblioteca, Estantería, Ficha, Descubrir (hub y mazo), ¡Duelos! (portada y sesión), Decidir, y los flujos de valorar, colocar, añadir y limpiar. Comprobado sin móvil: `tsc` limpio, 16 tests en la app y 286/17/6 en core, bundles de Android e iOS (4,8 MB) y dependencias del SDK 58 al día. **Nada se ha visto en un móvil.**

- **Fallo de la PWA copiado tal cual:** `biblio_used_decide` se lee en `Library.tsx:59` y `Discover.tsx:289`, pero nadie lo escribe. El aviso de «prueba Decidir» se comporta como si nunca se hubiera usado. Arreglarlo en las dos apps a la vez, cuando Igor decida.
- **Dos cabeceras:** `ScreenTitle` (fase 1, reducida) y `duel/DuelHeader` (completa). Unificarlas en una sola con `step`, `onBack` y `action`.
- **Cursivas sintéticas:** no hay Fraunces cursiva estática; en Android puede no verse. Generar `Fraunces72-400-italic` con `make-fonts.py`.
- **Sin cuenta:** `AddFlow` solo busca en el catálogo local (y canciones en MusicBrainz); la búsqueda remota de `biblio-catalog` llega con la fase 3.
- **Riesgos a probar en el móvil:** `Modal` anidados (`AddFlow`/`CleanupFlow` con la hoja de `RatingFlow`), `SwipeDeck` dentro de un `Modal` en Android, caras de amigos sin disparar el swipe, `measureInWindow` en el vuelo con Android a borde completo, teclado en la búsqueda y en las hojas de comentario, y fluidez de `nextCards` al entrar en una estantería.

## Estado al cerrar la fase 3 (10/11/2026)

Hechos: cuenta por correo con código (`LoginSheet`), cliente de Supabase, sincronización (`useCloudBoot`), amigos reales, contactos con pantalla previa y hashes, Onboarding con redirección, Perfil, Editar perfil con recorte de foto, Ajustes, y las rutas `/l/`, `/p/` y `/unete/`. Comprobado sin móvil: `tsc` limpio, 32 tests en la app y 286/17/6 en core, bundles de Android e iOS (5,7 MB) y dependencias al día.

- **Escrito pero sin probar de punta a punta:** todo lo que pasa por Supabase (login, perfil, subida y bajada, eventos, duelos, amigos, invitaciones, `ensureItems`, borrar la cuenta, foto en `biblio-avatars`). Antes hace falta configurar Supabase: `docs/TAREAS_BETA_AMIGOS.md` §1, más SMTP propio y `{{ .Token }}` en la plantilla de Magic Link.
- **Solo con dev build:** Google y Apple (`BUILT_AUTH`), enlaces con esquema propio, Universal Links y App Links. En `app.json` faltan el plugin de `expo-contacts` con el texto de iOS de `docs/APP_NATIVA.md`, `READ_CONTACTS` en Android y los dominios asociados.
- **Decidido sin cobertura (E):** un número cruzado que no estaba en la app se vuelve a cruzar a los 7 días, y uno que sí estaba a los 30.
- **Fallos de la PWA copiados tal cual:** al entrar no se bajan los duelos de la nube (`pullCloudDuels` no se llama), los eventos se suben aunque no haya sesión, y el paso 5 del onboarding no guarda las estanterías elegidas.
- **Pendiente para la fase 4:** tarjeta de perfil para Story (`react-native-view-shot` y `expo-sharing`) y notificaciones (`expo-notifications`, más el envío a tokens nativos en el servidor).
- **Tres cabeceras:** `ScreenTitle`, `duel/DuelHeader` y `library/TitleBar`. Unificarlas.
