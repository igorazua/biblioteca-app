# Encargo fase 2: pantallas del bucle principal (10/11/2026)

> Cuatro agentes a la vez en la misma rama (`native/fase-1`). Cada uno tiene **sus archivos** (§3) y no toca los demás.
> La especificación es la PWA en `app/src` (igual a `web-congelada-v1`). El objetivo es 1:1: mismos textos, medidas, estados, animaciones y comportamiento.

## 1. Lee antes

- `docs/DECISIONES_NATIVA.md`: obligatorias. No tomes decisiones de diseño nuevas: si algo no está ahí ni en la PWA, elige lo más parecido a la PWA y anótalo en tu informe.
- `docs/NOTAS_FASE2.md`: cómo se usa `@biblioteca/core`.
- `docs/MEDIDAS_NATIVA.md`: medidas con `archivo:línea`. Si falta una, léela del TSX de la PWA.
- El código nativo que ya existe, para seguir su estilo. Usa esto:
  - `src/components/AppText.tsx` para todo el texto (D18) y `Press.tsx` para todo lo pulsable (D21).
  - `Icon.tsx`, `Poster.tsx`, `PosterCard.tsx`, `ItemRow.tsx`, `DuelFan.tsx`, `ScreenTitle.tsx`.
  - `src/components/ui` para Button, Chip, Toast, Sheet, Avatar, RankBadge, Tag, FriendBubbles, Group, Row, Toggle, NudgeCard, PlatformPicker, StarRating, ScreenHeader y Confirm. Usa `ui/Tag`, no `components/Tag`.
  - `src/store` (`index.ts`): useStore, useRanks, useEvents/track, useCatalog, useFriends, startDecide/skipDecide.
  - `src/lib/haptics.ts`, `motion.ts`, `flight.tsx` y `phase.ts`.
  - `src/data/loadData.ts`: `loadShelves(shelf)` para el detalle de cada estantería.

## 2. Reglas para todos

- **Lógica:** toda la lógica pura viene de `@biblioteca/core`. No dupliques algoritmos ni copies números de los motores.
- **Navegación:** expo-router, con las mismas rutas que la PWA: `/i/[id]`, `/estanteria/[type]`, `/comparar/[shelf]`, `/decidir` y `/descubrir`.
- **Pantallas que aún no existen:** los enlaces a ellas (Perfil, Ajustes, Conectar, Importar, Métricas, Onboarding y Listas) **no se muestran** mientras su valor en `src/lib/phase.ts` sea `false`. No pongas avisos ni pantallas de relleno.
  - Sin onboarding: ninguna pantalla redirige a él. Con la biblioteca vacía se ve el estado vacío de la PWA.
- **Sin cuenta (D7):** lo que en la PWA depende de la sesión se comporta como en la PWA sin sesión.
- **Rendimiento:**
  - Listas largas con `FlatList` (D24).
  - Animaciones y gestos con Reanimated y Gesture Handler v3, en el hilo de UI.
  - Comprueba las APIs en sus tipos de `node_modules`, no de memoria.
- **Fuera de alcance:**
  - Sin dependencias nuevas, salvo `npx expo install` de algo que funcione en Expo Go y sea imprescindible. Dilo en el informe.
  - Prohibido: navegador, capturas, `eas`, `expo prebuild`, `git push` y servidores.
- **Componentes de otro agente que aún no existen** (por ejemplo, `RatingFlow`): impórtalos de la ruta del §3 con las **mismas props que en la PWA**. Si al final siguen sin existir, dilo en el informe; no los crees tú.
- **Si necesitas cambiar un archivo de otro agente o compartido** (`src/app/_layout.tsx`, `(tabs)/_layout.tsx`, `TabBar`, `ui/*`, `store/*`, `theme`, `packages/*`): no lo cambies. Explica en el informe qué cambio hace falta y por qué.

## 3. Quién toca qué

