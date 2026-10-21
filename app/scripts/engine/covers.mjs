/**
 * covers.mjs — Sube las portadas de seed.json a Supabase Storage (biblio-covers)
 * convertidas a WebP a 342px de ancho.
 *
 * MOTOR v2 §2b / TAREAS_MOTOR_V2.md T1
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/engine/covers.mjs [--sample 20]
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

const args = process.argv.slice(2)
const sampleIdx = args.indexOf('--sample')
const SAMPLE_LIMIT = sampleIdx !== -1 ? parseInt(args[sampleIdx + 1], 10) : null

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET = 'biblio-covers'

const PALETTES = [
  ['#0d1b2a', '#1b4965', '#5fa8d3'],
  ['#1a0b10', '#6d1a36', '#e07a5f'],
  ['#0b1a14', '#1f4d3a', '#8cc084'],
  ['#160f24', '#45306b', '#b392f0'],
  ['#1f1206', '#7a4210', '#f2a541'],
  ['#0a1416', '#16525a', '#7ad3c9'],
  ['#1c0a06', '#8c2f1b', '#f28c5e'],
  ['#101010', '#3a3a46', '#c9c3b6'],
]

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function createNativeFallbackBuffer(item) {
  const h = hash(item.id)
  const [deep, mid] = PALETTES[h % PALETTES.length]
  const r = parseInt(deep.slice(1, 3), 16)
  const g = parseInt(deep.slice(3, 5), 16)
  const b = parseInt(deep.slice(5, 7), 16)
  return sharp({
    create: {
      width: 342,
      height: 513,
      channels: 4,
      background: { r, g, b, alpha: 1 },
    },
  })
    .webp({ quality: 80 })
    .toBuffer()
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
    shapeElement = `<circle cx="${cx * 3.42}" cy="${cy * 5.13}" r="${31 * 3.42}" fill="${light}" opacity="0.45" />`
  } else if (shape === 1) {
    shapeElement = `<circle cx="${cx * 3.42}" cy="${(cy - 10) * 5.13}" r="${55 * 3.42}" fill="none" stroke="${light}" stroke-width="15" opacity="0.3" />`
  } else {
    shapeElement = `<rect x="-50" y="${(cy + 8) * 5.13}" width="450" height="110" fill="${light}" opacity="0.25" transform="rotate(${-18 + ((h >> 3) % 36)} 171 256)" />`
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="342" height="513" viewBox="0 0 342 513">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${mid}" />
          <stop offset="72%" stop-color="${deep}" />
        </linearGradient>
      </defs>
      <rect width="342" height="513" fill="url(#bg)" />
      ${shapeElement}
      <rect width="342" height="513" fill="black" opacity="0.25" />
      <text x="24" y="440" font-family="sans-serif" font-weight="bold" font-size="24" fill="#ffffff" width="294">
        ${safeTitle.length > 32 ? safeTitle.slice(0, 30) + '...' : safeTitle}
      </text>
    </svg>
  `.trim()
}

async function fetchBufferWithTimeout(url, timeoutMs = 8000) {
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
  const currentUrl = item.posterUrl

  // Si ya está en Supabase Storage biblio-covers, no hacer nada
  if (currentUrl && currentUrl.includes('/biblio-covers/')) {
    return { status: 'skipped', id: item.id, url: currentUrl }
  }

  const shelfCacheDir = join(CACHE_DIR, shelf)
  mkdirSync(shelfCacheDir, { recursive: true })
  const localCachePath = join(shelfCacheDir, `${slug}.webp`)

  let webpBuffer = null
  let isGenerated = false

  if (existsSync(localCachePath)) {
    webpBuffer = readFileSync(localCachePath)
  } else {
    let imageBuffer = null

    // 1. Intentar descargar URL actual
    if (currentUrl) {
      imageBuffer = await fetchBufferWithTimeout(currentUrl)
    }

    // 2. Si es serie y no hubo imagen, TVmaze
    if (!imageBuffer && item.type === 'series') {
      try {
        const tvUrl = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`
        const tvRes = await fetch(tvUrl, { headers: { 'User-Agent': 'Biblioteca/0.1' } })
        if (tvRes.ok) {
          const show = await tvRes.json()
          const imgUrl = show.image?.original || show.image?.medium
          if (imgUrl) imageBuffer = await fetchBufferWithTimeout(imgUrl)
        }
      } catch {}
    }

    // 3. Si tiene wikidataId, buscar P3383 (cartel) o P18 (imagen)
    if (!imageBuffer && item.wikidataId) {
      try {
        const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${item.wikidataId}.json`
        const wData = await (await fetch(entityUrl)).json()
        const claims = wData.entities?.[item.wikidataId]?.claims
        const p3383 = claims?.P3383?.[0]?.mainsnak?.datavalue?.value
        const p18 = claims?.P18?.[0]?.mainsnak?.datavalue?.value
        const targetImg = p3383 || p18
        if (targetImg) {
          const commonsUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(targetImg)}?width=500`
          imageBuffer = await fetchBufferWithTimeout(commonsUrl)
        }
      } catch {}
    }

    // 4. Si es libro y tiene olid
    if (!imageBuffer && item.type === 'book' && item.olid) {
      const olUrl = `https://covers.openlibrary.org/b/olid/${item.olid}-L.jpg`
      imageBuffer = await fetchBufferWithTimeout(olUrl)
    }

    // Convertir a WebP
    try {
      if (imageBuffer) {
        webpBuffer = await sharp(imageBuffer)
          .resize({ width: 342, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer()
      } else {
        const svg = generateSvgCover(item)
        webpBuffer = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer()
        isGenerated = true
      }
    } catch {
      webpBuffer = await createNativeFallbackBuffer(item)
      isGenerated = true
    }

    writeFileSync(localCachePath, webpBuffer)
  }

  // Subir a Supabase Storage
  const storagePath = `${shelf}/${slug}.webp`
  await uploadWithRetry(storagePath, webpBuffer)

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const newUrl = publicData.publicUrl

  item.posterUrl = newUrl
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
  console.log('--- Proceso de Portadas en Supabase Storage (covers.mjs) ---')

  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json')
    process.exit(1)
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  let targets = items
  if (SAMPLE_LIMIT) {
    console.log(`Modo muestra activado: procesando ${SAMPLE_LIMIT} obras pendientes...`)
    const byType = {}
    for (const it of items) {
      if (it.posterUrl && it.posterUrl.includes('/biblio-covers/')) continue
      byType[it.type] = byType[it.type] || []
      byType[it.type].push(it)
    }
    const sampleItems = []
    const perShelf = Math.ceil(SAMPLE_LIMIT / (Object.keys(byType).length || 1))
    for (const shelfItems of Object.values(byType)) {
      sampleItems.push(...shelfItems.slice(0, perShelf))
    }
    targets = sampleItems.slice(0, SAMPLE_LIMIT)
  }

  console.log(`Total a procesar: ${targets.length} obras.`)

  let uploaded = 0
  let skipped = 0
  let errors = 0
  const sampleResults = []

  const CONCURRENCY = 4
  let done = 0

  await runPool(targets, CONCURRENCY, async (item) => {
    try {
      const res = await processItem(item)
      done++
      if (res.status === 'uploaded') {
        uploaded++
        if (sampleResults.length < 10) sampleResults.push(res)
      } else {
        skipped++
      }
      if (done % 100 === 0 || done === targets.length) {
        console.log(`  [${done}/${targets.length}] subidas: ${uploaded}, existentes: ${skipped}, errores: ${errors}`)
      }
    } catch (e) {
      errors++
      done++
      console.warn(`  [${done}/${targets.length}] Error en ${item.id}:`, e.message)
    }
  })

  // Guardar seed.json con formato bonito
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
  console.log(`\n✓ Portadas actualizadas en seed.json. Subidas: ${uploaded}, Saltadas: ${skipped}, Errores: ${errors}.`)

  if (sampleResults.length > 0) {
    console.log('\n--- URLs DE MUESTRA SUBIDAS A SUPABASE ---')
    sampleResults.forEach((r) => console.log(`- ${r.id}: ${r.url} (${r.isGenerated ? 'generada' : 'real'})`))
  }
}

main().catch((err) => {
  console.error('Error fatal en covers.mjs:', err)
  process.exit(1)
})
