/**
 * Títulos de España para pelis y series que el seed tiene con el título en inglés («Back to the Future» →
 * «Regreso al futuro»). Las listas están en scripts/cache/titles/es-<tipo>.json, con la clave «Título original (año)»,
 * revisadas a mano: solo llevan las obras que se estrenaron en España con otro título (las que lo mantienen, como
 * «Pulp Fiction» o «Breaking Bad», no aparecen).
 *
 * El título original se guarda en `originalTitle` para casar imports de Letterboxd/IMDb, que vienen en inglés.
 * Idempotente. Se ejecuta en `npm run seed` antes de dedupe-twins.mjs.
 * Uso: node scripts/localize-titles.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SEED_FILE = join(here, '..', 'src', 'data', 'seed.json')
const TITLES_DIR = join(here, 'cache', 'titles')

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf-8'))
let changed = 0
const unused = []
for (const type of ['movie', 'series', 'book', 'boardgame']) {
  const file = join(TITLES_DIR, `es-${type}.json`)
  if (!existsSync(file)) continue
  const map = JSON.parse(readFileSync(file, 'utf-8'))
  const used = new Set()
  for (const it of seed.items) {
    if (it.type !== type) continue
    const original = it.originalTitle ?? it.title
    const key = `${original} (${it.year})`
    const es = map[key]
    if (!es) continue
    used.add(key)
    if (it.title !== es) {
      it.originalTitle = original
      it.title = es
      changed++
    }
  }
  unused.push(...Object.keys(map).filter((k) => !used.has(k)).map((k) => `${type}: ${k}`))
}

writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
console.log(`Títulos en español aplicados: ${changed}`)
if (unused.length) console.log(`Sin obra en el seed (${unused.length}):\n  ${unused.join('\n  ')}`)
