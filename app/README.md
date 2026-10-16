# Biblioteca — demo navegable (PWA sin backend)

Especificación: `../docs/DISENO_DEMO.md` · Idea: `../docs/IDEA.md`.
Stack: Vite + React + TypeScript + Tailwind v4 + framer-motion + zustand + react-router + vite-plugin-pwa.
Todo vive en el navegador (`localStorage`, clave `biblioteca-v1`). Sin cuentas ni servidor.

## Arrancar

```bash
cd app
npm install
npm run dev          # http://localhost:5173  (también expuesto en la red local)
npm test             # tests de lib/ranking.ts y lib/share.ts
npm run build        # genera dist/ con el service worker
npm run build-preview  # build + servidor de producción en :4173
```

## Probarla en el móvil

**Gestos y aspecto (sin HTTPS):** con el móvil en la misma wifi que el PC.

1. `npm run dev` en esta carpeta.
2. Mira la IP del PC (`ipconfig`, «Dirección IPv4», p. ej. `192.168.1.34`).
3. En el móvil abre `http://192.168.1.34:5173`. Si Windows pregunta por el cortafuegos para Node, permite redes privadas.

Con esto pruebas swipe, hoja de valoración, A/B, «¿Qué vemos?», listas y perfil.
Los links de listas generados así llevan la IP local; solo funcionan en dispositivos de tu wifi.

**Instalar en la pantalla de inicio y modo sin conexión:** el navegador exige HTTPS, así que solo se pueden
probar tras desplegar (Vercel, con tu confirmación). `vercel.json` ya trae el rewrite SPA para que los links
`/l/...` y `/p/...` funcionen al abrirse directos.

## Datos de prueba

`src/data/seed.json` (80 pelis, 50 series, 40 libros, 6 amigos simulados, 63 comentarios) se genera con:

```bash
npm run seed
```

- **Sin clave de TMDB:** usa el catálogo escrito a mano (`scripts/seed-catalog.mjs`, `scripts/seed-friends.mjs`)
  con portadas generadas. Las plataformas son **orientativas**.
- **Con clave:** crea una cuenta gratis en themoviedb.org, copia `.env.example` a `.env.local`, pon
  `TMDB_API_KEY=...` y vuelve a ejecutar `npm run seed`. Añade portadas y sinopsis en español, duraciones y
  plataformas reales de España (pelis/series) y portadas de Open Library (libros, sin clave).
  La clave solo la lee el script, en local; nunca llega al navegador.
- El script es determinista (semilla fija) y los IDs son slugs estables (`movie:el-hoyo-2019`) para que ni los
  links compartidos ni el `localStorage` se rompan al regenerar. El id de TMDB / Open Library va en `tmdbId` / `olid`.

## Estructura

```
scripts/   build-seed.mjs, seed-catalog.mjs, seed-friends.mjs, make-icons.mjs
src/lib/   ranking.ts (motor A/B, puro y testeado), share.ts (links), deck.ts, affinity.ts
src/store/ useStore.ts (zustand + persist), useScores.ts
src/screens/, src/components/
```

El nombre del producto está en `src/config.ts` (`APP_NAME`) y en `index.html`/`vite.config.ts` (manifest).

## Pruebas automáticas en el navegador
Con `npm run dev`, abrir cualquier ruta con `?fast` (p. ej. `/que-vemos?t=movie&fast`) desactiva las animaciones de
framer-motion, útil para recorrer flujos con scripts en un navegador que no pinta fotogramas. Solo en desarrollo.
