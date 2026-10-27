# PLAN NATIVO — la app en React Native, 1:1 con la PWA

> Estado (27/10/2026): **borrador del plan**, sin código. La nativa se escribe de cero sobre un núcleo común con la futura web de escritorio (§2, `docs/ARQUITECTURA.md`) y empieza cuando la PWA esté cerrada (§7, fase 0).
> Lo que exige cualquier app nativa (login, contactos, tiendas, RGPD, límites de 0006) está en `docs/APP_NATIVA.md` y **no se repite aquí**: este plan solo coloca esos pasos en sus fases.
> Elegir React Native cierra el debate «React Native o Swift» de `APP_NATIVA.md` y `PROJECT_CONTEXT.md`. Esos dos documentos se actualizan cuando Igor lo confirme.

## 0. Qué significa «1:1»

- Mismas pantallas, mismos textos, mismo sistema de diseño (`docs/SISTEMA_DISENO.md`), mismos gestos y animaciones, y **los mismos motores dando los mismos resultados** con los mismos datos.
- Mismo backend: Supabase `pvewnpemlwmvaduzhjso`, mismas tablas `biblio_*` y mismas funciones. La nativa no cambia el esquema. Si algún día hace falta, el cambio tiene que ser compatible con la web.
- La PWA actual se congela como especificación y sigue en producción hasta que la sustituya la web de escritorio (`apps/web`, ver `docs/ARQUITECTURA.md`).
- Lo único que cambia a propósito: las piezas del navegador pasan a su versión nativa (§3). Y se añade lo que solo existe en nativo: la agenda completa, login con Apple y notificaciones de verdad.

## 1. Decisión técnica: Expo con dev builds

**Recomendado:** Expo (SDK actual) + Expo Router + dev client propio + EAS Build/Update.

- **Igor está en Windows y sin Mac.** Los builds de iOS se hacen en la nube con EAS Build. Para instalar la app en un iPhone hace falta la cuenta de Apple Developer (99 $/año). En Android basta con un APK del dev build.
- **Expo Go no sirve** en cuanto entren Google Sign-In, Apple Sign-In o MMKV. Desde la fase 1 se usa un dev client propio.
- **Expo Router** da rutas por archivos, como `react-router`. Las URLs de la web se mantienen y sirven de deep links (§2).
- **EAS Update** sustituye al aviso de versión de la PWA (`UpdatePrompt`): los cambios de JS llegan sin pasar por la tienda.

## 2. Todo de cero, con la web como especificación (Igor, 27/10/2026)

**Decisión:** todo se escribe de cero, pensado para su destino. **La PWA no se toca ni se adapta** (nada de adaptadores). La PWA congelada (fase 0) es la especificación: qué hace cada pantalla, cada texto y cada motor.

Estructura completa en `docs/ARQUITECTURA.md`. Lo que afecta a la nativa:

```
biblioteca-app/
  packages/core     ← motores, ranking, tipos, parsers, teléfonos, consultas. TS puro + tests
  packages/tokens   ← colores, tipografías y espacios
  apps/native       ← esta app
  apps/web          ← web de escritorio (después o en paralelo)
  app/              ← PWA congelada (no se mueve mientras viva)
```

- **Pantallas y componentes:** de cero en `apps/native`, siguiendo el inventario del §4.
- **Motores** (`lib/engine`, `ranking`, `deck`, `recommend`, `phone`…): de cero en `packages/core`, **con sus tests portados primero**. Los tests de `vitest` de la PWA y unos casos de igualdad (mismo estado de entrada → mismo mazo, mismo ranking, misma propuesta de Decidir, mismo número E.164) son el contrato. Un motor está terminado cuando pasa esos casos, no cuando «se parece».
- `packages/core` nace sin dependencias de plataforma: si necesita guardar algo, recibe los datos y devuelve el resultado, y la app decide dónde guardarlo. Por eso no hacen falta adaptadores. La web de escritorio lo usará igual, así que cada cambio de motor se hace una sola vez.
- **Almacenamiento, sesión y entorno** son de `apps/native` y se diseñan para nativo desde el principio (MMKV, `EXPO_PUBLIC_*`, sesión de Supabase con `AppState`).

## 3. Cada pieza del navegador y su sustituto nativo

