/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/**
 * Catálogo más ligero en producción (Igor, 28/10/2026): la app no usa la procedencia de cada dato ni las
 * traducciones de títulos ni las visitas de Wikipedia (solo los scripts), y pesaban un tercio del archivo principal.
 * `seed.json` sigue siendo la única fuente; en desarrollo y en los tests se carga entero.
 */
const SEED_DROP = ['src', 'conf', 'measured', 'computed', 'localized', 'titles', 'wikiLangs', 'imageCredit', 'imageSrc', 'pageviews', 'fameLlm']
function slimSeed(): Plugin {
  return {
    name: 'biblio-slim-seed',
    apply: 'build',
    enforce: 'pre',
    load(id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/data/seed.json')) return null
      const seed = JSON.parse(readFileSync(id, 'utf8'))
      const items = (Array.isArray(seed) ? seed : seed.items).map((it: Record<string, unknown>) => {
        const out = { ...it }
        for (const k of SEED_DROP) delete out[k]
        return out
      })
      const slim = Array.isArray(seed) ? items : { ...seed, items }
      // se devuelve JSON: el procesador de JSON de Vite (rolldown) lo convierte después en módulo
      return JSON.stringify(slim)
    },
  }
}

export default defineConfig({
  plugins: [
    slimSeed(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Biblioteca',
        short_name: 'Biblioteca',
        description: 'Todo lo que te ha formado, en tus estanterías.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F0E0D',
        theme_color: '#0F0E0D',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(image\.tmdb\.org|covers\.openlibrary\.org|m\.media-amazon\.com|static\.tvmaze\.com|upload\.wikimedia\.org|thumb\.wikimedia\.org|cdn-images\.dzcdn\.net)\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'covers', expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 90 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  server: { host: true, port: 5173 },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'] },
})
