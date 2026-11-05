import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// `@data` y `@scripts` solo los usan los tests: apuntan a los JSON y scripts de la PWA (la app los carga como assets).
export default defineConfig({
  resolve: {
    alias: {
      '@data': fileURLToPath(new URL('../../app/src/data', import.meta.url)),
      '@scripts': fileURLToPath(new URL('../../app/scripts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/testing/setup.ts'],
  },
})
