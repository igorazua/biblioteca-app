# Plan: fase 4, limpieza y web responsive (12/11/2026)

> Pedido por Igor tras aprobar el borde de los duelos: fase 4 (punto 3), limpieza técnica (punto 5) y llevar a la web lo aprobado en la nativa, con una web que sirva para escritorio y para móvil (puntos 6 y 8).
> Rama de trabajo: `native/fase-1`. `main` no ha cambiado desde `web-congelada-v1`, así que unir la rama a `main` es directo (*fast-forward*).
> Regla de siempre: Claude comprueba cada entrega con `tsc`, tests y bundle antes de darla por buena. Nada se revisa a ojo salvo lo que pruebe Igor en su móvil.

## Bloque A — Fase 4 de la app nativa

Las dependencias ya están instaladas (Expo 58.0.24, `expo-document-picker`, `expo-file-system`, `expo-notifications`, `react-native-view-shot`, `expo-sharing`, `expo-auth-session` y `expo-web-browser`).

| Tarea | Qué incluye (PWA de referencia) | Quién |
|---|---|---|
| **A1 · Conectar e Importar** | `screens/Connect.tsx`, `ConnectSpotify.tsx` (Spotify por archivo), `Import.tsx` + `ImportFlowView.tsx` + `lib/import/useImportFlow.ts`. Los conectores (`lib/connect/*`) vuelven a `packages/core` sin navegador, y con ellos `services.ts`. Los archivos se eligen con `expo-document-picker`. | Sonnet |
| **A2 · Avisos, tarjeta para Stories y Métricas** | `PushPrompt.tsx` + `lib/push.ts` con `expo-notifications`: avisos **locales** programados en el móvil. Los avisos enviados desde el servidor necesitan dev build y se dejan preparados. `lib/shareCard.ts` → tarjeta de perfil con `react-native-view-shot` + `expo-sharing`. `screens/Metrics.tsx`. | Sonnet |
| **A3 · Activar en `phase.ts`** | `conectar`, `importar` y `metricas` a `true` cuando A1 y A2 estén comprobados. | Claude |

Medidas de estas pantallas: `docs/MEDIDAS_NATIVA_2.md`, en `main`.

## Bloque B — Limpieza técnica

| Tarea | Qué es | Quién |
|---|---|---|
| **B1 · Una sola cabecera** | Hoy hay tres versiones del mismo título de pantalla, hechas por agentes distintos. La de la fase 1 (`ScreenTitle`) es reducida y no tiene botón de volver ni acciones; la de duelos (`duel/DuelHeader`) es completa; la de Biblioteca (`library/TitleBar`) admite acciones. Se queda una sola, completa, con etiqueta, título, subtítulo, volver, contador y acciones, y todas las pantallas la usan. No cambia nada visible. | Haiku |
| **B2 · Fraunces en cursiva** | Las cursivas (comentarios, «¿Algo que decir de *título*?») salen falsas porque no hay fuente cursiva. Se genera `Fraunces72-400-italic` y `-500-italic` desde el archivo variable de la PWA con `make-fonts.py` (hace falta el paquete `brotli` de Python) y se usan donde la PWA pone cursiva. | Haiku |
| **B3 · Fallos copiados de la PWA** | (1) El aviso de «prueba Decidir» nunca sabe que lo has usado (`biblio_used_decide` no se escribe). (2) Al entrar con la cuenta no se bajan los duelos de la nube (`pullCloudDuels`). (3) El paso 5 del onboarding no guarda las estanterías elegidas. Se arreglan en la nativa ahora y en la PWA en el bloque C. | Claude |
| **B4 · Expo 58.0.24** | Hecho. | Claude |

## Bloque C — Una web para escritorio y móvil

### Decisión que hace falta (Igor)

`docs/ARQUITECTURA.md` decía: web nueva en Next.js (`apps/web`) y retirar la PWA. Igor propone ahora que **la PWA sea la web**, con dos versiones: escritorio y dispositivo, que viene a ser lo que ya hay. **Recomendación: hacerlo así.**
- La PWA ya funciona entera y la usa gente. Rehacerla en Next.js costaría semanas y daría lo mismo.
- Lo único que aportaba Next.js era la vista previa de los enlaces compartidos (`/l/`, `/p/`, `/unete/`) al pegarlos en WhatsApp. Eso se resuelve con una pequeña función de Vercel que genera las etiquetas de vista previa.
- La PWA pasa a usar `@biblioteca/core`, igual que la nativa. Así hay **un solo motor** y se acaba la copia doble.

### Pasos (si Igor está de acuerdo)

| Paso | Qué | Quién |
|---|---|---|
| **C0 · Unir la rama** | `native/fase-1` → `main` (*fast-forward*). Antes: comprobar que el build de Vercel sigue pasando. **Push solo con el OK de Igor**: un push a `main` publica en producción. Gemini deja de trabajar en `app/` mientras dure C1. | Claude |
| **C1 · La PWA usa `@biblioteca/core`** | `app` entra en los workspaces. Sus `lib/engine`, `ranking`, `deck`, `phone`… se sustituyen por imports de `core`, y lo que leía `localStorage` se lo pasa la app (igual que en la nativa). Se borran las copias. Los tests viven en `core`. Vercel instala desde la raíz. Es la tarea con más riesgo: los motores tienen que dar lo mismo que antes. | **Opus** |
| **C2 · Lo aprobado en la nativa, a la PWA** | Paleta D30, género de los textos (`byGender`), aviso de entrar con el correo (D31), fallos de B3. | Gemini (largo y mecánico) |
| **C3 · Diseño de escritorio** | Propuesta por pantalla para ≥ 1024 px: barra lateral en lugar de la inferior, Biblioteca y Estantería en rejilla ancha, ficha a dos columnas, Descubrir y duelos centrados con más aire, Ajustes y Perfil en columnas. Se escribe en `docs/DISENO_ESCRITORIO.md` y Igor lo aprueba antes de construir. Se quita el marco de móvil de escritorio (`.frame`). | Sonnet |
| **C4 · Construir el escritorio** | Por pantalla, con puntos de corte de Tailwind (`lg:`), sin tocar el móvil. Pantallas complejas (Descubrir, Duelos, Decidir, ficha): Sonnet. Sencillas (Ajustes, Perfil, Conectar, Importar, públicas): Haiku. | Sonnet + Haiku |
| **C5 · Vista previa de los enlaces** | Función de Vercel que sirve `og:title`, `og:image` y `og:description` para `/l/`, `/p/` y `/unete/` a los robots de WhatsApp y redes, y la app normal a las personas. | Sonnet |

## Orden

1. **Ya:** A1, A2 y B1 + B2 en paralelo (tres agentes; más de tres a la vez agota la cuota). Claude hace B3.
2. Igor prueba la fase 4 en Expo Go. Claude activa las pantallas (A3).
3. Con el OK de Igor sobre el bloque C: C0 → C1 → (C2 en paralelo con C3) → C4 → C5.

## Sigue pendiente de Igor

- Configurar Supabase para el login (`docs/TAREAS_BETA_AMIGOS.md` §1), SMTP propio y `{{ .Token }}` en la plantilla de Magic Link.
- Nombre y bundle ID definitivos, para el dev build (Google, Apple, contactos, enlaces y avisos desde el servidor).
- Aplicar la migración `0011` (revisada).
- Commitear o no los cuatro archivos de Gemini que están sueltos en `main`.
