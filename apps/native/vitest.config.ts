import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Igual que `packages/core`: `@data` y `@scripts` apuntan a los JSON y scripts de la PWA y solo los usan los tests.
// El catálogo completo se carga con el `setup.ts` de core; AsyncStorage se sustituye por uno en memoria.
export default defineConfig({
  resolve: {
    alias: {
      '@react-native-async-storage/async-storage': at('./src/store/testing/asyncStorageMock.ts'),
      '@data': at('../../app/src/data'),
      '@scripts': at('../../app/scripts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: [at('../../packages/core/src/testing/setup.ts')],
  },
})
