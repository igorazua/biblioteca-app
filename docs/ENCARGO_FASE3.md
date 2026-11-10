# Encargo fase 3: cuenta, perfil, ajustes y amigos (10/11/2026)

> Tres agentes a la vez en la rama `native/fase-1`. Cada uno trabaja solo en **sus archivos** (§3).
> La especificación es la PWA en `app/src` (igual a `web-congelada-v1`). El objetivo es 1:1.
> **La app sigue en Expo Go, sin compilación propia.** Google y Apple no se construyen todavía: hacen falta un dev build y el bundle ID definitivo.

## 1. Lee antes

- Las reglas comunes del §2 de `docs/ENCARGO_FASE2_PANTALLAS.md`: valen igual aquí, salvo lo que cambie este documento.
- `docs/DECISIONES_NATIVA.md` y `docs/NOTAS_FASE2.md`, incluido su apartado final, el estado de la fase 2.
- `docs/APP_NATIVA.md`: login, contactos, RGPD y la pantalla previa al permiso de contactos, con su texto literal.
- Las medidas de estas pantallas: `C:\Users\igora\.gemini\antigravity\scratch\biblioteca-app\docs\MEDIDAS_NATIVA_2.md` (ruta absoluta, fuera de la rama). Cada dato lleva `archivo:línea`. Si una medida falta, léela del TSX de la PWA.
- El código nativo existente: `src/components/ui`, `src/store`, `src/lib/phase.ts`, y `AddFlow` y `RatingFlow` en `src/components/flows`.

## 2. Lo que no se puede probar aún (decirlo en el informe, no ocultarlo)

- **El login de Supabase no está configurado** (`docs/TAREAS_BETA_AMIGOS.md` §1): Google desactivado, sin redirecciones y sin SMTP propio.
  - Con el correo por defecto de Supabase solo salen 2 mensajes por hora y solo a miembros del equipo.
  - La plantilla de Magic Link necesita `{{ .Token }}` para que llegue el código de 6 dígitos.
  - Todo lo de cuenta y nube queda **escrito pero sin probar de punta a punta**.