| Web (archivo) | Qué hace | Nativo |
|---|---|---|
| `localStorage` / `sessionStorage` (`App.tsx`, `DuelVariants`, `PushPrompt`, `Discover`, `Library`, `WhatToWatch`, `spotify.ts`, `push.ts`) | preferencias y marcas locales | `react-native-mmkv` (síncrono, como `localStorage`) |
| `idb-keyval` (`useCatalog`) | caché del catálogo | MMKV o `expo-file-system` (si la caché pesa varios MB, mejor archivo) |
| `react-router-dom` (26 archivos) | rutas | Expo Router con las mismas rutas (§4) |
| `framer-motion` (23 archivos) | animaciones y gestos | `react-native-reanimated` + `react-native-gesture-handler` |
| Tailwind `className` (todas las pantallas) | estilos | NativeWind (ver §5) |
| `@fontsource-variable/*` | Inter y Fraunces variables | `expo-font` con pesos estáticos 400/500 (las fuentes variables en RN fallan según el sistema) |
| `<img>` de portadas + regla `CacheFirst` de Workbox | portadas con caché | `expo-image` con caché en disco |
| `lib/shareCard.ts` (canvas) | imagen para compartir | `react-native-view-shot` + `expo-sharing` |
| `lib/shareUi.ts`, `AskFriend` (`navigator.share`) | compartir enlace | `Share` de RN |
| `AvatarCropper` (canvas) + `EditProfile` (`FileReader`) | foto de perfil | `expo-image-picker` (con recorte) + `expo-image-manipulator` |
| `lib/import/*` (subir archivo) | importar CSV/ZIP | `expo-document-picker` + `expo-file-system`. `fflate` y `lz-string` son JS puro: confirmar que corren en Hermes |
| `lib/contacts.ts` (Contact Picker web) + `PhoneDiscovery`, `FindFriends` | contactos | `expo-contacts` con el flujo de `APP_NATIVA.md` (pantalla previa, acceso limitado de iOS) |
| `lib/push.ts` + `PushPrompt` (service worker, Web Push) | notificaciones | `expo-notifications`. **Cambio de backend:** el servidor tiene que enviar a tokens de APNs/FCM (o de Expo), no solo a Web Push |
| `lib/haptics.ts` (`navigator.vibrate`) | vibración | `expo-haptics` (en iPhone por fin vibra) |
| `lib/connect/spotify.ts` (redirect OAuth) + `ConnectSpotify` | conectar Spotify | `expo-auth-session` con esquema propio |
| `useAuth` (OAuth con `redirectTo`) | login | Google nativo + Sign in with Apple + email con código, con `signInWithIdToken` (`APP_NATIVA.md` §Login) |
| `lib/supabase.ts` | cliente | `persistSession` con MMKV/AsyncStorage, `detectSessionInUrl: false` y refresco del token con `AppState` |
| `UpdatePrompt` | aviso de versión nueva | EAS Update |
| `ui.tsx` (`document`, portales), `Metrics` (`document`) | hojas, toasts, descargas | `@gorhom/bottom-sheet` o Modal; Metrics exporta con `Share` |
| `main.tsx`, `index.css`, `vite.config.ts` | arranque, tema y PWA | `app/_layout.tsx`, `theme.ts`, `app.json` |

## 4. Inventario de pantallas (para medir la paridad)

Cada fila se marca al portarla con el commit de la web del que salió. Así, `git diff <commit> -- app/src/screens/X.tsx` dice exactamente qué ha cambiado en la web desde entonces y falta llevar a la nativa.

| Ruta web | Pantalla web | Ruta nativa | Fase | Estado | Portada desde |
|---|---|---|---|---|---|
| `/` | `Library` | `(tabs)/index` | 2 | — | — |
| `/descubrir` | `Discover` (+ `SwipeDeck`, `PosterCard`) | `(tabs)/descubrir` | 2 | — | — |
| `/decidir` | `WhatToWatch` (+ `SwipePair`, `DuelVariants`) | `(tabs)/decidir` | 2 | — | — |
| `/comparar` | `CompareHome` | `(tabs)/comparar/index` | 2 | — | — |
| `/comparar/:shelf` | `CompareSession` (+ `PairCompare`, `PlaceFlow`) | `(tabs)/comparar/[shelf]` | 2 | — | — |
| `/perfil` | `Profile` | `(tabs)/perfil` | 3 | — | — |
| `/estanteria/:type` | `Shelf` | `estanteria/[type]` | 2 | — | — |
| `/i/:id` | `ItemDetail` (+ `RatingFlow`, `AddFlow`) | `i/[id]` | 2 | — | — |
| `/lista/:id` | `ListEditor` | `lista/[id]` | — | aparcada (`LISTS_ENABLED = false`) | — |
| `/conectar` | `Connect` | `conectar/index` | 4 | — | — |
| `/conectar/spotify` | `ConnectSpotify` | `conectar/spotify` | 4 | — | — |
| `/importar` | `Import` (+ `ImportFlowView`) | `importar` | 4 | — | — |
| `/ajustes` | `Settings` | `ajustes` | 3 | — | — |
| `/perfil/editar` | `EditProfile` (+ `AvatarCropper`) | `perfil/editar` | 3 | — | — |
| `/metricas` | `Metrics` (interna, desde Ajustes) | `metricas` | 4 | — | — |
| `/onboarding` | `Onboarding` | `onboarding` | 3 | — | — |
| `/l/:payload` | `PublicList` | deep link → `l/[payload]` | 3 | — | — |
| `/p/:payload` | `PublicProfile` | deep link → `p/[payload]` | 3 | — | — |
| `/unete/:code` | `JoinInvite` | deep link → `unete/[code]` | 3 | — | — |

