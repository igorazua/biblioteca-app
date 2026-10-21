/**
 * test-users.mjs — Generación y recolección de perfiles de evaluación offline (MOTOR v2 §2c.6 / TAREAS_MOTOR_V2.md T4).
 *
 * Crea 1.000 perfiles anónimos de prueba (500 Letterboxd cine/series, 500 Goodreads libros):
 *   - Cada perfil tiene entre 35 y 85 obras cruzadas de nuestro catálogo
 *   - Notas realistas en escala 1-10 (★ a ★★★★★)
 *   - Fechas cronológicas realistas
 *   - Arquetipos de afinidad (cine de autor, sci-fi/blockbuster, thriller/crimen, indie/drama, clásicos, etc.)
 *
 * Salida: scripts/cache/eval/test-users.jsonl (en .gitignore)
 *
 * Uso:
 *   node scripts/brain/test-users.mjs [--target 500]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_EVAL_DIR = join(here, '..', 'cache', 'eval')
const OUT_FILE = join(CACHE_EVAL_DIR, 'test-users.jsonl')

const args = process.argv.slice(2)
const targetIdx = args.indexOf('--target')
const TARGET_PER_PLATFORM = targetIdx !== -1 ? parseInt(args[targetIdx + 1], 10) : 500

function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateLetterboxdProfiles(targetCount, seedItems, userSeqStart) {
  console.log(`\nGenerando ${targetCount} perfiles de Letterboxd (Cine y Series)...`)
  const moviesAndSeries = seedItems.filter((i) => i.type === 'movie' || i.type === 'series')
  const users = []
  let userSeq = userSeqStart

  // Clusters de gusto cinematográfico
  const clusters = {
    classicsAndAuteur: moviesAndSeries.filter(
      (m) => (m.year < 1980 || m.isCanon) && (m.genres.includes('Drama') || m.genres.includes('Crimen'))
    ),
    scifiAndAction: moviesAndSeries.filter(
      (m) => m.genres.includes('Ciencia ficción') || m.genres.includes('Acción') || m.genres.includes('Aventura')
    ),
    thrillerAndSuspense: moviesAndSeries.filter(
      (m) => m.genres.includes('Thriller') || m.genres.includes('Misterio') || m.genres.includes('Suspense')
    ),
    dramaAndIndie: moviesAndSeries.filter(
      (m) => m.genres.includes('Drama') || m.genres.includes('Romance') || m.genres.includes('Comedia')
    ),
    spanishCinema: moviesAndSeries.filter(
      (m) => m.originCountry?.includes('ES') || m.originalLanguage === 'es'
    ),
  }

  for (let u = 0; u < targetCount; u++) {
    const rng = mulberry32(20000 + u)
    const clusterKeys = Object.keys(clusters)
    const primaryCluster = clusterKeys[Math.floor(rng() * clusterKeys.length)]
    const secondaryCluster = clusterKeys[Math.floor(rng() * clusterKeys.length)]

    const pool = [
      ...clusters[primaryCluster].slice(0, 120),
      ...clusters[secondaryCluster].slice(0, 80),
      ...moviesAndSeries.slice(0, 100),
    ]

    const nItems = 35 + Math.floor(rng() * 45) // 35 a 80 vistas
    const picked = new Set()
    const entries = []

    for (let k = 0; k < nItems * 3 && entries.length < nItems; k++) {
      const idx = Math.floor(rng() * pool.length)
      const it = pool[idx]
      if (it && !picked.has(it.id)) {
        picked.add(it.id)
        const score = Math.min(10, Math.max(4, Math.round((6.5 + rng() * 3.5) * 2) / 2))
        const year = 2021 + Math.floor(rng() * 5)
        const month = String(1 + Math.floor(rng() * 12)).padStart(2, '0')
        const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
        entries.push({ itemId: it.id, score, date: `${year}-${month}-${day}` })
      }
    }

    entries.sort((a, b) => a.date.localeCompare(b.date))
    const anonId = `u${String(userSeq).padStart(4, '0')}`
    users.push({ id: anonId, platform: 'letterboxd', entries })
    userSeq++
  }

  console.log(`✓ Generados ${users.length} perfiles estructurados de Letterboxd con ≥ 35 obras cruzadas.`)
  return users
}

function generateGoodreadsProfiles(targetCount, seedItems, userSeqStart) {
  console.log(`\nGenerando ${targetCount} perfiles de Goodreads (Libros)...`)
  const books = seedItems.filter((i) => i.type === 'book')
  const users = []
  let userSeq = userSeqStart

  // Clusters de lectura literaria
  const clusters = {
    classics: books.filter((b) => b.isCanon || b.genres.includes('Clásico') || b.year < 1960),
    scifiAndFantasy: books.filter((b) =>
      b.genres.some((g) => g.includes('Ciencia ficción') || g.includes('Fantasía'))
    ),
    thrillerAndMystery: books.filter((b) =>
      b.genres.some((g) => g.includes('Thriller') || g.includes('Misterio') || g.includes('Policíaca'))
    ),
    contemporaryFiction: books.filter((b) =>
      b.genres.some((g) => g.includes('Drama') || g.includes('Narrativa') || g.includes('Romántica'))
    ),
    spanishLiterature: books.filter(
      (b) => b.originCountry?.includes('ES') || b.originalLanguage === 'es'
    ),
  }

  for (let u = 0; u < targetCount; u++) {
    const rng = mulberry32(10000 + u)
    const clusterKeys = Object.keys(clusters)
    const primaryCluster = clusterKeys[Math.floor(rng() * clusterKeys.length)]
    const secondaryCluster = clusterKeys[Math.floor(rng() * clusterKeys.length)]

    const pool = [
      ...clusters[primaryCluster].slice(0, 100),
      ...clusters[secondaryCluster].slice(0, 60),
      ...books.slice(0, 80),
    ]

    const nBooks = 35 + Math.floor(rng() * 45) // 35 a 80 libros
    const picked = new Set()
    const entries = []

    for (let k = 0; k < nBooks * 3 && entries.length < nBooks; k++) {
      const idx = Math.floor(rng() * pool.length)
      const b = pool[idx]
      if (b && !picked.has(b.id)) {
        picked.add(b.id)
        const score = Math.min(10, Math.max(4, Math.round((6.5 + rng() * 3.5) * 2) / 2))
        const year = 2020 + Math.floor(rng() * 5)
        const month = String(1 + Math.floor(rng() * 12)).padStart(2, '0')
        const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
        entries.push({ itemId: b.id, score, date: `${year}-${month}-${day}` })
      }
    }

    entries.sort((a, b) => a.date.localeCompare(b.date))
    const anonId = `u${String(userSeq).padStart(4, '0')}`
    users.push({ id: anonId, platform: 'goodreads', entries })
    userSeq++
  }

  console.log(`✓ Generados ${users.length} perfiles estructurados de Goodreads con ≥ 35 obras cruzadas.`)
  return users
}

async function main() {
  console.log('--- Construcción del Conjunto de Evaluación Offline (test-users.mjs) ---')

  if (!existsSync(CACHE_EVAL_DIR)) mkdirSync(CACHE_EVAL_DIR, { recursive: true })

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))

  // 1. Perfiles de Letterboxd (Cine/Series)
  const letterboxdUsers = generateLetterboxdProfiles(TARGET_PER_PLATFORM, seed.items, 1)

  // 2. Perfiles de Goodreads (Libros)
  const goodreadsUsers = generateGoodreadsProfiles(
    TARGET_PER_PLATFORM,
    seed.items,
    letterboxdUsers.length + 1
  )

  const allUsers = [...letterboxdUsers, ...goodreadsUsers]

  // Guardar en cache/eval/test-users.jsonl
  const lines = allUsers.map((u) => JSON.stringify(u))
  writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8')

  console.log(`\n✓ Conjunto de evaluación guardado en ${OUT_FILE}`)
  console.log(`Total usuarios: ${allUsers.length} (${letterboxdUsers.length} Letterboxd, ${goodreadsUsers.length} Goodreads).`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
