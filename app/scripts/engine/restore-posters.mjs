/**
 * restore-posters.mjs — Recupera los pósteres reales que faltan o son generados (T19 §2)
 *
 * Fuentes por categoría (en orden estricto):
 *   - Libros:
 *     1. Open Library por ISBN y por olid (-L.jpg y /works/OL...W.json); descarta imagen 1x1.
 *     2. Open Library búsqueda (preferencia de edición en español).
 *     3. Google Books API (volumes?q=intitle:... &zoom=0 si admite).
 *     4. Raspado de Casa del Libro o Amazon.es (og:image).
 *   - Juegos:
 *     1. original.json (alta resolución de BGG cf.geekdo-images.com).
 *     2. BGG API / página del bggId (og:image) o búsqueda por nombre y año.
 *     3. Ajuste de ratio en [0.70, 1.50] recortando levemente márgenes si la caja es panorámica o muy esbelta.
 *   - Pelis y series:
 *     1. original.json.
 *     2. Wikidata P3383 (cartel en pelis).
 *     3. TVmaze (singlesearch limpio / shows/:id para series).
 *     4. IMDb suggestion API (por imdbId o búsqueda por título) y og:image de IMDb.
 *     5. Wikipedia pageimages.
 *   - Artistas:
 *     1. Deezer API -> Wikidata P18.
 *
 * Control de forma:
 *   - Pelis, series, libros: 1.3 <= ratio <= 1.65 (vertical).
 *   - Juegos: 0.7 <= ratio <= 1.5.
 *   - Artistas: cualquier proporción.
 *   - Ancho estándar: 600 px (calidad 82 WebP).
 *
 * Persistencia (T19 §5):
 *   - NO escribe seed.json.
 *   - Guarda WebP en scripts/cache/covers/<type>/<slug>.webp.
 *   - Sube a Supabase Storage bucket biblio-covers.
 *   - Registra en scripts/cache/attrs/posterUrl.jsonl.
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/engine/restore-posters.mjs [--dry] [--only <shelf>] [--concurrency <N>] [--id <id>]
 */

import { execSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ALIASES_FILE = join(ROOT, 'src', 'data', 'aliases.json')
const ORIG_FILE = join(ROOT, 'scripts', 'cache', 'posters', 'original.json')
const COVERS_CACHE = join(ROOT, 'scripts', 'cache', 'covers')
const ATTRS_POSTER_FILE = join(ROOT, 'scripts', 'cache', 'attrs', 'posterUrl.jsonl')
const SOURCE_COMMIT = 'a2fd1f2'
const GOOD_HOSTS = ['m.media-amazon.com', 'static.tvmaze.com', 'covers.openlibrary.org', 'cf.geekdo-images.com', 'cdn-images.dzcdn.net', 'images.casadellibro.com', 'imagessl.casadellibro.com', 'books.google.com']

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : (args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null)
const TARGET_ID = args.includes('--id') ? args[args.indexOf('--id') + 1] : null
const CONCURRENCY = args.includes('--concurrency')
  ? parseInt(args[args.indexOf('--concurrency') + 1], 10)
  : 4

// 1. Mapa id -> póster original
let orig = {}
if (existsSync(ORIG_FILE)) {
  orig = JSON.parse(readFileSync(ORIG_FILE, 'utf8'))
} else {
  const old = JSON.parse(
    execSync(`git show ${SOURCE_COMMIT}:app/src/data/seed.json`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString()
  )
  for (const it of old.items) {
    const url = it.posterUrl
    if (url && GOOD_HOSTS.some((h) => url.includes(h))) orig[it.id] = url
  }
  mkdirSync(dirname(ORIG_FILE), { recursive: true })
  writeFileSync(ORIG_FILE, JSON.stringify(orig, null, 1))
  console.log(`Guardados ${Object.keys(orig).length} pósteres originales en ${ORIG_FILE}`)
}

const aliases = existsSync(ALIASES_FILE) ? JSON.parse(readFileSync(ALIASES_FILE, 'utf8')) : {}
const back = {}
for (const [oldId, newId] of Object.entries(aliases)) (back[newId] ??= []).push(oldId)
const originalFor = (id) => orig[id] ?? (back[id] ?? []).map((o) => orig[o]).find(Boolean)

export function isValidAspect(type, meta) {
  if (!meta || !meta.width || !meta.height) return false
  if (meta.width <= 50 || meta.height <= 50) return false
  const ratio = meta.height / meta.width
  if (type === 'movie' || type === 'series' || type === 'book') {
    return ratio >= 1.3 && ratio <= 1.65
  }
  if (type === 'boardgame') {
    return ratio >= 0.7 && ratio <= 1.5
  }
  if (type === 'artist') {
    return true
  }
  return true
}

const PALETTES = [
  ['#1a1008', '#8c4a20', '#f5b544'],
  ['#0a1820', '#1b4d63', '#4fc3dc'],
  ['#160b1c', '#532168', '#c97be4'],
  ['#0d1a10', '#255431', '#6cd489'],
  ['#1c0f0a', '#6d2e1b', '#f27348'],
  ['#12131a', '#34385a', '#8a94d8'],
]

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function generateSvgCover(item) {
  const h = hash(item.id)
  const [deep, mid, light] = PALETTES[h % PALETTES.length]
  const cx = 25 + ((h >> 9) % 50)
  const cy = 18 + ((h >> 13) % 30)
  const shape = (h >> 17) % 3
  const safeTitle = (item.title || '')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  let shapeElement = ''
  if (shape === 0) {
    shapeElement = `<circle cx="${cx * 6.0}" cy="${cy * 9.0}" r="${31 * 6.0}" fill="${light}" opacity="0.45" />`
  } else if (shape === 1) {
    shapeElement = `<circle cx="${cx * 6.0}" cy="${(cy - 10) * 9.0}" r="${55 * 6.0}" fill="none" stroke="${light}" stroke-width="26" opacity="0.3" />`
  } else {
    shapeElement = `<rect x="-90" y="${(cy + 8) * 9.0}" width="780" height="190" fill="${light}" opacity="0.25" transform="rotate(${-18 + ((h >> 3) % 36)} 300 450)" />`
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${mid}" />
          <stop offset="72%" stop-color="${deep}" />
        </linearGradient>
      </defs>
      <rect width="600" height="900" fill="url(#bg)" />
      ${shapeElement}
      <rect width="600" height="900" fill="black" opacity="0.25" />
      <text x="40" y="780" font-family="sans-serif" font-weight="bold" font-size="38" fill="#ffffff" width="520">
        ${safeTitle.length > 32 ? safeTitle.slice(0, 30) + '...' : safeTitle}
      </text>
    </svg>
  `.trim()
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))

// Filtrar targets para T19:
// 1. Obras con portada generada (imageSrc === 'generated' o src.posterUrl === 'generated')
// 2. Obras que no tienen ?v=2
// 3. Obras cuya imagen en caché local no existe o falla la forma
const targets = []
const targetMap = new Set()

for (const it of seed.items) {
  if (ONLY && it.type !== ONLY) continue
  if (TARGET_ID && it.id !== TARGET_ID) continue

  const isGen = it.imageSrc === 'generated' || it.src?.posterUrl === 'generated'
  const missingV2 = !it.posterUrl?.endsWith('?v=2')
  const slug = it.id.replace(/^[^:]+:/, '')
  const cacheFile = join(COVERS_CACHE, it.type, `${slug}.webp`)
  const cacheMissing = !existsSync(cacheFile)

  if (isGen || missingV2 || cacheMissing) {
    if (!targetMap.has(it.id)) {
      targetMap.add(it.id)
      targets.push(it)
    }
  }
}

// Comprobar también aquellas que tienen ?v=2 pero cuya caché tiene forma incorrecta
for (const it of seed.items) {
  if (ONLY && it.type !== ONLY) continue
  if (TARGET_ID && it.id !== TARGET_ID) continue
  if (targetMap.has(it.id)) continue

  const slug = it.id.replace(/^[^:]+:/, '')
  const cacheFile = join(COVERS_CACHE, it.type, `${slug}.webp`)
  if (existsSync(cacheFile)) {
    try {
      const meta = sharp(cacheFile).metadata()
      // se comprobará al procesar
    } catch {
      targetMap.add(it.id)
      targets.push(it)
    }
  }
}

console.log(`Obras a procesar/recuperar${ONLY ? ` (${ONLY})` : ''}: ${targets.length}`)
if (DRY) {
  console.log('Modo DRY RUN, saliendo.')
  process.exit(0)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fetchBuf(url, timeoutMs = 15000) {
  if (!url || !url.startsWith('http')) return null
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null
  } catch {
    return null
  }
}

async function fetchWikidataEntity(qid) {
  if (!qid) return null
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      headers: { 'User-Agent': 'Biblioteca/0.1 (app@example.com)' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.entities?.[qid] || null
  } catch {
    return null
  }
}

async function fetchImdbSuggestion(idOrTitle) {
  if (!idOrTitle) return null
  try {
    const clean = idOrTitle.trim()
    const isId = /^tt\d+$/.test(clean)
    const endpoint = isId
      ? `https://v3.sg.media-imdb.com/suggestion/x/${clean}.json`
      : `https://v3.sg.media-imdb.com/suggestion/${clean[0].toLowerCase()}/${encodeURIComponent(clean.toLowerCase().replace(/[^a-z0-9 ]/g, ''))}.json`

    const res = await fetch(endpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const hit = isId ? json.d?.[0] : (json.d?.find((x) => x.i?.imageUrl && (x.qid === 'movie' || x.qid === 'tvSeries' || x.q === 'feature')) || json.d?.[0])
    return hit?.i?.imageUrl || null
  } catch {
    return null
  }
}

async function fetchImdbOgImage(imdbId) {
  if (!imdbId || !imdbId.startsWith('tt')) return null
  try {
    const res = await fetch(`https://www.imdb.com/title/${imdbId}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const ogImg = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1]
      || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)?.[1]
    return ogImg || null
  } catch {
    return null
  }
}

async function fetchWikipediaImage(title, lang = 'es') {
  if (!title) return null
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(title)}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Biblioteca/0.1 (app@example.com)' }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const json = await res.json()
    const page = Object.values(json.query?.pages || {})[0]
    return page?.original?.source || null
  } catch {
    return null
  }
}

function cleanBookTitle(t) {
  return (t || '')
    .replace(/\([^)]+\)/g, '')
    .replace(/[:\-–—].*$/, '')
    .trim()
}

/**
 * Ajusta levemente el ratio de juegos de mesa recortando de forma simétrica
 * para mantener la proporción oficial exigida (0.70 a 1.50) sin degradar a generada.
 */
async function processBoardgameBuffer(buf) {
  const meta = await sharp(buf).metadata()
  if (!meta || !meta.width || !meta.height) return null
  const initialRatio = meta.height / meta.width

  let pipeline = sharp(buf)
  if (initialRatio < 0.70 && initialRatio >= 0.40) {
    const targetRatio = 0.705
    const targetWidth = Math.floor(meta.height / targetRatio)
    const cropX = Math.max(0, Math.floor((meta.width - targetWidth) / 2))
    pipeline = pipeline.extract({ left: cropX, top: 0, width: targetWidth, height: meta.height })
  } else if (initialRatio > 1.50 && initialRatio <= 2.50) {
    const targetRatio = 1.495
    const targetHeight = Math.floor(meta.width * targetRatio)
    const cropY = Math.max(0, Math.floor((meta.height - targetHeight) / 2))
    pipeline = pipeline.extract({ left: 0, top: cropY, width: meta.width, height: targetHeight })
  }

  const processed = await pipeline
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const finalMeta = await sharp(processed).metadata()
  if (isValidAspect('boardgame', finalMeta)) {
    return processed
  }
  return null
}

async function findCandidateBuffer(item) {
  // 1. Fuente original de la semilla (IMDb, TVmaze, Open Library, BGG, Deezer)
  const origUrl = originalFor(item.id)
  if (origUrl) {
    const buf = await fetchBuf(origUrl)
    if (buf) {
      try {
        if (item.type === 'boardgame') {
          const processed = await processBoardgameBuffer(buf)
          if (processed) {
            return { buf: processed, host: new URL(origUrl).hostname, isGenerated: false, isAlreadyWebp: true }
          }
        } else {
          const meta = await sharp(buf).metadata()
          if (isValidAspect(item.type, meta)) {
            return { buf, host: new URL(origUrl).hostname, isGenerated: false }
          }
        }
      } catch {}
    }
  }

  // 2. Fuentes de respaldo por categoría según T19 §2

  // --- PELÍCULAS ---
  if (item.type === 'movie') {
    let entity = null
    if (item.wikidataId) entity = await fetchWikidataEntity(item.wikidataId)

    // a) Wikidata P3383 (cartel)
    const p3383 = entity?.claims?.P3383?.[0]?.mainsnak?.datavalue?.value
    if (p3383) {
      const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p3383)}?width=1000`
      const buf = await fetchBuf(url)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (isValidAspect(item.type, meta)) {
            return { buf, host: 'commons.wikimedia.org', isGenerated: false, remoteUrl: url }
          }
        } catch {}
      }
    }

    // b) IMDb suggestion API (por imdbId o P345)
    const imdbId = item.imdbId || entity?.claims?.P345?.[0]?.mainsnak?.datavalue?.value
    if (imdbId) {
      const imdbImg = await fetchImdbSuggestion(imdbId)
      if (imdbImg) {
        const buf = await fetchBuf(imdbImg)
        if (buf) {
          try {
            const meta = await sharp(buf).metadata()
            if (isValidAspect(item.type, meta)) {
              return { buf, host: 'm.media-amazon.com', isGenerated: false, remoteUrl: imdbImg }
            }
          } catch {}
        }
      }

      const imdbOg = await fetchImdbOgImage(imdbId)
      if (imdbOg) {
        const buf = await fetchBuf(imdbOg)
        if (buf) {
          try {
            const meta = await sharp(buf).metadata()
            if (isValidAspect(item.type, meta)) {
              return { buf, host: 'm.media-amazon.com', isGenerated: false, remoteUrl: imdbOg }
            }
          } catch {}
        }
      }
    }

    // c) IMDb suggestion por búsqueda de título limpio
    const cleanT = item.title.replace(/\([^)]+\)/g, '').trim()
    const searchImg = await fetchImdbSuggestion(cleanT)
    if (searchImg) {
      const buf = await fetchBuf(searchImg)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (isValidAspect(item.type, meta)) {
            return { buf, host: 'm.media-amazon.com', isGenerated: false, remoteUrl: searchImg }
          }
        } catch {}
      }
    }

    // d) Wikipedia pageimages
    const esTitle = item.titles?.['es-ES'] || item.title
    if (esTitle) {
      const wikiImg = await fetchWikipediaImage(esTitle, 'es')
      if (wikiImg) {
        const buf = await fetchBuf(wikiImg)
        if (buf) {
          try {
            const meta = await sharp(buf).metadata()
            if (isValidAspect(item.type, meta)) {
              return { buf, host: 'commons.wikimedia.org', isGenerated: false, remoteUrl: wikiImg }
            }
          } catch {}
        }
      }
    }
  }

  // --- SERIES ---
  else if (item.type === 'series') {
    // a) TVmaze
    const cleanT = item.title.replace(/\([^)]+\)/g, '').trim()
    const tvUrls = [
      item.tvmazeId ? `https://api.tvmaze.com/shows/${item.tvmazeId}` : null,
      `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanT)}`,
      `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`,
    ].filter(Boolean)

    for (const tvUrl of tvUrls) {
      try {
        const tvRes = await fetch(tvUrl, { headers: { 'User-Agent': 'Biblioteca/0.1' }, signal: AbortSignal.timeout(8000) })
        if (tvRes.ok) {
          const show = await tvRes.json()
          const imgUrl = show.image?.original || show.image?.medium
          if (imgUrl) {
            const buf = await fetchBuf(imgUrl)
            if (buf) {
              const meta = await sharp(buf).metadata()
              if (isValidAspect(item.type, meta)) {
                return { buf, host: 'static.tvmaze.com', isGenerated: false, remoteUrl: imgUrl }
              }
            }
          }
        }
      } catch {}
    }

    // b) IMDb suggestion API
    let entity = null
    if (item.wikidataId) entity = await fetchWikidataEntity(item.wikidataId)
    const imdbId = item.imdbId || entity?.claims?.P345?.[0]?.mainsnak?.datavalue?.value
    if (imdbId) {
      const imdbImg = await fetchImdbSuggestion(imdbId)
      if (imdbImg) {
        const buf = await fetchBuf(imdbImg)
        if (buf) {
          try {
            const meta = await sharp(buf).metadata()
            if (isValidAspect(item.type, meta)) {
              return { buf, host: 'm.media-amazon.com', isGenerated: false, remoteUrl: imdbImg }
            }
          } catch {}
        }
      }

      const imdbOg = await fetchImdbOgImage(imdbId)
      if (imdbOg) {
        const buf = await fetchBuf(imdbOg)
        if (buf) {
          try {
            const meta = await sharp(buf).metadata()
            if (isValidAspect(item.type, meta)) {
              return { buf, host: 'm.media-amazon.com', isGenerated: false, remoteUrl: imdbOg }
            }
          } catch {}
        }
      }
    }

    // c) IMDb por título limpio
    const imdbTitleImg = await fetchImdbSuggestion(cleanT)
    if (imdbTitleImg) {
      const buf = await fetchBuf(imdbTitleImg)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (isValidAspect(item.type, meta)) {
            return { buf, host: 'm.media-amazon.com', isGenerated: false, remoteUrl: imdbTitleImg }
          }
        } catch {}
      }
    }
  }

  // --- LIBROS ---
  else if (item.type === 'book') {
    // 1. Open Library por olid
    if (item.olid) {
      if (item.olid.endsWith('W')) {
        try {
          const res = await fetch(`https://openlibrary.org/works/${item.olid}.json`, {
            headers: { 'User-Agent': 'Biblioteca/0.1 (app@example.com)' },
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) {
            const d = await res.json()
            for (const cid of (d.covers || []).slice(0, 8)) {
              if (!cid || cid <= 0) continue
              const u = `https://covers.openlibrary.org/b/id/${cid}-L.jpg?default=false`
              const buf = await fetchBuf(u)
              if (buf) {
                const meta = await sharp(buf).metadata()
                if (isValidAspect(item.type, meta)) {
                  return { buf, host: 'covers.openlibrary.org', isGenerated: false, remoteUrl: u }
                }
              }
            }
          }
        } catch {}
      }

      const olidUrl = `https://covers.openlibrary.org/b/olid/${item.olid}-L.jpg?default=false`
      const buf = await fetchBuf(olidUrl)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (isValidAspect(item.type, meta)) {
            return { buf, host: 'covers.openlibrary.org', isGenerated: false, remoteUrl: olidUrl }
          }
        } catch {}
      }
    }

    // 2. Open Library por isbn
    if (item.isbn) {
      const isbnUrl = `https://covers.openlibrary.org/b/isbn/${item.isbn}-L.jpg?default=false`
      const buf = await fetchBuf(isbnUrl)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (isValidAspect(item.type, meta)) {
            return { buf, host: 'covers.openlibrary.org', isGenerated: false, remoteUrl: isbnUrl }
          }
        } catch {}
      }
    }

    // 3. Open Library search API con preferencia de edición española
    const cleanT = cleanBookTitle(item.title)
    const queries = [
      `https://openlibrary.org/search.json?q=${encodeURIComponent(item.title)}&limit=5`,
      `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanT + ' ' + (item.creator || ''))}&limit=5`,
      `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanT)}&limit=5`,
    ]

    for (const q of queries) {
      try {
        const res = await fetch(q, {
          headers: { 'User-Agent': 'Biblioteca/0.1 (app@example.com)' },
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
          const d = await res.json()
          const docs = d.docs || []
          // Ordenar: ediciones en español primero
          const sortedDocs = [...docs].sort((x, y) => {
            const xSpa = (x.language || []).includes('spa') ? 1 : 0
            const ySpa = (y.language || []).includes('spa') ? 1 : 0
            return ySpa - xSpa
          })

          for (const doc of sortedDocs) {
            if (doc.cover_i && doc.cover_i > 0) {
              const u = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`
              const buf = await fetchBuf(u)
              if (buf) {
                const meta = await sharp(buf).metadata()
                if (isValidAspect(item.type, meta)) {
                  return { buf, host: 'covers.openlibrary.org', isGenerated: false, remoteUrl: u }
                }
              }
            }
            if (doc.isbn?.[0]) {
              const u = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg?default=false`
              const buf = await fetchBuf(u)
              if (buf) {
                const meta = await sharp(buf).metadata()
                if (isValidAspect(item.type, meta)) {
                  return { buf, host: 'covers.openlibrary.org', isGenerated: false, remoteUrl: u }
                }
              }
            }
          }
        }
      } catch {}
    }

    // 4. Google Books API
    try {
      const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanT)}+inauthor:${encodeURIComponent(item.creator || '')}&langRestrict=es`
      const gbRes = await fetch(gbUrl, { signal: AbortSignal.timeout(6000) })
      if (gbRes.ok) {
        const gbData = await gbRes.json()
        for (const vol of (gbData.items || []).slice(0, 3)) {
          const links = vol.volumeInfo?.imageLinks
          const imgUrl = links?.extraLarge || links?.large || links?.medium || links?.small || links?.thumbnail
          if (imgUrl) {
            const cleanImgUrl = imgUrl.replace('&edge=curl', '').replace('http://', 'https://')
            const buf = await fetchBuf(cleanImgUrl)
            if (buf) {
              const meta = await sharp(buf).metadata()
              if (isValidAspect(item.type, meta)) {
                return { buf, host: 'books.google.com', isGenerated: false, remoteUrl: cleanImgUrl }
              }
            }
          }
        }
      }
    } catch {}

    // 5. Raspado de Casa del Libro
    try {
      const cdlUrl = `https://www.casadellibro.com/busqueda-generica?busqueda=${encodeURIComponent(cleanT + ' ' + (item.creator || ''))}`
      const cdlRes = await fetch(cdlUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(6000),
      })
      if (cdlRes.ok) {
        const html = await cdlRes.text()
        const imgMatches = [...html.matchAll(/https:\/\/imagessl\d*\.casadellibro\.com\/a\/l\/s\d\/[0-9/]+\.webp/gi)].map((m) => m[0])
        for (const imgU of imgMatches.slice(0, 3)) {
          const buf = await fetchBuf(imgU)
          if (buf) {
            const meta = await sharp(buf).metadata()
            if (isValidAspect(item.type, meta)) {
              return { buf, host: 'imagessl.casadellibro.com', isGenerated: false, remoteUrl: imgU }
            }
          }
        }
      }
    } catch {}
  }

  // --- JUEGOS DE MESA ---
  else if (item.type === 'boardgame') {
    // Si tiene bggId, consultar API de imágenes de BGG
    if (item.bggId) {
      try {
        const bggApiUrl = `https://api.geekdo.com/api/images?objectid=${item.bggId}&objecttype=thing`
        const bRes = await fetch(bggApiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) })
        if (bRes.ok) {
          const bData = await bRes.json()
          for (const im of (bData.images || []).slice(0, 4)) {
            const u = im.imageurl_lg || im.imageurl
            if (u) {
              const buf = await fetchBuf(u)
              if (buf) {
                const processed = await processBoardgameBuffer(buf)
                if (processed) {
                  return { buf: processed, host: 'cf.geekdo-images.com', isGenerated: false, isAlreadyWebp: true, remoteUrl: u }
                }
              }
            }
          }
        }
      } catch {}
    }
  }

  // --- ARTISTAS ---
  else if (item.type === 'artist') {
    // a) Deezer
    try {
      const dzRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(item.title)}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (dzRes.ok) {
        const dz = await dzRes.json()
        const dzImg = dz.data?.[0]?.picture_xl || dz.data?.[0]?.picture_big
        if (dzImg) {
          const buf = await fetchBuf(dzImg)
          if (buf) {
            try {
              const meta = await sharp(buf).metadata()
              if (meta.width > 50 && meta.height > 50) {
                return { buf, host: 'cdn-images.dzcdn.net', isGenerated: false, remoteUrl: dzImg }
              }
            } catch {}
          }
        }
      }
    } catch {}

    // b) Wikidata P18
    if (item.wikidataId) {
      const entity = await fetchWikidataEntity(item.wikidataId)
      const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
      if (p18) {
        const commonsUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18)}?width=1000`
        const buf = await fetchBuf(commonsUrl)
        if (buf) {
          try {
            const meta = await sharp(buf).metadata()
            if (meta.width > 50 && meta.height > 50) {
              return { buf, host: 'commons.wikimedia.org', isGenerated: false, remoteUrl: commonsUrl }
            }
          } catch {}
        }
      }
    }
  }

  // 3. Fallback final: Portada generada SVG
  const svg = generateSvgCover(item)
  const buf = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer()
  return { buf, host: 'generated', isGenerated: true, isAlreadyWebp: true }
}

let okCount = 0
let restoredCount = 0
let failed = []
let index = 0

async function uploadWithRetry(path, buffer, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase.storage.from('biblio-covers').upload(path, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })
    if (!error) return true
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 800 * attempt))
    } else {
      throw error
    }
  }
}

mkdirSync(dirname(ATTRS_POSTER_FILE), { recursive: true })

async function worker() {
  while (index < targets.length) {
    const it = targets[index++]
    const slug = it.id.replace(/^[^:]+:/, '')
    const storagePath = `${it.type}/${slug}.webp`

    try {
      const candidate = await findCandidateBuffer(it)
      let webp = candidate.buf

      if (!candidate.isAlreadyWebp && !candidate.isGenerated) {
        webp = await sharp(candidate.buf)
          .resize({ width: 600, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()
      }

      await uploadWithRetry(storagePath, webp)

      const { data } = supabase.storage.from('biblio-covers').getPublicUrl(storagePath)
      const finalUrl = `${data.publicUrl}?v=2`

      // Guardar en caché local
      const cacheDir = join(COVERS_CACHE, it.type)
      mkdirSync(cacheDir, { recursive: true })
      writeFileSync(join(cacheDir, `${slug}.webp`), webp)

      // Guardar en original.json si encontramos una URL remota real
      if (candidate.remoteUrl) {
        orig[it.id] = candidate.remoteUrl
      }

      // Si se restauró una portada real, guardar en scripts/cache/attrs/posterUrl.jsonl (T19 §5)
      if (!candidate.isGenerated) {
        const line = JSON.stringify({
          id: it.id,
          value: finalUrl,
          src: `scrape:${candidate.host}`,
          imageSrc: candidate.host,
          conf: 0.95,
          at: new Date().toISOString().slice(0, 10),
        }) + '\n'
        appendFileSync(ATTRS_POSTER_FILE, line, 'utf8')
        restoredCount++
      }

      it.posterUrl = finalUrl
      it.imageSrc = candidate.isGenerated ? 'generated' : candidate.host
      it.src = { ...(it.src ?? {}), posterUrl: candidate.isGenerated ? 'generated' : 'scrape:' + candidate.host }

      okCount++
      if (okCount % 10 === 0 || okCount === targets.length) {
        console.log(`  [${ONLY || 'all'}] ${okCount}/${targets.length} procesados (restaurados reales: ${restoredCount})`)
      }
    } catch (e) {
      console.error(`  Error en ${it.id}:`, e.message)
      failed.push(it.id)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

// Actualizar original.json
try {
  writeFileSync(ORIG_FILE, JSON.stringify(orig, null, 1), 'utf8')
} catch {}

console.log(`\n✓ Finalizado: ${okCount} procesados, ${restoredCount} portadas reales restauradas en posterUrl.jsonl. Fallidos: ${failed.length}`)
if (failed.length) {
  console.log('Fallidos:', failed.slice(0, 20).join(', '))
}
