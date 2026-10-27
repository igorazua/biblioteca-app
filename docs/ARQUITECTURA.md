# ARQUITECTURA — web real + app nativa sobre un núcleo común

> Estado (27/10/2026): **propuesta aceptada por Igor**, sin código. Sustituye a la idea de que «la PWA sigue siendo la versión web» (`PROJECT_CONTEXT.md`, `APP_NATIVA.md`).
> Detalle de la app nativa: `docs/PLAN_NATIVO.md`. Requisitos de tiendas, login y contactos: `docs/APP_NATIVA.md`.

## 1. Qué se quiere

- **App nativa** para móvil (iOS y Android), pensada para gestos.
- **Web real** para ordenador: columnas, ratón y teclado. No es la PWA actual, que imita un móvil dentro de un marco.
- Los dos productos dan **los mismos resultados** (mazo, ranking, Decidir) y comparten cuenta y datos.
- Nada de adaptadores ni de doblar código pensado para otro sitio: cada pieza se escribe de cero para su destino.

## 2. Las piezas

```
biblioteca-app/
  packages/core     ← lógica: motores, ranking, tipos, parsers de importación,
                      normalización de teléfonos, consultas a Supabase. TS puro + tests
  packages/tokens   ← colores, tipografías y espacios (un solo origen)
  apps/native       ← Expo: pantallas de móvil
  apps/web          ← web de escritorio (Next.js en Vercel)
  supabase/         ← esquema, funciones, Edge Functions y el «cerebro»
  app/              ← PWA actual: congelada como especificación, se retira al final
```

### `packages/core` — el núcleo
- Se escribe **de cero y sin dependencias de plataforma**: ni `window`, ni `document`, ni `localStorage`, ni módulos de React Native. Si necesita guardar algo, recibe los datos y devuelve el resultado; quien llama decide dónde guardarlo. Así no hacen falta adaptadores: el código nunca ha conocido el navegador.
- Contiene: los tres motores (mazo de Descubrir, Decidir, duelos/Elo), la limpieza de guardados, la afinidad con amigos, los parsers de `lib/import`, la normalización E.164 de `phone.ts`, los tipos (`Item`, `Entry`…) y las consultas tipadas a las tablas `biblio_*`.
- **Sus tests son el contrato.** Se portan primero los de la PWA (`vitest`) y se añaden casos con estado fijo → resultado esperado, sacados de la PWA congelada.
- Las dos apps lo importan tal cual. Un cambio de motor se hace una vez y llega a las dos.

### `packages/tokens` — el diseño común
- Colores, familias tipográficas, tamaños de texto (`display`, `title`, `item`, `body`, `meta`, `label`) y espacios del sistema «Editorial sobria» (`docs/SISTEMA_DISENO.md`).
- Exporta un objeto TS (para la nativa) y variables CSS o tema de Tailwind (para la web).
- **Los componentes no se comparten:** una pantalla de móvil y una de escritorio son distintas a propósito. Comparten aspecto, no estructura.

### `apps/native` — Expo
- Expo Router, Reanimated + Gesture Handler, MMKV, `expo-image`, login nativo (Google, Apple, email con código), agenda completa y notificaciones nativas.
- Plan completo en `docs/PLAN_NATIVO.md`.

### `apps/web` — web real
- **Next.js en Vercel**, por los enlaces compartidos: listas (`/l/`), perfiles (`/p/`) e invitaciones (`/unete/`) se generan en el servidor. Así se ven bien con su vista previa en WhatsApp, los encuentra Google y abren rápido sin la app.
- Diseño de escritorio, y adaptable al navegador del móvil para quien abra un enlace sin tener la app.
- Sirve también `apple-app-site-association` y `assetlinks.json`, para que esos enlaces abran la app si está instalada.

### Supabase — la fuente de verdad
- **Catálogo en la base de datos** (`biblio_catalog`). Deja de viajar dentro de la app como un `seed.json` de 11 MB. La nativa puede llevar una copia pequeña para el primer arranque sin red (ver `PLAN_NATIVO.md` §6).
- **El cerebro corre en el servidor** (`docs/MOTOR.md` §2c): vectores, el modelo que ordena y los vecinos se calculan en lotes o en Edge Functions. Las apps piden lotes ya ordenados.
- **En el dispositivo solo queda lo instantáneo**, y sale de `packages/core`: actualizar el Elo tras un duelo, reordenar el lote del mazo tras cada gesto o elegir la siguiente pareja de Decidir.
- Las tablas y funciones son las mismas para las dos apps. Los cambios de esquema tienen que ser compatibles con versiones antiguas de la app nativa, que tarda en actualizarse.
- Las notificaciones se envían a tokens nativos (APNs/FCM o Expo) y, en la web, a Web Push.

## 3. Qué pasa con la PWA actual

- **Fase 0:** se cierran sus pantallas, flujos y motores y se etiqueta `web-congelada-v1`. Es la especificación de todo lo demás: textos, flujos y resultados de los motores.
- Sigue en producción (Vercel) mientras no exista la web nueva.
- Cuando `apps/web` la sustituya, se retira y su dominio pasa a la web nueva. Los enlaces ya compartidos (`/l/`, `/p/`, `/unete/`) tienen que seguir abriendo con el mismo formato.
- Los scripts de catálogo y motor (`app/scripts`, `npm run seed`, `npm run engine`) se mudan a su propio sitio (por ejemplo `tools/catalog`) cuando la PWA se retire. Hasta entonces se quedan donde están.

## 4. Orden

1. **Congelar la PWA** (fase 0 de `PLAN_NATIVO.md`). En paralelo: nombre y bundle ID, cuentas de las tiendas, límite diario de 0006, notificaciones nativas en el backend.
2. **`packages/core` y `packages/tokens`**, de cero, con los tests portados en verde.
3. **`apps/native`** (fases 1–5 de `PLAN_NATIVO.md`).
4. **`apps/web`**. Puede ir en paralelo con la nativa si la construye otra persona o agente, porque solo comparten el núcleo.
5. Retirar la PWA.

Mientras la PWA siga viva, **no se mueve de `app/`**: Gemini trabaja ahí y un traslado chocaría con su trabajo. Las carpetas nuevas se crean a su lado.

## 5. Alternativa descartada

**Una sola base de código para web y móvil** (Expo exportando también a web con React Native Web). Ahorra trabajo, pero la web sale con aspecto de app de móvil estirada, peor en ordenador y peor para los enlaces compartidos y Google. Es justo lo que no se quiere.

## 6. Decisiones pendientes

1. Nombre del producto y bundle ID (antes de publicar la nativa y de configurar los enlaces universales).
2. Gestor del monorepo: npm workspaces (lo más simple) o pnpm + Turborepo (más rápido con varias apps). Recomendado: empezar con npm workspaces.
3. Si `apps/web` se construye en paralelo con la nativa o después.
4. Quién construye cada pieza: Sonnet, Haiku o Gemini (regla fija de `CLAUDE.md`).
