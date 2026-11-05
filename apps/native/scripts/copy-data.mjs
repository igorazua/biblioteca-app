// Copia los datos del catálogo de la PWA (app/src/data) a apps/native/assets/data con extensión .data (D27).
// Metro trata `.data` como asset (ver metro.config.js): se carga con expo-asset y no entra en el bundle de JS.
// Hay que ejecutarlo antes de `expo start` y de `expo export` (npm start y postinstall ya lo hacen).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', '..', '..', 'app', 'src', 'data')
const out = join(here, '..', 'assets', 'data')

if (!existsSync(src)) {
  console.warn(`copy-data: no existe ${src}; no se copia nada`)
  process.exit(0)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

// [carpeta de origen o '', filtro de nombre]
const jobs = [
  ['', (f) => f === 'catalog-index.json' || f === 'aliases.json'],
  ['shelves', (f) => f.endsWith('.json')],
  ['engine', (f) => f.endsWith('.json')],
  ['anchors', (f) => f.endsWith('.json')],
]

let bytes = 0
let count = 0
for (const [dir, ok] of jobs) {
  const from = join(src, dir)
  const to = join(out, dir)
  mkdirSync(to, { recursive: true })
  for (const f of readdirSync(from)) {
    if (!ok(f)) continue
    const dest = join(to, f.replace(/\.json$/, '.data'))
    cpSync(join(from, f), dest)
    bytes += statSync(dest).size
    count++
  }
}
console.log(`copy-data: ${count} archivos, ${(bytes / 1024 / 1024).toFixed(1)} MB -> assets/data`)