Componentes transversales (fase 1–2): `TabBar`, `ScreenTitle`, `Button`, `ui.tsx` (Sheet, Toast…), `Icon`, `Poster`, `ItemRow`, `Group`, `BrandLogo`, `NudgeCard`, `CleanupFlow`. Social (fase 3): `FindFriends`, `PhoneDiscovery`, `AskFriend`. Fase 4: `PushPrompt`.

**Recorte de alcance:** `ListEditor` y «Compartir» de la estantería no se portan mientras `LISTS_ENABLED` sea `false`. Los enlaces `/l/` y `/p/` sí, porque siguen abriéndose. De `DuelVariants` solo se porta lo que usan `SwipePair` y `Onboarding` (`DuelFan`, `duelTexts`); la variante de texto guardada en el móvil (`useDuelCopy`) es para pruebas y se porta solo si sigue viva.

## 5. Diseño, fuentes y movimiento

- **Tokens:** viven en `packages/tokens`, que parte de los colores de `@theme` de `app/src/index.css` (fondo `#100e0c`, `accent` `#f2b04a`, colores por estantería…) y de los estilos de texto `text-display`, `text-title`, `text-item`, `text-body`, `text-meta` y `text-label`. La nativa y la web de escritorio los importan de ahí.
- **NativeWind** es el camino 1:1, porque las pantallas web usan clases de Tailwind y se pueden traducir casi línea a línea. **Antes de fijarlo, comprobar** en su documentación qué versión soporta Tailwind v4 y si es estable. Si no lo es, se usan los tokens con `StyleSheet`, que cuesta más pero no tiene riesgo.
- **Animaciones:** el mayor riesgo del 1:1. `SwipeDeck`, `SwipePair`, `PairCompare` y `DuelFan` (abanico de duelo) se hacen **primero, como prueba**, en la fase 1. Si a 60 fps en un móvil de gama media no quedan igual que en la web, se sabe antes de portar el resto.
- **Escala:** los tamaños en px de la web pasan tal cual a puntos de RN. El `.frame` de escritorio no existe en nativo: la app ocupa la pantalla con `SafeAreaView`.

## 6. Catálogo

La PWA importa un `seed.json` de **11 MB** dentro del JS. En RN eso infla el bundle, ralentiza el arranque con Hermes y añade 11 MB a cada actualización OTA. En la nueva arquitectura **el catálogo vive en Supabase** (`biblio_catalog`) y el cerebro ordena en el servidor (`docs/ARQUITECTURA.md` §2):

- La app pide las obras y los lotes del mazo ya ordenados, y guarda en caché lo que ha visto (MMKV o archivo).
- **Primer arranque sin red:** el binario lleva un paquete pequeño de arranque como asset, no dentro del JS: las obras de los orientadores y del onboarding, y `data/anchors` (100 KB).
- Ese paquete se genera con los mismos scripts del catálogo (`npm run seed` / `npm run engine`), nunca a mano.

## 7. Fases

Cada fase termina con `npx tsc --noEmit` limpio en `packages/core` y `apps/native`, los tests de `packages/core` en verde, y un build instalado en el móvil de Igor. Según la regla 2 de `CLAUDE.md`, la revisión visual la hace Igor en su móvil.

