# Encargo para Gemini — C2: lo aprobado en la app nativa, a la PWA

> 12/11/2026. Parte del bloque C de `docs/PLAN_SIGUIENTE.md`.
> ⛔ **No empezar hasta que Claude avise de que C1 está en `main`.** C1 cambia la PWA para que use `@biblioteca/core`. Si se trabaja en `app/src` a la vez, los cambios chocan.

## Reglas

1. Lee antes `PROJECT_CONTEXT.md`, `CLAUDE.md`, `docs/DECISIONES_NATIVA.md` (D30 y D31) y `docs/PLAN_SIGUIENTE.md`.
2. Trabaja en `main`, en esta carpeta. **No toques `.claude/`, `apps/native/` ni `packages/`.** Si necesitas algo de `packages/core`, dilo en el informe.
3. **Sin commits ni push.** Un push a `main` publica en producción. Claude revisa y commitea.
4. Sin navegador ni capturas: Igor revisa en su móvil y en el ordenador.
5. No digas «hecho» sin pegar la salida real de las comprobaciones.

## Qué hacer

### 1. Paleta más clara (D30)

En `app/src/index.css`, bloque `@theme`:

| Token | Antes | Ahora |
|---|---|---|
| `--color-bg` | `#100e0c` | `#1e1b17` |
| `--color-surface` | `#1a1816` | `#2a2620` |
| `--color-surface2` | `#25221f` | `#36312a` |
| `--color-line` | `#2c2824` | `#4a433b` |
| `--color-mute` | `#a39d92` | `#bdb6a9` |

`--color-accent-ink` se queda en `#100e0c`: es el texto sobre el acento.

Busca también en `app/src` los colores sueltos con el fondo viejo (`#100e0c`, `#0F0E0D`, `rgb(15 14 13`, `rgba(16,14,12`…) y cámbialos por el nuevo. Haz lo mismo con `background_color` y `theme_color` en `app/vite.config.ts` y con `app/index.html`.

### 2. Género de los textos

`@biblioteca/core` exporta `byGender(type, femenino, masculino)`, y `SHELF_LABEL[type].fem` dice si la palabra de la estantería es femenina: peli, serie y canción lo son; libro, juego y artista no. Cambia los textos que hablan de una obra con género fijo femenino. La lista sale de lo que ya se hizo en la nativa (commit `42ccc94`):

- **`screens/WhatToWatch.tsx` (Decidir):**
  - «Te propongo esta» → «este» / «esta»
  - «¡Esta!» → «¡Este!» / «¡Esta!»
  - «Ver otras N candidatas» → «Ver otros N candidatos» / «Ver otras N candidatas»
  - «Se acabaron las candidatas» → «los candidatos» / «las candidatas»
  - «Otras candidatas» → «Otros candidatos» / «Otras candidatas»
  - «Toca una» → «uno» / «una»
  - «Elegida de tus otras candidatas» → «Elegido de tus otros candidatos» / la forma femenina
- **`screens/CompareHome.tsx`:** «nueva / nuevas» → «nuevo / nuevos» según la estantería.
- **`screens/CompareSession.tsx`:**
  - «Nuevas en tu ranking» → «Nuevos en tu ranking» según la estantería
  - «Has comparado todas tus…» → «todos» / «todas»
- **`screens/Shelf.tsx`:** la etiqueta «nueva» → «nuevo» / «nueva».
- **`screens/Discover.tsx`, `components/PlaceFlow.tsx`, `components/AddFlow.tsx` y `components/RatingFlow.tsx`:** «Guardada ✓» y «Guardada en pendientes ✓» → «Guardado» / «Guardada».
- **`components/CleanupFlow.tsx`:**
  - «Sigue guardada» → «Sigue guardado» / «Sigue guardada»
  - «La guardo» → `${pronounCap} guardo`

Después busca en `app/src` cualquier otro texto que hable de una obra en femenino fijo y aplícale lo mismo. Lista en el informe los que cambies.

### 3. Fallos arreglados en la nativa (B3 y B5)

- **Decidir marcado como usado:** en `WhatToWatch.tsx`, cuando se llega a la propuesta, `localStorage.setItem('biblio_used_decide', '1')`. Hoy Biblioteca y Descubrir lo leen, pero nadie lo escribe.
- **Duelos al entrar con la cuenta:** en `App.tsx`, donde se hace la primera subida y bajada (`pushLocalEntriesToCloud` / `pullCloudEntries`), haz también `pushLocalDuelsToCloud` la primera vez y `pullCloudDuels` siempre. Mira cómo quedó en `apps/native/src/lib/sync.ts` (`syncOnLogin`).
- **Estanterías del onboarding:** el paso 5 de `screens/Onboarding.tsx` guarda lo elegido con `setSettings({ shelves: selectedShelves })`. `Settings.shelves` ya existe en core. Biblioteca, las categorías de Descubrir y su primera estantería ordenan las estanterías con las elegidas primero, y el resto debajo. Copia `orderShelves` de `apps/native/src/lib/myShelves.ts` a un archivo de `app/src/lib/`.

## Comprobaciones (pega la salida)

- `cd app && npx tsc --noEmit`
- `cd app && npx vitest run`
- `cd app && npm run build`
- `git status --short`: solo archivos de `app/` (y este documento).

## Informe

Lista de archivos tocados, de textos cambiados y la salida real de las comprobaciones.
