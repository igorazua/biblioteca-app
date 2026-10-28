/**
 * books.mjs — Localiza portadas y títulos de libros en español.
 *
 * Fuentes:
 *   1. Obras con originalLanguage === 'es': la portada existente ya es en español.
 *      Se redimensiona y sube a biblio-covers/es/book/<slug>.webp.
 *   2. Búsqueda de ediciones en español en Open Library:
 *      - /search/editions.json?q={título}+{autor}&language=spa
 *      - /works/{olid}/editions.json?limit=100
 *   3. Selección de la mejor edición (editorial española reconocida, título coincidente, carátula válida).
 *   4. Validación de aspecto vertical (1.25 <= ratio <= 1.75) con Sharp.
 *   5. Subida a Supabase Storage: biblio-covers/es/book/<slug>.webp.
 *   6. Caché reanudable en scripts/cache/localize/books/<slug>.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(here, '..', '..')
const SEED_FILE = join(APP_DIR, 'src', 'data', 'seed.json')
const CACHE_DIR = join(APP_DIR, 'scripts', 'cache', 'localize', 'book')
mkdirSync(CACHE_DIR, { recursive: true })

// Credenciales Supabase
const envPath = join(APP_DIR, '.env.local')
if (!existsSync(envPath)) {
  console.error('No se encontró .env.local')
  process.exit(1)
}
const env = readFileSync(envPath, 'utf8')
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'))
  return m ? m[1].trim() : ''
}
const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

// Argumentos CLI
const args = process.argv.slice(2)
const limitArg = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity
const dryRun = args.includes('--dry')
const retryFailed = args.includes('--retry-failed')

const MIN_GAP_MS = 1000
let lastReqTime = 0

async function throttle() {
  const now = Date.now()
  const wait = MIN_GAP_MS - (now - lastReqTime)
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait))
  }
  lastReqTime = Date.now()
}

const SPANISH_PUBLISHERS = [
  'planeta', 'alfaguara', 'anagrama', 'alianza', 'tusquets', 'mondadori',
  'seix barral', 'salamandra', 'catedra', 'cátedra', 'debolsillo', 'minotauro',
  'roca', 'destino', 'plaza & janes', 'plaza & janés', 'plaza y janes',
  'siruela', 'acantilado', 'espasa', 'lumen', 'grijalbo', 'peninsula', 'península',
  'austral', 'valdemar', 'alba', 'norma', 'sudamericana', 'fce', 'fondo de cultura',
  'paidos', 'paidós', 'taurus', 'critica', 'crítica', 'ariel', 'aguilar', 'bruguera',
  'impedimenta', 'sexto piso', 'paginas de espuma', 'páginas de espuma', 'maimés',
  'edhasa', 'castalia', 'juventud', 'barral', 'mortiz', 'losada', 'penguin random house'
]

function isSpanishPublisher(publishers) {
  if (!publishers || !Array.isArray(publishers)) return false
  const joined = publishers.join(' ').toLowerCase()
  return SPANISH_PUBLISHERS.some((sp) => joined.includes(sp))
}

function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
}

function isTitleClose(candidateTitle, targetTitle) {
  const cNorm = norm(candidateTitle)
  const tNorm = norm(targetTitle)
  if (!cNorm || !tNorm) return false
  if (cNorm === tNorm) return true
  
  // Si el candidato tiene subtítulo tras dos puntos o guión:
  const cMain = norm(candidateTitle.split(/[:\-(]/)[0])
  const tMain = norm(targetTitle.split(/[:\-(]/)[0])
  if (cMain === tNorm || cNorm === tMain || cMain === tMain) return true

  return false
}

async function fetchJsonWithRetry(url) {
  await throttle()
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BibliotecaApp/1.0 (biblioteca-social.vercel.app)' },
      })
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, attempt * 4000))
        continue
      }
      if (!res.ok) return null
      return await res.json()
    } catch (err) {
      if (attempt === 3) return null
      await new Promise((r) => setTimeout(r, attempt * 2000))
    }
  }
  return null
}

async function findSpanishBook(b) {
  // 1. Prioridad: ediciones directas de b.olid (mismo work canónico)
  if (b.olid) {
    const workUrl = `https://openlibrary.org/works/${b.olid}/editions.json?limit=100`
    const workJson = await fetchJsonWithRetry(workUrl)

    if (workJson && workJson.entries && workJson.entries.length > 0) {
      const spaEds = workJson.entries.filter((e) => {
        if (!e.covers || e.covers.length === 0 || e.covers[0] === -1) return false
        const hasSpaLang = e.languages?.some((l) => l.key === '/languages/spa')
        const hasSpaPub = isSpanishPublisher(e.publishers)
        const close = isTitleClose(e.title || b.title, b.title)
        return (hasSpaLang || hasSpaPub) && close
      })

      if (spaEds.length > 0) {
        spaEds.sort((a, bDoc) => {
          const aPub = isSpanishPublisher(a.publishers) ? 1 : 0
          const bPub = isSpanishPublisher(bDoc.publishers) ? 1 : 0
          if (aPub !== bPub) return bPub - aPub
          const aYear = parseInt(String(a.publish_date || '').match(/\d{4}/)?.[0] || '0', 10)
          const bYear = parseInt(String(bDoc.publish_date || '').match(/\d{4}/)?.[0] || '0', 10)
          return bYear - aYear
        })

        const best = spaEds[0]
        const imgUrl = `https://covers.openlibrary.org/b/id/${best.covers[0]}-L.jpg`
        return {
          title_es: (best.title || b.title).trim(),
          originalTitle: b.originalTitle || b.title,
          coverUrl: imgUrl,
          src: 'openlibrary-editions',
          publisher: best.publishers?.[0],
        }
      }
    }
  }

  // 2. Fallback: búsqueda de ediciones en español por título y autor
  const q = encodeURIComponent(`${b.title} ${b.creator}`)
  const searchUrl = `https://openlibrary.org/search/editions.json?q=${q}&language=spa&limit=10`
  const searchJson = await fetchJsonWithRetry(searchUrl)

  if (searchJson && searchJson.docs && searchJson.docs.length > 0) {
    const validDocs = searchJson.docs.filter((d) => {
      if (!d.cover_i || d.cover_i === -1) return false
      return isTitleClose(d.title, b.title)
    })

    if (validDocs.length > 0) {
      validDocs.sort((a, bDoc) => {
        const aPub = isSpanishPublisher(a.publisher) ? 1 : 0
        const bPub = isSpanishPublisher(bDoc.publisher) ? 1 : 0
        if (aPub !== bPub) return bPub - aPub
        const aYear = parseInt(String(a.publish_date || '').match(/\d{4}/)?.[0] || '0', 10)
        const bYear = parseInt(String(bDoc.publish_date || '').match(/\d{4}/)?.[0] || '0', 10)
        return bYear - aYear
      })

      const best = validDocs[0]
      const imgUrl = `https://covers.openlibrary.org/b/id/${best.cover_i}-L.jpg`
      return {
        title_es: best.title.trim(),
        originalTitle: b.originalTitle || b.title,
        coverUrl: imgUrl,
        src: 'openlibrary-search-editions',
        publisher: best.publisher?.[0],
      }
    }
  }

  // 3. Fallback: buscar la obra principal en Open Library si el olid del seed era una adaptación
  try {
    const qWork = encodeURIComponent(`${b.title} ${b.creator}`)
    const workSearchUrl = `https://openlibrary.org/search.json?q=${qWork}&limit=3`
    const workSearchJson = await fetchJsonWithRetry(workSearchUrl)

    if (workSearchJson && workSearchJson.docs && workSearchJson.docs.length > 0) {
      for (const doc of workSearchJson.docs) {
        if (!doc.key || doc.key === `/works/${b.olid}`) continue
        const docEditionsUrl = `https://openlibrary.org${doc.key}/editions.json?limit=100`
        const docEditionsJson = await fetchJsonWithRetry(docEditionsUrl)
        if (!docEditionsJson || !docEditionsJson.entries) continue

        const spaEds = docEditionsJson.entries.filter((e) => {
          if (!e.covers || e.covers.length === 0 || e.covers[0] === -1) return false
          const hasSpaLang = e.languages?.some((l) => l.key === '/languages/spa')
          const hasSpaPub = isSpanishPublisher(e.publishers)
          const close = isTitleClose(e.title || b.title, b.title)
          return (hasSpaLang || hasSpaPub) && close
        })

        if (spaEds.length > 0) {
          spaEds.sort((a, bDoc) => {
            const aPub = isSpanishPublisher(a.publishers) ? 1 : 0
            const bPub = isSpanishPublisher(bDoc.publishers) ? 1 : 0
            if (aPub !== bPub) return bPub - aPub
            const aYear = parseInt(String(a.publish_date || '').match(/\d{4}/)?.[0] || '0', 10)
            const bYear = parseInt(String(bDoc.publish_date || '').match(/\d{4}/)?.[0] || '0', 10)
            return bYear - aYear
          })

          const best = spaEds[0]
          const imgUrl = `https://covers.openlibrary.org/b/id/${best.covers[0]}-L.jpg`
          return {
            title_es: (best.title || b.title).trim(),
            originalTitle: b.originalTitle || b.title,
            coverUrl: imgUrl,
            src: 'openlibrary-topwork-editions',
            publisher: best.publishers?.[0],
          }
        }
      }
    }
  } catch {}

  return null
}

async function processBook(item) {
  const parts = item.id.split(':')
  const slug = parts[1]
  const cacheFile = join(CACHE_DIR, `${slug}.json`)

  if (existsSync(cacheFile) && !retryFailed) {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf8'))
    if (cached.status === 'ok' || cached.status === 'not_found') {
      return cached
    }
  }

  let found = null

  if (item.originalLanguage === 'es') {
    found = {
      title_es: item.title,
      originalTitle: item.title,
      coverUrl: item.posterUrl,
      src: 'original-es',
    }
  } else {
    found = await findSpanishBook(item)
  }

  if (!found || !found.coverUrl) {
    const entry = { id: item.id, status: 'not_found', checkedAt: new Date().toISOString() }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  // Descargar portada
  let imgBuf
  try {
    const imgRes = await fetch(found.coverUrl)
    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
    imgBuf = Buffer.from(await imgRes.arrayBuffer())
  } catch (err) {
    const entry = { id: item.id, status: 'download_failed', error: err.message }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  // Validar dimensiones y proporción
  let meta
  try {
    meta = await sharp(imgBuf).metadata()
  } catch (err) {
    const entry = { id: item.id, status: 'invalid_image', error: err.message }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  if (!meta.width || !meta.height || meta.width < 50 || meta.height < 50) {
    const entry = { id: item.id, status: 'too_small', width: meta.width, height: meta.height }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  const ratio = meta.height / meta.width
  if (ratio < 1.2 || ratio > 1.8) {
    const entry = { id: item.id, status: 'invalid_aspect', ratio, width: meta.width, height: meta.height }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  const uploadPath = `es/book/${slug}.webp`
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/biblio-covers/${uploadPath}`

  if (!dryRun) {
    try {
      const processedBuf = await sharp(imgBuf)
        .resize({ width: 600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()

      const { error } = await supabase.storage.from('biblio-covers').upload(uploadPath, processedBuf, {
        contentType: 'image/webp',
        upsert: true,
      })

      if (error) {
        const entry = { id: item.id, status: 'upload_failed', error: error.message }
        writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
        return entry
      }
    } catch (err) {
      const entry = { id: item.id, status: 'processing_failed', error: err.message }
      writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
      return entry
    }
  }

  const entry = {
    id: item.id,
    status: 'ok',
    shelf: 'book',
    slug,
    title_es: found.title_es,
    originalTitle: found.originalTitle || item.originalTitle || item.title,
    poster_es: publicUrl,
    src: found.src,
    ratio,
    publisher: found.publisher,
    updatedAt: new Date().toISOString(),
  }

  writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
  return entry
}

async function run() {
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items.filter((it) => it.type === 'book').slice(0, limitArg)

  console.log(`=== Localizando ${items.length} libros con Open Library / Original ES ===`)

  let okCount = 0
  let notFoundCount = 0
  let errCount = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      const res = await processBook(item)

      if (res.status === 'ok') {
        okCount++
        const diffTitle = res.title_es !== item.title ? ` (antes: "${item.title}")` : ''
        console.log(`[${i + 1}/${items.length}] OK: "${res.title_es}"${diffTitle} [${res.src}]`)
      } else {
        if (res.status === 'not_found') notFoundCount++
        else errCount++
        console.log(`[${i + 1}/${items.length}] ${res.status}: "${item.title}"`)
      }
    } catch (err) {
      errCount++
      console.error(`[${i + 1}/${items.length}] ERROR inesperado: "${item.title}" - ${err.message}`)
    }

    if ((i + 1) % 25 === 0 || i === items.length - 1) {
      const pct = (((okCount) / (i + 1)) * 100).toFixed(1)
      console.log(`--- Progreso libros: ${okCount}/${i + 1} resueltos (${pct} %) ---`)
    }
  }

  console.log(`\n=== Fin Libros ===`)
  console.log(`OK: ${okCount} (${((okCount / items.length) * 100).toFixed(1)} %)`)
  console.log(`No encontrados: ${notFoundCount}`)
  console.log(`Otros fallos: ${errCount}`)
}

run().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
