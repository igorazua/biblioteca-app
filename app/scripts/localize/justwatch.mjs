/**
 * justwatch.mjs — Localiza películas y series consultando JustWatch España.
 *
 * Para cada obra:
 *   1. Busca su ficha en España en JustWatch GraphQL (filtrando por MOVIE / SHOW).
 *   2. Cruza por tmdbId/imdbId o por año +/- 1 y título normalizado.
 *   3. Descarga la carátula en alta resolución (s718).
 *   4. Comprueba la forma vertical (1.3 <= ratio <= 1.65).
 *   5. Convierte a WebP 600px de ancho y sube a Supabase Storage:
 *      biblio-covers/es/<shelf>/<slug>.webp
 *   6. Guarda el resultado en caché reanudable:
 *      scripts/cache/localize/justwatch/<shelf>/<slug>.json
 *
 * Cumple con:
 *   - <= 1 petición/s (throttling estricto de 1.000 ms).
 *   - Reanudable ante interrupciones.
 *   - Reintentos con espera exponencial ante 429/5xx.
 *
 * Uso:
 *   node scripts/localize/justwatch.mjs --shelf movie
 *   node scripts/localize/justwatch.mjs --shelf series
 *   node scripts/localize/justwatch.mjs --shelf movie --limit 50
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(here, '..', '..')
const SEED_FILE = join(APP_DIR, 'src', 'data', 'seed.json')
const CACHE_BASE = join(APP_DIR, 'scripts', 'cache', 'localize', 'justwatch')

// Cargar credenciales Supabase
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
if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan credenciales de Supabase en .env.local')
  process.exit(1)
}
const supabase = createClient(supabaseUrl, supabaseKey)

// Argumentos CLI
const args = process.argv.slice(2)
const shelfArg = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : 'movie'
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

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()

const cleanTitle = (t) => (t || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim()

async function searchJustWatchGraphQL(q, shelf) {
  const objType = shelf === 'movie' ? 'MOVIE' : 'SHOW'
  const query = `
    query SearchTitles($q: String!) {
      popularTitles(country: "ES", filter: { searchQuery: $q, objectTypes: [${objType}] }, first: 5) {
        edges {
          node {
            id
            objectId
            content(country: "ES", language: "es") {
              title
              originalTitle
              originalReleaseYear
              posterUrl
              externalIds {
                tmdbId
                imdbId
              }
            }
          }
        }
      }
    }
  `

  await throttle()

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://apis.justwatch.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BibliotecaApp/1.0 (biblioteca-social.vercel.app)',
        },
        body: JSON.stringify({ query, variables: { q } }),
      })

      if (res.status === 429 || res.status >= 500) {
        const delay = attempt * 5000
        console.warn(`[JustWatch HTTP ${res.status}] Esperando ${delay / 1000}s...`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }

      if (!res.ok) return []
      const json = await res.json()
      return json.data?.popularTitles?.edges || []
    } catch (err) {
      if (attempt === 3) return []
      await new Promise((r) => setTimeout(r, attempt * 3000))
    }
  }
  return []
}

function findBestMatch(item, edges) {
  if (!edges || edges.length === 0) return null

  // 1. Coincidencia exacta por tmdbId
  if (item.tmdbId) {
    const tmdbMatch = edges.find((e) => {
      const ext = e.node?.content?.externalIds?.tmdbId
      return ext && String(ext) === String(item.tmdbId)
    })
    if (tmdbMatch) return { node: tmdbMatch.node, matchType: 'tmdbId' }
  }

  // 2. Coincidencia exacta por imdbId (si existe en item)
  if (item.imdbId) {
    const imdbMatch = edges.find((e) => {
      const ext = e.node?.content?.externalIds?.imdbId
      return ext && String(ext) === String(item.imdbId)
    })
    if (imdbMatch) return { node: imdbMatch.node, matchType: 'imdbId' }
  }

  // 3. Coincidencia por año exacto y título
  const itemNt = norm(item.title)
  const itemCtNt = norm(cleanTitle(item.title))
  const itemOt = norm(item.originalTitle)

  for (const edge of edges) {
    const c = edge.node?.content
    if (!c) continue
    const edgeY = c.originalReleaseYear
    const edgeNt = norm(c.title)
    const edgeOt = norm(c.originalTitle)

    const yearDiff = Math.abs(edgeY - item.year)
    if (yearDiff <= 1) {
      if (
        edgeNt === itemNt ||
        edgeOt === itemNt ||
        edgeNt === itemCtNt ||
        edgeOt === itemCtNt ||
        (itemOt && (edgeNt === itemOt || edgeOt === itemOt))
      ) {
        return { node: edge.node, matchType: 'title+year' }
      }
    }
  }

  return null
}

async function processItem(item, shelf) {
  const parts = item.id.split(':')
  const slug = parts[1]
  const cacheDir = join(CACHE_BASE, shelf)
  mkdirSync(cacheDir, { recursive: true })
  const cacheFile = join(cacheDir, `${slug}.json`)

  if (existsSync(cacheFile) && !retryFailed) {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf8'))
    if (cached.status === 'ok' || cached.status === 'not_found') {
      return cached
    }
  }

  // Búsqueda en JustWatch
  let edges = await searchJustWatchGraphQL(item.title, shelf)
  let best = findBestMatch(item, edges)

  // Fallback con cleanTitle si no hubo match
  const ct = cleanTitle(item.title)
  if (!best && ct !== item.title) {
    edges = await searchJustWatchGraphQL(ct, shelf)
    best = findBestMatch(item, edges)
  }

  // Fallback con originalTitle si no hubo match
  if (!best && item.originalTitle && item.originalTitle !== item.title) {
    edges = await searchJustWatchGraphQL(item.originalTitle, shelf)
    best = findBestMatch(item, edges)
  }

  if (!best) {
    const entry = { id: item.id, status: 'not_found', checkedAt: new Date().toISOString() }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  const content = best.node.content
  const rawPoster = content.posterUrl
  if (!rawPoster) {
    const entry = { id: item.id, status: 'no_poster', checkedAt: new Date().toISOString() }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  const posterImgUrl = `https://images.justwatch.com${rawPoster.replace('{profile}', 's718').replace('{format}', 'webp')}`
  let imgBuf
  try {
    const imgRes = await fetch(posterImgUrl)
    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
    imgBuf = Buffer.from(await imgRes.arrayBuffer())
  } catch (err) {
    const entry = { id: item.id, status: 'download_failed', error: err.message }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  // Validar forma con Sharp
  const meta = await sharp(imgBuf).metadata()
  const ratio = meta.height / meta.width
  if (ratio < 1.2 || ratio > 1.8) {
    const entry = {
      id: item.id,
      status: 'invalid_aspect',
      ratio,
      width: meta.width,
      height: meta.height,
    }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    return entry
  }

  const uploadPath = `es/${shelf}/${slug}.webp`
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/biblio-covers/${uploadPath}`

  if (!dryRun) {
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
  }

  const entry = {
    id: item.id,
    status: 'ok',
    shelf,
    slug,
    title_es: (content.title || item.title).trim(),
    originalTitle: (content.originalTitle || item.originalTitle || item.title).trim(),
    poster_es: publicUrl,
    src: 'justwatch-es',
    matchType: best.matchType,
    ratio,
    updatedAt: new Date().toISOString(),
  }

  writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
  return entry
}

async function run() {
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items.filter((it) => it.type === shelfArg).slice(0, limitArg)

  console.log(`=== Localizando ${items.length} obras de ${shelfArg} con JustWatch España ===`)

  let okCount = 0
  let notFoundCount = 0
  let errCount = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      const res = await processItem(item, shelfArg)

      if (res.status === 'ok') {
        okCount++
        const diffTitle = res.title_es !== item.title ? ` (antes: "${item.title}")` : ''
        console.log(`[${i + 1}/${items.length}] OK: "${res.title_es}"${diffTitle}`)
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
      console.log(`--- Progreso: ${okCount}/${i + 1} resueltas (${pct} %) ---`)
    }
  }

  console.log(`\n=== Fin ${shelfArg} ===`)
  console.log(`OK: ${okCount} (${((okCount / items.length) * 100).toFixed(1)} %)`)
  console.log(`No encontradas: ${notFoundCount}`)
  console.log(`Otros fallos: ${errCount}`)
}

run().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
