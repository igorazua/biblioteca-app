/**
 * covers.mjs — Sube las portadas de seed.json a Supabase Storage (biblio-covers)
 * convertidas a WebP a 342px de ancho.
 *
 * MOTOR v2 §2b / TAREAS_MOTOR_V2.md T1
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/engine/covers.mjs [--sample 20]
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')

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

function generateSvgCover(item) {
  const h = hash(item.id)
  const [deep, mid, light] = PALETTES[h % PALETTES.length]
  const angle = 155 + ((h >> 5) % 50)
  const cx = 25 + ((h >> 9) % 50)
  const cy = 18 + ((h >> 13) % 30)
  const shape = (h >> 17) % 3
  const safeTitle = (item.title || '')
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
      <text x="24" y="475" font-family="sans-serif" font-size="14" fill="#cbd5e1">
        ${item.creator || item.year || ''}
      </text>
    </svg>
  `.trim()
}

async function fetchBufferWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

async function processItem(item) {
  const shelf = item.type
  const slug = item.id.replace(/^[^:]+:/, '')
  const currentUrl = item.posterUrl

  // Si ya está en Supabase Storage biblio-covers, no hacer nada
  if (currentUrl && currentUrl.includes('/biblio-covers/')) {
    return { status: 'skipped', id: item.id, url: currentUrl }
  }

  let imageBuffer = null
  let isGenerated = false

  // 1. Intentar descargar URL actual si existe y no es de Amazon/Goodreads rota
  if (currentUrl && !currentUrl.includes('goodreads.com') && !currentUrl.includes('media-amazon.com')) {
    imageBuffer = await fetchBufferWithTimeout(currentUrl)
  }

  // 2. Si no pudimos descargar, buscar en Wikimedia Commons si tiene wikidataId
  if (!imageBuffer && item.wikidataId) {
    try {
      const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${item.wikidataId}.json`
      const wData = await (await fetch(entityUrl)).json()
      const p18 = wData.entities?.[item.wikidataId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
      if (p18) {
        const commonsUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18)}?width=500`
        imageBuffer = await fetchBufferWithTimeout(commonsUrl)
      }
    } catch {}
  }

  // 3. Si es libro y tiene olid
  if (!imageBuffer && item.type === 'book' && item.olid) {
    const olUrl = `https://covers.openlibrary.org/b/olid/${item.olid}-L.jpg`
    imageBuffer = await fetchBufferWithTimeout(olUrl)
  }

  // 4. Si aún no hay imagen, generar portada SVG
  if (!imageBuffer) {
    const svg = generateSvgCover(item)
    imageBuffer = Buffer.from(svg)
    isGenerated = true
  }

  // 5. Convertir a WebP 342px de ancho con sharp
  let webpBuffer = null
  try {
    if (isGenerated) {
      webpBuffer = await sharp(imageBuffer).webp({ quality: 85 }).toBuffer()
    } else {
      webpBuffer = await sharp(imageBuffer)
        .resize({ width: 342, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
    }
  } catch (err) {
    // Si falla el procesamiento con sharp (e.g. buffer corrupto), fallback a portada generada
    const svg = generateSvgCover(item)
    webpBuffer = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer()
    isGenerated = true
  }

  // 6. Subir a Supabase Storage
  const storagePath = isGenerated ? `generated/${slug}.webp` : `${shelf}/${slug}.webp`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, webpBuffer, {
    contentType: 'image/webp',
    upsert: true,
  })

  if (uploadError) {
    throw new Error(`Upload error para ${item.id}: ${uploadError.message}`)
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const newUrl = publicData.publicUrl

  item.posterUrl = newUrl
  return { status: 'uploaded', id: item.id, url: newUrl, isGenerated }
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
    console.log(`Modo muestra activado: procesando ${SAMPLE_LIMIT} obras...`)
    // Tomar una muestra representativa de cada estantería
    const sampleItems = []
    const byType = {}
    for (const it of items) {
      byType[it.type] = byType[it.type] || []
      byType[it.type].push(it)
    }
    const perShelf = Math.ceil(SAMPLE_LIMIT / Object.keys(byType).length)
    for (const shelfItems of Object.values(byType)) {
      sampleItems.push(...shelfItems.slice(0, perShelf))
    }
    targets = sampleItems.slice(0, SAMPLE_LIMIT)
  }

  console.log(`Total a procesar: ${targets.length} obras.`)

  let count = 0
  let uploaded = 0
  let skipped = 0
  const sampleResults = []

  for (const item of targets) {
    try {
      const res = await processItem(item)
      count++
      if (res.status === 'uploaded') {
        uploaded++
        if (SAMPLE_LIMIT) {
          sampleResults.push(res)
          console.log(`  [${count}/${targets.length}] Subida ${res.id} (${res.isGenerated ? 'generada' : 'real'}): ${res.url}`)
        } else if (count % 50 === 0 || count === targets.length) {
          console.log(`  Progreso: ${count}/${targets.length} (subidas: ${uploaded}, existentes: ${skipped})`)
        }
      } else {
        skipped++
      }
    } catch (e) {
      console.warn(`  Error en ${item.id}:`, e.message)
    }
  }

  // Guardar seed.json actualizado con las URLs de Supabase
  writeFileSync(SEED_FILE, JSON.stringify(seed))
  console.log(`\n✓ Portadas actualizadas en seed.json. Subidas: ${uploaded}, Saltadas: ${skipped}.`)

  if (SAMPLE_LIMIT) {
    console.log('\n--- URLs DE MUESTRA PARA COMPROBAR EN SUPABASE ---')
    sampleResults.slice(0, 10).forEach((r) => console.log(`- ${r.id}: ${r.url}`))
  }
}

main().catch((err) => {
  console.error('Error fatal en covers.mjs:', err)
  process.exit(1)
})