| Agente | Pantallas de la PWA | Archivos suyos en `apps/native/` |
|---|---|---|
| **A · Descubrir** (Sonnet) | `Discover.tsx` (variante `hub`, D1; mazo, leyenda D3, deshacer, avisos con `NudgeCard`), `SwipeDeck.tsx`, `PosterCard.tsx` | `src/app/(tabs)/descubrir.tsx`, `src/components/discover/**`, `src/components/SwipeDeck.tsx`, `src/components/PosterCard.tsx` |
| **B · Duelos y Decidir** (Sonnet) | `CompareHome.tsx`, `CompareSession.tsx`, `WhatToWatch.tsx`, `SwipePair.tsx`, `PlaceFlow.tsx`, `RatingFlow.tsx`, `DuelVariants.tsx` (solo lo vivo: `DuelFan`, `duelTexts`, `Chosen`, `PickStrip`, `isDuelLearned`) | `src/app/(tabs)/comparar.tsx`, que pasa a carpeta `src/app/(tabs)/comparar/**` (con su `_layout` de pila y `[shelf].tsx`); `src/app/(tabs)/decidir.tsx`; `src/components/duel/**`; `src/components/flows/RatingFlow.tsx`; `src/components/DuelFan.tsx`; y `src/app/(tabs)/_layout.tsx` **solo** si el cambio a carpeta lo exige |
| **C · Ficha y flujos** (Sonnet) | `ItemDetail.tsx`, `AddFlow.tsx`, `CleanupFlow.tsx`, `AskFriend.tsx`, el vuelo del póster desde filas y rejillas | `src/app/i/[id].tsx`, `src/components/detail/**`, `src/components/flows/AddFlow.tsx`, `src/components/flows/CleanupFlow.tsx`, `src/components/AskFriend.tsx`, `src/components/Poster.tsx`, `src/lib/flight.tsx` |
| **D · Biblioteca y estantería** (Haiku) | `Library.tsx`, `Shelf.tsx`, `ItemRow.tsx` (`ItemRow` y `PosterTile`) | `src/app/(tabs)/index.tsx`, `src/app/estanteria/[type].tsx`, `src/components/library/**`, `src/components/ItemRow.tsx` |

Rutas de los flujos compartidos:
- `RatingFlow`: `src/components/flows/RatingFlow.tsx` (de B).
- `AddFlow` y `CleanupFlow`: `src/components/flows/AddFlow.tsx` y `CleanupFlow.tsx` (de C).

## 4. Detalles por agente

- **A:**
  - El mazo usa `nextCards` de core con el perfil, las entradas y los amigos reales del store, igual que la PWA. Quita el andamiaje de la fase 1 (los chips de prueba).
  - Mantener pulsado sobre las caras de amigos de una carta no debe disparar el swipe (en la PWA lo corta `stopPropagation`).
  - El vuelo a la ficha ya existe: úsalo sin cambiar `flight.tsx`.
- **B:**
  - Decidir usa `startDecide` y `skipDecide` del store, **nunca** `initDecideSession` ni `skipDuelUnknown` de core directamente (`docs/NOTAS_FASE2.md`).
  - Duelos con el tamaño `area` (D4).
  - El gesto de volver de iOS va desactivado en la sesión de duelos (D16).
  - Quita el andamiaje de la fase 1 de la pestaña ¡Duelos!.
- **C:**
  - La ficha completa de la PWA con todos sus estados.
  - El vuelo del póster (D12) también desde las filas y rejillas de Biblioteca y Estantería. Expón en `flight.tsx` lo que D necesite y documenta en el informe cómo se usa.
  - `AskFriend`: WhatsApp y los demás enlaces con `Linking.openURL`.
- **D:**
  - Biblioteca y estantería completas, con el número hueco.
  - Para abrir la ficha, usa la API de vuelo que deje C. Si aún no existe, navega a `/i/[id]` sin vuelo y dilo en el informe.
  - Sin listas (D5): el botón «Compartir» de la estantería no se muestra.

## 5. Commits

- Por bloque y solo con tus archivos: `git add <tus rutas> && git commit -m "feat(nativa): ..." -- <tus rutas>`.
- Pie: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (o `Claude Haiku 5.5`).
- Si aparece `index.lock`, espera y reintenta.
- Nunca `git add -A`, `git add .`, `reset`, `stash` ni `checkout` sobre archivos ajenos.

## 6. Hecho cuando

1. `cd apps/native && npx tsc --noEmit` sin errores en tus archivos. Si los errores son de archivos ajenos o de un componente que aún no existe, lístalos.
2. `cd apps/native && npm run copy-data && npx expo export --platform android --output-dir "C:\Users\igora\AppData\Local\Temp\claude\cfab85b2a838a996\327479f0-a54c-4d13-9eae-c9e37859aaec\scratchpad\f2-<letra>"` termina bien.
3. `cd apps/native && npx vitest run` sigue en verde.

## 7. Informe final

Corto y en español:
- comandos ejecutados con su salida real;
- qué pantallas y estados están;
- qué ha quedado distinto de la PWA y por qué;
- qué decidiste sin cobertura;
- qué cambios necesitas en archivos ajenos;
- qué queda solo en teoría sin un móvil.

No digas «hecho» si algo no se cumple.
