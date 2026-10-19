// app/scripts/normalize-seed.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeGenres } from './engine/genres-es.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const seedPath = path.resolve(__dirname, '../src/data/seed.json')

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
let updatedCount = 0

for (const item of seedData.items) {
  if (item.genres && Array.isArray(item.genres)) {
    const orig = JSON.stringify(item.genres)
    const norm = normalizeGenres(item.genres)
    if (JSON.stringify(norm) !== orig) {
      item.genres = norm
      updatedCount++
    }
  }
}

fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8')
console.log(`Normalizados géneros en ${updatedCount} de ${seedData.items.length} obras en seed.json.`)