- **Enlaces con el esquema propio** (`/l/`, `/p/` y `/unete/` desde fuera): no funcionan en Expo Go. Las rutas se construyen; los enlaces se prueban con el dev build.
- **Claves:** `apps/native/.env.local` tiene solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`, y está en `.gitignore`.
  - Nunca leas `app/.env.local`, ni copies otras claves, ni imprimas sus valores.
  - Sin `.env.local`, la app funciona sin cuenta, igual que la PWA sin Supabase.

## 3. Quién toca qué

| Agente | Qué hace (PWA de referencia) | Archivos suyos en `apps/native/` |
|---|---|---|
| **E · Cuenta, nube y amigos** (Sonnet) | `lib/supabase.ts`, `store/useAuth.ts`, `lib/sync.ts`, la parte de cuenta de `App.tsx` (primera subida y bajada de la nube), `useFriends` real, `ensureItems` de `useCatalog`, subida de eventos, `components/FindFriends.tsx`, `PhoneDiscovery.tsx` y `lib/contacts.ts` | `src/lib/supabase.ts`, `src/lib/sync.ts`, `src/lib/contacts.ts`, `src/store/**` (lo marcado «fase 3»), `src/components/auth/**`, `src/components/friends/**`, `src/app/_layout.tsx` (solo para arrancar la sesión y la sincronización) |
| **F · Onboarding y perfil** (Sonnet) | `screens/Onboarding.tsx`, `Profile.tsx`, `EditProfile.tsx`, `components/AvatarCropper.tsx` | `src/app/onboarding.tsx`, `src/app/(tabs)/perfil.tsx`, `src/app/perfil/editar.tsx`, `src/components/profile/**`, `src/components/onboarding/**`, y en `src/app/_layout.tsx` **solo** la redirección a onboarding |
| **G · Ajustes y enlaces** (Haiku) | `screens/Settings.tsx`, `Public.tsx` (`PublicList`, `PublicProfile`), `JoinInvite.tsx` | `src/app/ajustes.tsx`, `src/app/l/[payload].tsx`, `src/app/p/[payload].tsx`, `src/app/unete/[code].tsx`, `src/components/settings/**`, `src/components/public/**` |

`src/app/_layout.tsx` lo tocan E y F, cada uno solo en su parte. El primero que llegue hace commit enseguida; el segundo trabaja encima del cambio del primero. Nunca deshagas lo del otro.

## 4. Contrato entre agentes

Lo construye E. F y G lo importan aunque aún no exista, y si al terminar falta, lo dicen.

- **`useAuth`** en `src/store/useAuth.ts`, con la misma forma que en la PWA: `user`, `profile`, `loading`, `error`, `isConfigured`, `init()`, `signInWithOtp(email)`, `signOut()`, `deleteAccount()`, `updateProfile(patch)`. Además, `verifyOtp(email, code)`, porque en nativo el código se escribe dentro de la app (`docs/APP_NATIVA.md`). `signInWithGoogle` existe, pero devuelve un error mientras no haya dev build. F y G no muestran el botón de Google mientras `BUILT_AUTH.google` sea `false`; E lo crea en `src/lib/phase.ts` añadiendo `BUILT_AUTH = { google: false, apple: false }`.
- **`checkHandleAvailability`** se exporta desde `useAuth.ts`, igual que en la PWA.
- **`LoginSheet`** en `src/components/auth/LoginSheet.tsx`, con `{ onClose, onDone }`: hoja con el correo, «Enviar código», un campo de 6 dígitos y «Entrar». Donde la PWA pide iniciar sesión, F y G abren esta hoja.
- **`FindFriends`** y **`PhoneDiscovery`** en `src/components/friends/`, con las mismas props que en la PWA. Los usan Perfil (F) y Ajustes (G).

## 5. Detalles por agente

### E
- **Cliente de Supabase:** AsyncStorage para la sesión, `detectSessionInUrl: false` y `autoRefreshToken`, con `startAutoRefresh` y `stopAutoRefresh` según `AppState`. Importa `react-native-url-polyfill/auto`, ya instalado.
- **Sincronización:** porta los 5 tests de `app/src/lib/sync.test.ts` y la parte de `mergeCloudAndLocal` de `aliases.test.ts`, sin relajar ninguna expectativa.
- **Contactos (`expo-contacts`):**
  - Antes del permiso del sistema, la pantalla previa de `docs/APP_NATIVA.md` con su texto literal. «Ahora no» deja usar la app y no se repite en bucle.
  - Acepta el acceso limitado de iOS.
  - Un número por contacto (primero el móvil), normalizado con `normalizePhone` de core.
  - Tandas de 500 a `biblio_match_contacts`.
  - El móvil recuerda qué números ya ha cruzado guardando un **hash** (SHA-256 con `expo-crypto`), nunca el número, y solo envía los nuevos.
  - Los nombres no salen del móvil.
- **Sin `.env.local` o sin sesión:** todo como hasta ahora (amigos de prueba, sin nube).

### F
- **Onboarding:** completo, como el de la PWA, con redirección a `/onboarding?next=…` si `onboarded` es `false`, igual que `App.tsx:42`. Al terminar vuelve a `next`. El paso de cuenta usa `LoginSheet`, y Google se oculta (§4).
- **Perfil y editar perfil:** completos.
- **Foto de perfil:** `expo-image-picker` con recorte propio, siguiendo `AvatarCropper.tsx` (arrastre y zoom), y `expo-image-manipulator` para recortar. Se sube como en la PWA si hay sesión; sin sesión se queda en local.

### G
- **Ajustes:** completos.
  - La parte de cuenta usa `useAuth`. Sin sesión, el botón «Entrar» abre `LoginSheet`.
  - Borrar la cuenta pide confirmación con `Confirm`.
  - Retirar el teléfono con `biblio_set_phone(null)`.
  - No se porta el selector de tamaño de duelos (D4).
  - Métricas, Conectar e Importar siguen ocultos (`phase.ts`).
- **`/l/[payload]` y `/p/[payload]`:** decodifican con `share` de core, igual que la PWA.
- **`/unete/[code]`:** igual que `JoinInvite.tsx`, con `useFriends.acceptInvite`.

## 6. Hecho cuando

1. `cd apps/native && npx tsc --noEmit` no da errores en tus archivos. Lista los errores ajenos sin tocarlos.
2. `cd apps/native && npx vitest run` pasa, incluidos los tests nuevos de E.
3. `cd apps/native && npm run copy-data && npx expo export --platform android --output-dir "C:\Users\igora\AppData\Local\Temp\claude\cfab85b2a838a996\327479f0-a54c-4d13-9eae-c9e37859aaec\scratchpad\f3-<letra>"` termina bien.
4. Commits por bloque, solo con tus archivos, como en la fase 2, en cuanto cada bloque compile. Si se corta el trabajo, que no se pierda.

## 7. Informe final

Lo mismo que en la fase 2 (§7 de `docs/ENCARGO_FASE2_PANTALLAS.md`), más una lista explícita de lo que queda **escrito pero sin probar de punta a punta**.
