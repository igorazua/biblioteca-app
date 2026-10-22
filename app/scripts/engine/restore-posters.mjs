/**
 * restore-posters.mjs — Recupera los pósteres reales que había antes del 16/10/2026 y aplica control de forma.
 *
 * Tareas cubiertas (T14):
 *   1. Descarga el póster original de original.json (sacado de a2fd1f2: IMDb, TVmaze, Open Library, BGG, Deezer).
 *   2. Control de forma con sharp().metadata():
 *      - pelis, series, libros: 1.3 <= ratio <= 1.65
 *      - juegos: 0.7 <= ratio <= 1.5
 *      - artistas: cualquier proporción
 *   3. Si no hay original o falla la forma, fuentes de respaldo en orden estricto:
 *      - Pelis: Wikidata P3383 -> IMDb suggestion API -> Wikipedia -> portada generada.
 *      - Series: TVmaze (por tvmazeId o búsqueda) -> IMDb suggestion API -> portada generada.
 *      - Libros: Open Library (por olid o ISBN) -> portada generada.
 *      - Juegos: BGG og:image / portada actual si cumple ratio -> portada generada.
 *      - Artistas: Deezer API -> Wikidata P18 (permitido para artistas) -> portada generada.
 *      - Prohibido P18 para pelis, series, libros y juegos.
 *   4. Ancho estándar de 600 px (calidad 82).
 *   5. Sube a biblio-covers/<type>/<slug>.webp con ?v=2 y actualiza local cache + seed.json.
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/engine/restore-posters.mjs [--dry] [--only <shelf>] [--concurrency <N>]
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const SOURCE_COMMIT = 'a2fd1f2'
const GOOD_HOSTS = ['m.media-amazon.com', 'static.tvmaze.com', 'covers.openlibrary.org', 'cf.geekdo-images.com', 'cdn-images.dzcdn.net']

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const CONCURRENCY = args.includes('--concurrency')
  ? parseInt(args[args.indexOf('--concurrency') + 1], 10)
  : 2

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

// Filtrar targets:
// 1. Obras que no tienen ?v=2
// 2. Obras con ?v=2 pero cuya imagen en caché local tenga una relación de aspecto inválida
const targets = []
for (const it of seed.items) {
  if (ONLY && it.type !== ONLY) continue

  const slug = it.id.replace(/^[^:]+:/, '')
  const cacheFile = join(COVERS_CACHE, it.type, `${slug}.webp`)

  if (it.posterUrl?.endsWith('?v=2') && existsSync(cacheFile)) {
    try {
      const cached = readFileSync(cacheFile)
      // Comprobación rápida sin async en bucle inicial:
      // Si el archivo existe, lo leeremos o comprobaremos si es target
      // Si sabemos que es una de las fallidas o si no comprobamos,
      // la incluimos solo si hay duda.
    } catch {}
  }

  // Si no tiene ?v=2, es target seguro
  if (!it.posterUrl?.endsWith('?v=2')) {
    targets.push(it)
  }
}

// Ahora comprobar las que ya tienen ?v=2 por si fallan la forma (como las 5 pelis)
for (const it of seed.items) {
  if (ONLY && it.type !== ONLY) continue
  if (it.posterUrl?.endsWith('?v=2')) {
    const slug = it.id.replace(/^[^:]+:/, '')
    const cacheFile = join(COVERS_CACHE, it.type, `${slug}.webp`)
    if (existsSync(cacheFile)) {
      try {
        const meta = await sharp(cacheFile).metadata()
        if (!isValidAspect(it.type, meta)) {
          console.log(`[forma inválida detectada] ${it.id} (${(meta.height / meta.width).toFixed(2)}) -> a la cola`)
          targets.push(it)
        }
      } catch {
        targets.push(it)
      }
    }
  }
}

console.log(`Obras a procesar/recuperar${ONLY ? ` (${ONLY})` : ''}: ${targets.length}`)
if (DRY) {
  console.log('Modo DRY RUN, saliendo.')
  process.exit(0)
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function fetchBuf(url, timeoutMs = 25000) {
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
      headers: { 'User-Agent': 'Biblioteca/0.1' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.entities?.[qid] || null
  } catch {
    return null
  }
}

async function fetchImdbSuggestion(imdbId) {
  if (!imdbId) return null
  try {
    const res = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${imdbId}.json`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.d?.[0]?.i?.imageUrl || null
  } catch {
    return null
  }
}

async function fetchWikipediaImage(title, lang = 'es') {
  if (!title) return null
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(title)}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Biblioteca/0.1' }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const json = await res.json()
    const page = Object.values(json.query?.pages || {})[0]
    return page?.original?.source || null
  } catch {
    return null
  }
}

async function findCandidateBuffer(item) {
  // 1. Fuente original de la semilla (IMDb, TVmaze, Open Library, BGG, Deezer)
  const origUrl = originalFor(item.id)
  if (origUrl) {
    const buf = await fetchBuf(origUrl)
    if (buf) {
      try {
        const meta = await sharp(buf).metadata()
        if (isValidAspect(item.type, meta)) {
          return { buf, host: new URL(origUrl).hostname, isGenerated: false }
        }
      } catch {}
    }
  }

  // 2. Fuentes de respaldo por categoría según T14 §3
  if (item.type === 'movie') {
    let entity = null
    if (item.wikidataId) {
      entity = await fetchWikidataEntity(item.wikidataId)
    }

    // a) Wikidata P3383 (cartel)
    const p3383 = entity?.claims?.P3383?.[0]?.mainsnak?.datavalue?.value
    if (p3383) {
      const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p3383)}?width=1000`
      const buf = await fetchBuf(url)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (isValidAspect(item.type, meta)) {
            return { buf, host: 'commons.wikimedia.org', isGenerated: false }
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
              return { buf, host: 'm.media-amazon.com', isGenerated: false }
            }
          } catch {}
        }
      }
    }

    // c) Wikipedia pageimages si tiene título en español
    const esTitle = item.titles?.['es-ES'] || item.title
    if (esTitle) {
      const wikiImg = await fetchWikipediaImage(esTitle, 'es')
      if (wikiImg) {
        const buf = await fetchBuf(wikiImg)
        if (buf) {
          try {
            const meta = await sharp(buf).metadata()
            if (isValidAspect(item.type, meta)) {
              return { buf, host: 'commons.wikimedia.org', isGenerated: false }
            }
          } catch {}
        }
      }
    }
  } else if (item.type === 'series') {
    // a) TVmaze
    try {
      const tvUrl = item.tvmazeId
        ? `https://api.tvmaze.com/shows/${item.tvmazeId}`
        : `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`
      const tvRes = await fetch(tvUrl, { headers: { 'User-Agent': 'Biblioteca/0.1' }, signal: AbortSignal.timeout(15000) })
      if (tvRes.ok) {
        const show = await tvRes.json()
        const imgUrl = show.image?.original || show.image?.medium
        if (imgUrl) {
          const buf = await fetchBuf(imgUrl)
          if (buf) {
            const meta = await sharp(buf).metadata()
            if (isValidAspect(item.type, meta)) {
              return { buf, host: 'static.tvmaze.com', isGenerated: false }
            }
          }
        }
      }
    } catch {}

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
              return { buf, host: 'm.media-amazon.com', isGenerated: false }
            }
          } catch {}
        }
      }
    }
  } else if (item.type === 'book') {
    // a) Open Library por olid
    if (item.olid) {
      const olUrl = `https://covers.openlibrary.org/b/olid/${item.olid}-L.jpg?default=false`
      const buf = await fetchBuf(olUrl)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (meta.width > 50 && meta.height > 50 && isValidAspect(item.type, meta)) {
            return { buf, host: 'covers.openlibrary.org', isGenerated: false }
          }
        } catch {}
      }
    }
    // b) Open Library por isbn
    if (item.isbn) {
      const isbnUrl = `https://covers.openlibrary.org/b/isbn/${item.isbn}-L.jpg?default=false`
      const buf = await fetchBuf(isbnUrl)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (meta.width > 50 && meta.height > 50 && isValidAspect(item.type, meta)) {
            return { buf, host: 'covers.openlibrary.org', isGenerated: false }
          }
        } catch {}
      }
    }
  } else if (item.type === 'boardgame') {
    // a) Comprobar si la imagen previa remota tiene forma válida (caja de BGG)
    if (item.posterUrl && !item.posterUrl.endsWith('?v=2')) {
      const buf = await fetchBuf(item.posterUrl)
      if (buf) {
        try {
          const meta = await sharp(buf).metadata()
          if (isValidAspect(item.type, meta)) {
            return { buf, host: 'boardgamegeek', isGenerated: false }
          }
        } catch {}
      }
    }
  } else if (item.type === 'artist') {
    // a) Deezer
    try {
      const dzRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(item.title)}`, {
        signal: AbortSignal.timeout(10000),
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
                return { buf, host: 'cdn-images.dzcdn.net', isGenerated: false }
              }
            } catch {}
          }
        }
      }
    } catch {}

    // b) Wikidata P18 (permitido para artistas)
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
              return { buf, host: 'commons.wikimedia.org', isGenerated: false }
            }
          } catch {}
        }
      }
    }
  }

  // 3. Fallback final: Portada generada SVG
  const svg = generateSvgCover(item)
  const buf = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer()
  return { buf, host: 'generated', isGenerated: true }
}

let ok = 0
let failed = []
let index = 0

async function uploadWithRetry(path, buffer, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase.storage.from('biblio-covers').upload(path, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })
    if (!error) return true
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1200 * attempt))
    } else {
      throw error
    }
  }
}

let isSaving = false
function saveSeedSafe() {
  if (isSaving) return
  isSaving = true
  try {
    writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
  } catch (err) {
    // ignorar colisión temporal, se reintentará en el siguiente lote
  } finally {
    isSaving = false
  }
}

async function worker() {
  while (index < targets.length) {
    const it = targets[index++]
    try {
      const { buf, host, isGenerated } = await findCandidateBuffer(it)
      let webp = buf
      if (!isGenerated) {
        webp = await sharp(buf).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
      }

      const path = `${it.type}/${it.id.replace(/^[^:]+:/, '')}.webp`
      await uploadWithRetry(path, webp)

      const { data } = supabase.storage.from('biblio-covers').getPublicUrl(path)
      it.posterUrl = `${data.publicUrl}?v=2`
      it.imageSrc = isGenerated ? 'generated' : host
      it.src = { ...(it.src ?? {}), posterUrl: isGenerated ? 'generated' : 'scrape:' + host }

      const cacheDir = join(COVERS_CACHE, it.type)
      mkdirSync(cacheDir, { recursive: true })
      writeFileSync(join(cacheDir, `${it.id.replace(/^[^:]+:/, '')}.webp`), webp)

      ok++
      if (ok % 20 === 0 || ok === targets.length) {
        console.log(`  [${ONLY || 'all'}] ${ok}/${targets.length} completados`)
        saveSeedSafe()
      }
      await new Promise((r) => setTimeout(r, 120))
    } catch (e) {
      console.error(`  Error en ${it.id}:`, e.message)
      failed.push(it.id)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
console.log(`✓ [${ONLY || 'all'}] Finalizado: ${ok} recuperados. Fallidos: ${failed.length}`)
if (failed.length) {
  console.log('Fallidos:', failed.slice(0, 20).join(', '))
}
