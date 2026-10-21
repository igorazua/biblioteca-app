/**
 * enrich-books-wikidata.mjs — Resuelve libros sin wikidataId consultando la API de Wikidata.
 *
 * MOTOR v2 §2b.2 / T3.2: Objetivo ≥ 60% de libros con wikidataId.
 *
 * Uso:
 *   node scripts/engine/enrich-books-wikidata.mjs [--limit 500]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const SOURCES_BOOK_DIR = join(here, '..', 'cache', 'sources', 'book')

const USER_AGENT = 'BibliotecaSocial/1.0.0 ( contact@biblioteca-social.vercel.app )'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const args = process.argv.slice(2)
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null

async function fetchJson(url) {
  const maxRetries = 2
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) return null
      return await res.json()
    } catch {
      if (attempt === maxRetries) return null
      await sleep(300)
    }
  }
  return null
}

function matchesBook(entity, title, creator) {
  const desc = (entity.description || '').toLowerCase()
  const label = (entity.label || '').toLowerCase()
  const cleanTitle = title.toLowerCase().trim()

  const isLiterary =
    desc.includes('novel') ||
    desc.includes('novela') ||
    desc.includes('book') ||
    desc.includes('libro') ||
    desc.includes('written work') ||
    desc.includes('obra literaria') ||
    desc.includes('literary work') ||
    desc.includes('ensayo') ||
    desc.includes('essay') ||
    desc.includes('poem') ||
    desc.includes('poema') ||
    desc.includes('play') ||
    desc.includes('obra de teatro') ||
    desc.includes('tragedy') ||
    desc.includes('comedy') ||
    desc.includes('short story') ||
    desc.includes('relato')

  if (!isLiterary) return false

  // Si tenemos autor, buscar apellido del autor en la descripción
  if (creator) {
    const parts = creator.split(' ').map((p) => p.trim().toLowerCase()).filter((p) => p.length > 2)
    const surname = parts[parts.length - 1]
    if (surname && desc.includes(surname)) {
      return true
    }
  }

  // Si el título coincide exactamente o empieza por él
  if (label === cleanTitle || label.startsWith(cleanTitle)) {
    return true
  }

  return false
}

async function main() {
  console.log('--- Enriqueciendo libros con Wikidata (enrich-books-wikidata.mjs) ---')

  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json')
    process.exit(1)
  }

  if (!existsSync(SOURCES_BOOK_DIR)) mkdirSync(SOURCES_BOOK_DIR, { recursive: true })

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const books = seed.items.filter((i) => i.type === 'book')
  const missing = books.filter((i) => !i.wikidataId)

  console.log(`Libros totales: ${books.length}. Sin wikidataId: ${missing.length}`)

  let targets = missing
  if (LIMIT) targets = targets.slice(0, LIMIT)

  let resolved = 0
  let skipped = 0
  const BATCH_SIZE = 5

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE)
    await Promise.all(
      chunk.map(async (book) => {
        const slug = book.id.replace(/^[^:]+:/, '')
        const cachePath = join(SOURCES_BOOK_DIR, `${slug}.json`)

        // Buscar en Wikidata por título
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
          book.title
        )}&language=es&format=json&limit=5`
        const data = await fetchJson(searchUrl)
        await sleep(150)

        const hits = data?.search || []
        let matched = null
        for (const h of hits) {
          if (matchesBook(h, book.title, book.creator)) {
            matched = h
            break
          }
        }

        // Si no encontramos con búsqueda en español, intentar con título original si existe
        if (!matched && book.originalTitle && book.originalTitle !== book.title) {
          const searchEnUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
            book.originalTitle
          )}&language=en&format=json&limit=5`
          const dataEn = await fetchJson(searchEnUrl)
          await sleep(150)
          for (const h of dataEn?.search || []) {
            if (matchesBook(h, book.originalTitle, book.creator)) {
              matched = h
              break
            }
          }
        }

        if (matched) {
          resolved++
          book.wikidataId = matched.id
          book.src = book.src || {}
          book.src.wikidataId = 'wikidata'

          // Actualizar caché de sources
          let sourceData = {}
          if (existsSync(cachePath)) {
            try {
              sourceData = JSON.parse(readFileSync(cachePath, 'utf8'))
            } catch {}
          }
          sourceData.wikidataId = matched.id
          sourceData.src = sourceData.src || {}
          sourceData.src.wikidataId = 'wikidata'
          writeFileSync(cachePath, JSON.stringify(sourceData, null, 2), 'utf8')
        } else {
          skipped++
        }
      })
    )

    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= targets.length) {
      console.log(`  Procesados: ${Math.min(i + BATCH_SIZE, targets.length)}/${targets.length} (resueltos: ${resolved}, sin match: ${skipped})`)
    }
  }

  writeFileSync(SEED_FILE, JSON.stringify(seed))
  const newWithWiki = seed.items.filter((i) => i.type === 'book' && i.wikidataId).length
  console.log(`\n✓ Finalizado: +${resolved} libros resueltos con Wikidata.`)
  console.log(`Cobertura actual en libros: ${newWithWiki}/${books.length} (${((newWithWiki / books.length) * 100).toFixed(1)}%)`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
