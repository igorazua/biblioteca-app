/**
 * covers.mjs — Procesa y aloja portadas en Supabase Storage (biblio-covers)
 *
 * Cumple con las reglas de T1 y T14:
 *   1. Usa original.json como primera fuente (pósteres originales IMDb, TVmaze, OL, BGG, Deezer).
 *   2. Prohibido usar Wikidata P18 en pelis, series, libros y juegos (solo permitido en artistas).
 *   3. Control de forma con sharp().metadata():
 *      - pelis, series, libros: 1.3 <= ratio <= 1.65 (vertical)
 *      - juegos: 0.7 <= ratio <= 1.5
 *      - artistas: cualquier proporción
 *   4. Ancho estándar de 600 px (calidad 82), nunca degradando a 342 px.
 *   5. Portada generada SVG si ninguna fuente cumple la forma.
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/engine/covers.mjs [--dry] [--shelf movie]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(ROOT, 'scripts', 'cache', 'covers')
const ORIGINAL_FILE = join(ROOT, 'scripts', 'cache', 'posters', 'original.json')
const ORIGINAL_POSTERS = existsSync(ORIGINAL_FILE) ? JSON.parse(readFileSync(ORIGINAL_FILE, 'utf8')) : {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET = 'biblio-covers'

export const PALETTES = [
  ['#1a1008', '#8c4a20', '#f5b544'],
  ['#0a1820', '#1b4d63', '#4fc3dc'],
  ['#160b1c', '#532168', '#c97be4'],
  ['#0d1a10', '#255431', '#6cd489'],
  ['#1c0f0a', '#6d2e1b', '#f27348'],
  ['#12131a', '#34385a', '#8a94d8'],
]

export function isValidAspect(type, meta) {
  if (!meta || !meta.width || !meta.height) return false
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

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function generateSvgCover(item) {
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

async function fetchBufferWithTimeout(url, timeoutMs = 25000) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    })
    clearTimeout(id)
    if (!res.ok) return null
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
  } catch {
    clearTimeout(id)
    return null
  }
}

async function uploadWithRetry(storagePath, buffer, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })
    if (!error) return true
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 600 * attempt))
    } else {
      throw error
    }
  }
}

async function processItem(item) {
  const shelf = item.type
  const slug = item.id.replace(/^[^:]+:/, '')
  const cacheDir = join(CACHE_DIR, shelf)
  mkdirSync(cacheDir, { recursive: true })
  const localCachePath = join(cacheDir, `${slug}.webp`)

  let webpBuffer = null
  let isGenerated = false
  let imageSource = 'seed'

  // Si ya existe en caché local, verificar su aspect ratio antes de darlo por bueno
  if (existsSync(localCachePath)) {
    const cachedBuf = readFileSync(localCachePath)
    try {
      const meta = await sharp(cachedBuf).metadata()
      if (isValidAspect(item.type, meta)) {
        webpBuffer = cachedBuf
      }
    } catch {}
  }

  if (!webpBuffer) {
    let candidateBuf = null

    // 0. Póster original de la semilla
    const origUrl = ORIGINAL_POSTERS[item.id]
    if (origUrl) {
      const b = await fetchBufferWithTimeout(origUrl)
      if (b) {
        try {
          const meta = await sharp(b).metadata()
          if (isValidAspect(item.type, meta)) {
            candidateBuf = b
            imageSource = new URL(origUrl).hostname
          }
        } catch {}
      }
    }

    // 1. TVmaze para series
    if (!candidateBuf && item.type === 'series') {
      try {
        const tvUrl = item.tvmazeId
          ? `https://api.tvmaze.com/shows/${item.tvmazeId}`
          : `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`
        const tvRes = await fetch(tvUrl, { headers: { 'User-Agent': 'Biblioteca/0.1' } })
        if (tvRes.ok) {
          const show = await tvRes.json()
          const imgUrl = show.image?.original || show.image?.medium
          if (imgUrl) {
            const b = await fetchBufferWithTimeout(imgUrl)
            if (b) {
              const meta = await sharp(b).metadata()
              if (isValidAspect(item.type, meta)) {
                candidateBuf = b
                imageSource = 'static.tvmaze.com'
              }
            }
          }
        }
      } catch {}
    }

    // 2. Wikidata: P3383 (cartel) para pelis, o P18 SOLO para artistas
    if (!candidateBuf && item.wikidataId) {
      try {
        const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${item.wikidataId}.json`
        const wData = await (await fetch(entityUrl)).json()
        const claims = wData.entities?.[item.wikidataId]?.claims
        const p3383 = claims?.P3383?.[0]?.mainsnak?.datavalue?.value
        const p18 = item.type === 'artist' ? claims?.P18?.[0]?.mainsnak?.datavalue?.value : null
        const targetImg = p3383 || p18
        if (targetImg) {
          const commonsUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(targetImg)}?width=1000`
          const b = await fetchBufferWithTimeout(commonsUrl)
          if (b) {
            const meta = await sharp(b).metadata()
            if (isValidAspect(item.type, meta)) {
              candidateBuf = b
              imageSource = 'commons.wikimedia.org'
            }
          }
        }
      } catch {}
    }

    // 3. Open Library para libros
    if (!candidateBuf && item.type === 'book' && item.olid) {
      const olUrl = `https://covers.openlibrary.org/b/olid/${item.olid}-L.jpg?default=false`
      const b = await fetchBufferWithTimeout(olUrl)
      if (b) {
        try {
          const meta = await sharp(b).metadata()
          if (meta.width > 50 && meta.height > 50 && isValidAspect(item.type, meta)) {
            candidateBuf = b
            imageSource = 'covers.openlibrary.org'
          }
        } catch {}
      }
    }

    // 4. Deezer para artistas
    if (!candidateBuf && item.type === 'artist') {
      try {
        const dzRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(item.title)}`)
        if (dzRes.ok) {
          const dz = await dzRes.json()
          const dzImg = dz.data?.[0]?.picture_xl || dz.data?.[0]?.picture_big
          if (dzImg) {
            const b = await fetchBufferWithTimeout(dzImg)
            if (b) {
              candidateBuf = b
              imageSource = 'cdn-images.dzcdn.net'
            }
          }
        }
      } catch {}
    }

    // Convertir a WebP 600px o generar SVG si no hubo imagen válida
    if (candidateBuf) {
      try {
        webpBuffer = await sharp(candidateBuf)
          .resize({ width: 600, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()
      } catch {
        candidateBuf = null
      }
    }

    if (!candidateBuf) {
      const svg = generateSvgCover(item)
      webpBuffer = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer()
      isGenerated = true
      imageSource = 'generated'
    }

    writeFileSync(localCachePath, webpBuffer)
  }

  // Subir a Supabase Storage
  const storagePath = `${shelf}/${slug}.webp`
  await uploadWithRetry(storagePath, webpBuffer)

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const newUrl = `${publicData.publicUrl}?v=2`

  item.posterUrl = newUrl
  item.imageSrc = imageSource
  item.src = { ...(item.src ?? {}), posterUrl: isGenerated ? 'generated' : 'scrape:' + imageSource }
  return { status: 'uploaded', id: item.id, url: newUrl, isGenerated }
}

async function runPool(items, concurrency, fn) {
  const results = []
  let index = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry')
  const shelfIndex = args.indexOf('--shelf')
  const targetShelf = shelfIndex !== -1 ? args[shelfIndex + 1] : null

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf-8'))
  let items = seed.items

  if (targetShelf) {
    items = items.filter((it) => it.type === targetShelf)
  }

  console.log(`[covers] Procesando ${items.length} obras${targetShelf ? ` de ${targetShelf}` : ''}...`)

  if (dryRun) {
    console.log('[covers] Modo DRY RUN, saliendo sin modificar.')
    process.exit(0)
  }

  const results = await runPool(items, 6, async (item, i) => {
    try {
      const r = await processItem(item)
      if ((i + 1) % 50 === 0 || i === items.length - 1) {
        console.log(`[covers] ${i + 1}/${items.length} procesados.`)
      }
      return r
    } catch (e) {
      console.error(`[covers] Error en ${item.id}:`, e.message)
      return { status: 'error', id: item.id }
    }
  })

  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
  console.log(`[covers] Finalizado. Éxito: ${results.filter((r) => r?.status === 'uploaded').length}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(console.error)
}