### Fase 0 — Cerrar la web (antes de escribir la nativa)
La nativa se empieza cuando la web está decidida. Empezar antes obliga a rehacer pantallas y motores dos veces.
- **Lista de pendientes:** cada pantalla del §4 se marca como cerrada (layout y flujo decididos por Igor) o abierta. Lo mismo con los tres motores y sus parámetros.
- **Criterio de congelación:** todas las pantallas de las fases 1–2 cerradas, los motores sin cambios de lógica pendientes y `tsc` + `npm test` en verde. Se etiqueta ese commit (`web-congelada-v1`): es la especificación de la nativa.
- Lo que sigue abierto pero no bloquea (Connect, Metrics, listas aparcadas) puede cerrarse mientras se construyen las fases 1–2.
- **En paralelo, sin esperar** (no depende del diseño): nombre y bundle ID, cuentas de Apple y Google, límite diario de 0006, archivos de Universal Links en Vercel y cambio de backend para notificaciones nativas.

### Fase 1 — Núcleo, esqueleto y prueba de gestos
- Monorepo con npm workspaces: `packages/core`, `packages/tokens` y `apps/native`, al lado de `app/` sin moverla.
- `packages/core`: motores de cero con sus tests portados y los casos de igualdad del §2.
- `apps/native` (Expo + Router + TS + dev client): Supabase con sesión persistente, catálogo desde `biblio_catalog` con el paquete de arranque, tokens, fuentes y `TabBar`.
- Prueba de gestos: swipe y abanico de duelo en una pantalla de prueba.
- **Sale cuando:** los tests de `packages/core` pasan los casos de igualdad con la PWA congelada, el dev build arranca en el móvil y lee el catálogo, y el swipe y el duelo se sienten como en la web.
- **Quién lo construye:** pendiente (Sonnet, Haiku o Gemini).

### Fase 2 — El bucle principal
- Library, Shelf, ItemDetail (+ RatingFlow, AddFlow), Discover, CompareHome, CompareSession (+ PlaceFlow), Decidir.
- Uso sin cuenta, igual que la web (datos locales en MMKV).
- **Sale cuando:** las 8 pantallas están en la tabla del §4 con su commit de origen y se puede catalogar, valorar, comparar y decidir de principio a fin.
- **Quién lo construye:** pendiente.

### Fase 3 — Cuenta y social (con `APP_NATIVA.md`)
- Login nativo: Google, Sign in with Apple y email con código de 6 dígitos. Sincronización (`lib/sync.ts`, compartido) con la misma subida inicial que hace `App.tsx`.
- Onboarding, Profile, EditProfile, Settings (con borrar la cuenta y retirar el teléfono).
- Amigos: `FindFriends`, `PhoneDiscovery` con la agenda completa y la pantalla previa de consentimiento.
- Enlaces: Universal Links / App Links para `/unete/`, `/l/` y `/p/`. Vercel sirve `apple-app-site-association` y `assetlinks.json`.
- **Antes de esta fase** hay que resolver el límite diario de 0006 (`APP_NATIVA.md` §Bloqueantes 2) y tener el nombre y el bundle ID definitivos (§8).
- **Sale cuando:** una persona nueva se registra en nativo, ve sus obras de la web y encuentra a un amigo por la agenda.
- **Quién lo construye:** pendiente.

### Fase 4 — Conectar, importar, avisos y métricas
- Connect, ConnectSpotify (`expo-auth-session`), Import con selector de archivos, Metrics.
- Notificaciones con `expo-notifications`. **Incluye el cambio de backend** para enviar a tokens nativos.
- **Sale cuando:** los parsers de `lib/import` funcionan con los fixtures (`__fixtures__`) desde un archivo elegido en el móvil, y llega una notificación de prueba.
- **Quién lo construye:** pendiente.

### Fase 5 — Tiendas
- Iconos y pantalla de carga, política de privacidad pública y formularios de datos de las tiendas.
- Google Play: prueba cerrada con 12 testers durante 14 días y declaración de contactos. Apple: TestFlight.
- Todo según `APP_NATIVA.md` §Tiendas.

## 8. Decisiones para Igor

1. **Expo con dev builds** (recomendado) frente a React Native sin Expo.
2. **Nombre y bundle ID.** Para desarrollar vale uno provisional (`app.biblioteca.dev`). Para publicar, y para los Universal Links y el login de Google y Apple, hace falta el definitivo, que no se puede cambiar.
3. **Qué queda abierto en la web** para la lista de la fase 0, y cuándo se congela.
4. **Quién construye la fase 1:** un agente Sonnet, un agente Haiku o Gemini (con encargo escrito en `docs/`).
5. **Móvil de pruebas:** iPhone (requiere la cuenta de Apple Developer ya en la fase 1) o Android (basta un APK).
6. Actualizar `APP_NATIVA.md` y `PROJECT_CONTEXT.md` con «React Native (Expo)» en cuanto lo confirmes.
