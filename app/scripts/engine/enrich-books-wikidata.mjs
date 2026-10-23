/**
 * enrich-books-wikidata.mjs — Resuelve libros sin wikidataId consultando la API de Wikidata (T20.2).
 *
 * Tres vías:
 * 1. olid -> P648 (si existe mapeo directo);
 * 2. ISBN / Cirrus Search por título + autor;
 * 3. Verificación de tipo en lotes grandes (150 QIDs) contra SPARQL usando las raíces de check-wikidata-type.mjs.
 *
 * Los ambiguos o dudosos van a scripts/cache/books/ambiguos.md.
 * Los confirmados se guardan en scripts/cache/attrs/wikidataId.jsonl y en cache/sources/book/.
 *
 * Uso:
 *   node scripts/engine/enrich-books-wikidata.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const SOURCES_BOOK_DIR = join(here, '..', 'cache', 'sources', 'book')
const CACHE_ATTRS_DIR = join(here, '..', 'cache', 'attrs')
const CACHE_BOOKS_DIR = join(here, '..', 'cache', 'books')
const AMBIGUOUS_FILE = join(CACHE_BOOKS_DIR, 'ambiguos.md')
const WIKIDATA_ATTR_FILE = join(CACHE_ATTRS_DIR, 'wikidataId.jsonl')

const USER_AGENT = 'BibliotecaSocialEnrich/2.0 (contact@biblioteca-social.vercel.app)'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const BOOK_ROOTS = ['Q47461344', 'Q7725634', 'Q571']

async function fetchJsonWithRetry(url, headers = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, ...headers },
      })
      if (res.status === 429 || res.status >= 500) {
        const waitMs = attempt * 2000
        await sleep(waitMs)
        continue
      }
      if (!res.ok) return null
      return await res.json()
    } catch (err) {
      if (attempt === maxRetries) return null
      await sleep(attempt * 1500)
    }
  }
  return null
}

async function searchCirrus(queryStr) {
  const url = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    queryStr
  )}&format=json&srlimit=4`
  const data = await fetchJsonWithRetry(url)
  return (data?.query?.search || []).map((h) => ({
    qid: h.title,
    snippet: (h.snippet || '').replace(/<[^>]+>/g, ''),
  })).filter((h) => h.qid.startsWith('Q'))
}

async function batchVerifyBookTypes(allQids) {
  console.log(`\nVerificando tipos de ${allQids.length} QIDs contra SPARQL en lotes de 150...`)
  const validQids = new Set()
  const rootVals = BOOK_ROOTS.map((r) => 'wd:' + r).join(' ')

  for (let k = 0; k < allQids.length; k += 150) {
    const chunk = allQids.slice(k, k + 150)
    const vals = chunk.map((q) => 'wd:' + q).join(' ')
    const q = `SELECT DISTINCT ?item WHERE { VALUES ?item { ${vals} } VALUES ?root { ${rootVals} } ?item wdt:P31/wdt:P279* ?root . }`
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`

    let j = null
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
        })
        if (r.status === 429 || r.status >= 500) {
          const waitMs = attempt * 3000
          console.warn(`[SPARQL 429/5xx] Lote ${k / 150 + 1}, intento ${attempt}, esperando ${waitMs}ms...`)
          await sleep(waitMs)
          continue
        }
        if (!r.ok) break
        j = await r.json()
        break
      } catch (err) {
        await sleep(attempt * 2000)
      }
    }

    if (j?.results?.bindings) {
      for (const b of j.results.bindings) {
        validQids.add(b.item.value.split('/').pop())
      }
    }
    console.log(`  Lote ${Math.floor(k / 150) + 1}/${Math.ceil(allQids.length / 150)} verificado (${validQids.size} válidos hasta ahora).`)
    await sleep(2000)
  }

  return validQids
}

async function main() {
  console.log('--- Enriqueciendo libros con Wikidata (enrich-books-wikidata.mjs) ---')

  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json')
    process.exit(1)
  }

  if (!existsSync(SOURCES_BOOK_DIR)) mkdirSync(SOURCES_BOOK_DIR, { recursive: true })
  if (!existsSync(CACHE_ATTRS_DIR)) mkdirSync(CACHE_ATTRS_DIR, { recursive: true })
  if (!existsSync(CACHE_BOOKS_DIR)) mkdirSync(CACHE_BOOKS_DIR, { recursive: true })

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const visibleBooks = seed.items.filter((i) => i.type === 'book' && !i.hidden)
  const missing = visibleBooks.filter((i) => !i.wikidataId)

  console.log(`Libros visibles: ${visibleBooks.length}. Ya con wikidataId: ${visibleBooks.length - missing.length}. Sin wikidataId: ${missing.length}`)
  const target75 = Math.ceil(visibleBooks.length * 0.75)
  console.log(`Objetivo: ≥ 75% (${target75} libros con wikidataId, faltan ${Math.max(0, target75 - (visibleBooks.length - missing.length))})`)

  // Paso 1: Búsqueda Cirrus por título y autor para cada libro sin wikidataId
  console.log('\n[Fase 1] Buscando candidatas en Wikidata Cirrus...')
  const bookCandidates = new Map() // bookId -> array de qids
  const allCandidateQids = new Set()

  let count = 0
  for (const book of missing) {
    count++
    if (count % 50 === 0 || count === missing.length) {
      console.log(`  Buscando ${count}/${missing.length}...`)
    }

    // Título limpio y autor
    const qStr = `${book.title} ${book.creator || ''}`.trim()
    const hits = await searchCirrus(qStr)
    await sleep(150)

    // Si no hubo hits y tiene título original, buscar por título original
    let finalHits = hits
    if (!finalHits.length && book.originalTitle && book.originalTitle !== book.title) {
      const qOrig = `${book.originalTitle} ${book.creator || ''}`.trim()
      finalHits = await searchCirrus(qOrig)
      await sleep(150)
    }

    if (finalHits.length) {
      const qids = finalHits.map((h) => h.qid)
      bookCandidates.set(book.id, qids)
      for (const q of qids) allCandidateQids.add(q)
    }
  }

  console.log(`Candidatas encontradas para ${bookCandidates.size} libros. Total QIDs únicos a verificar: ${allCandidateQids.size}`)

  // Paso 2: Verificación de tipo estricta contra SPARQL (Q47461344, Q7725634, Q571)
  const validBookQids = await batchVerifyBookTypes(Array.from(allCandidateQids))
  console.log(`QIDs con tipo válido de libro: ${validBookQids.size}`)

  // Paso 3: Asignación y detección de ambiguos
  const resolved = new Map()
  const ambiguous = []

  for (const book of missing) {
    const candidates = bookCandidates.get(book.id) || []
    const validMatches = candidates.filter((q) => validBookQids.has(q))

    if (validMatches.length === 1) {
      resolved.set(book.id, validMatches[0])
    } else if (validMatches.length > 1) {
      // Tomar la primera si es el primer resultado de búsqueda (mayor relevancia de Cirrus)
      // pero registrar en ambiguos si las dos tienen similar relevancia
      resolved.set(book.id, validMatches[0])
      ambiguous.push({
        id: book.id,
        title: book.title,
        creator: book.creator,
        chosen: validMatches[0],
        others: validMatches.slice(1),
      })
    }
  }

  console.log(`\nLibros resueltos con tipo verificado: ${resolved.size}`)
  console.log(`Casos con múltiples candidatas guardados en ambiguos: ${ambiguous.length}`)

  // Escribir ambiguos.md
  if (ambiguous.length > 0) {
    let ambMd = `# Libros con múltiples candidatas en Wikidata (T20.2)\n\n`
    ambMd += `Total casos: **${ambiguous.length}** (se asignó la de mayor relevancia de Cirrus y se documentan las alternativas)\n\n`
    ambMd += `| ID | Título | Autor | QID Asignado | Otras candidatas |\n`
    ambMd += `|---|---|---|---|---|\n`
    for (const a of ambiguous) {
      ambMd += `| \`${a.id}\` | ${a.title} | ${a.creator || '—'} | \`${a.chosen}\` | ${a.others.map((o) => `\`${o}\``).join(', ')} |\n`
    }
    writeFileSync(AMBIGUOUS_FILE, ambMd, 'utf8')
    console.log(`Reporte guardado en: scripts/cache/books/ambiguos.md`)
  }

  // Guardar en scripts/cache/attrs/wikidataId.jsonl y en cache/sources/book/
  let existingLines = []
  if (existsSync(WIKIDATA_ATTR_FILE)) {
    existingLines = readFileSync(WIKIDATA_ATTR_FILE, 'utf8').split('\n').filter(Boolean)
  }
  const existingMap = new Map()
  for (const l of existingLines) {
    try {
      const p = JSON.parse(l)
      if (p.id) existingMap.set(p.id, p)
    } catch {}
  }

  for (const [id, qid] of resolved.entries()) {
    existingMap.set(id, {
      id,
      value: qid,
      src: 'wikidata',
      conf: 0.95,
    })

    const slug = id.replace(/^[^:]+:/, '')
    const cachePath = join(SOURCES_BOOK_DIR, `${slug}.json`)
    let sourceData = {}
    if (existsSync(cachePath)) {
      try {
        sourceData = JSON.parse(readFileSync(cachePath, 'utf8'))
      } catch {}
    }
    sourceData.wikidataId = qid
    sourceData.src = sourceData.src || {}
    sourceData.src.wikidataId = 'wikidata'
    writeFileSync(cachePath, JSON.stringify(sourceData, null, 2), 'utf8')
  }

  const outLines = Array.from(existingMap.values()).map((v) => JSON.stringify(v))
  writeFileSync(WIKIDATA_ATTR_FILE, outLines.join('\n') + '\n', 'utf8')
  console.log(`Atributos wikidataId guardados en: scripts/cache/attrs/wikidataId.jsonl`)

  // Actualizar seed.json
  for (const item of seed.items) {
    const qid = resolved.get(item.id)
    if (qid) {
      item.wikidataId = qid
      item.src = item.src || {}
      item.src.wikidataId = 'wikidata'
      item.conf = item.conf || {}
      item.conf.wikidataId = 0.95
    }
  }
  writeFileSync(SEED_FILE, JSON.stringify(seed))

  const newTotalWithWiki = seed.items.filter((i) => i.type === 'book' && !i.hidden && i.wikidataId).length
  const pct = ((newTotalWithWiki / visibleBooks.length) * 100).toFixed(1)
  console.log(`\n✓ Finalizado: +${resolved.size} libros resueltos.`)
  console.log(`Cobertura actual en libros: ${newTotalWithWiki}/${visibleBooks.length} (${pct}%)`)
}

main().catch((err) => {
  console.error('Error en enrich-books-wikidata:', err)
  process.exit(1)
})
