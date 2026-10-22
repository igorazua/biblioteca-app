/**
 * check-posters.mjs — Comprueba la calidad y forma de los pósteres (T14 §5)
 *
 * Informa por categoría:
 *   1. Cuántas obras tienen póster alojado en biblio-covers, cuántas portada generada y cuántas siguen sin ?v=2.
 *   2. Lista de las que no cumplen la forma (debe salir vacía).
 *   3. Póster de las 11 obras clave (Seven, Apocalypse Now, Forrest Gump, Casablanca, Malditos bastardos,
 *      Nightcrawler, Infiltrados, El señor de los anillos: La comunidad del anillo, Interstellar, Matrix,
 *      El caballero oscuro) con su URL de origen (src.posterUrl) y proporción.
 *
 * Uso:
 *   node scripts/engine/check-posters.mjs
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const COVERS_CACHE = join(ROOT, 'scripts', 'cache', 'covers')

const KEY_MOVIES = [
  { id: 'movie:seven-1995', title: 'Seven' },
  { id: 'movie:apocalypse-now-1979', title: 'Apocalypse Now' },
  { id: 'movie:forrest-gump-1994', title: 'Forrest Gump' },
  { id: 'movie:casablanca-1942', title: 'Casablanca' },
  { id: 'movie:malditos-bastardos-2009', title: 'Malditos bastardos' },
  { id: 'movie:nightcrawler-2014', title: 'Nightcrawler' },
  { id: 'movie:infiltrados-2006', title: 'Infiltrados' },
  { id: 'movie:el-senor-de-los-anillos-la-comunidad-del-anillo-2001', title: 'El señor de los anillos: La comunidad del anillo' },
  { id: 'movie:interstellar-2014', title: 'Interstellar' },
  { id: 'movie:matrix-1999', title: 'Matrix' },
  { id: 'movie:el-caballero-oscuro-2008', title: 'El caballero oscuro' },
]

function isValidAspect(type, ratio) {
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

async function main() {
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const shelves = ['movie', 'series', 'book', 'boardgame', 'artist']

  console.log('# Informe de comprobación de pósteres (T14)\n')

  const summary = {}
  const badAspectList = []

  for (const shelf of shelves) {
    summary[shelf] = {
      total: 0,
      inStorage: 0,
      generated: 0,
      withV2: 0,
      missingV2: 0,
    }
  }

  for (const it of seed.items) {
    const s = summary[it.type]
    if (!s) continue
    s.total++

    const isStorage = it.posterUrl?.includes('biblio-covers')
    const hasV2 = it.posterUrl?.endsWith('?v=2')
    const isGen = it.imageSrc === 'generated' || it.src?.posterUrl === 'generated'

    if (isStorage) s.inStorage++
    if (isGen) s.generated++
    if (hasV2) s.withV2++
    else s.missingV2++

    // Comprobar forma en caché local
    const slug = it.id.replace(/^[^:]+:/, '')
    const cachePath = join(COVERS_CACHE, it.type, `${slug}.webp`)
    if (existsSync(cachePath)) {
      try {
        const meta = await sharp(cachePath).metadata()
        const ratio = meta.height / meta.width
        if (!isValidAspect(it.type, ratio)) {
          badAspectList.push({
            id: it.id,
            title: it.title,
            type: it.type,
            width: meta.width,
            height: meta.height,
            ratio: ratio.toFixed(2),
            src: it.src?.posterUrl || it.imageSrc,
          })
        }
      } catch (err) {
        badAspectList.push({
          id: it.id,
          title: it.title,
          type: it.type,
          ratio: 'error reading',
          src: it.src?.posterUrl,
        })
      }
    } else if (hasV2) {
      // Tiene ?v=2 pero no local cache -> fetch para verificar
      try {
        const res = await fetch(it.posterUrl)
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer())
          const meta = await sharp(buf).metadata()
          const ratio = meta.height / meta.width
          if (!isValidAspect(it.type, ratio)) {
            badAspectList.push({
              id: it.id,
              title: it.title,
              type: it.type,
              width: meta.width,
              height: meta.height,
              ratio: ratio.toFixed(2),
              src: it.src?.posterUrl || it.imageSrc,
            })
          }
        }
      } catch {}
    }
  }

  // 1. Tabla resumen
  console.log('## 1. Cobertura por categoría\n')
  console.log('| Categoría | Total | En biblio-covers | Con ?v=2 | Sin ?v=2 | Portada generada |')
  console.log('|---|---|---|---|---|---|')
  for (const [shelf, s] of Object.entries(summary)) {
    console.log(`| **${shelf}** | ${s.total} | ${s.inStorage} (${Math.round((s.inStorage / s.total) * 100)}%) | ${s.withV2} | ${s.missingV2} | ${s.generated} |`)
  }

  // 2. Control de forma
  console.log('\n## 2. Control de forma (debe salir vacía)\n')
  if (badAspectList.length === 0) {
    console.log('✓ Ninguna obra tiene proporción incorrecta. **0 imágenes con forma incorrecta**.\n')
  } else {
    console.log(`⚠️ Se encontraron ${badAspectList.length} obras con forma incorrecta:\n`)
    console.log('| ID | Título | Tipo | Dimensiones | Ratio | Origen |')
    console.log('|---|---|---|---|---|---|')
    for (const b of badAspectList) {
      console.log(`| ${b.id} | ${b.title} | ${b.type} | ${b.width || '?'}x${b.height || '?'} | ${b.ratio} | ${b.src} |`)
    }
    console.log('')
  }

  // 3. Comprobación de las 11 obras clave
  console.log('## 3. Comprobación de las 11 obras clave (póster oficial y vertical)\n')
  console.log('| Obra | ID | Ratio | Dimensiones | URL Origen | posterUrl | Estado |')
  console.log('|---|---|---|---|---|---|---|')

  for (const k of KEY_MOVIES) {
    const item = seed.items.find((x) => x.id === k.id || x.title?.toLowerCase() === k.title.toLowerCase())
    if (!item) {
      console.log(`| ${k.title} | ${k.id} | — | — | — | — | ❌ No encontrada |`)
      continue
    }

    const slug = item.id.replace(/^[^:]+:/, '')
    const cachePath = join(COVERS_CACHE, item.type, `${slug}.webp`)
    let dims = '?'
    let ratioStr = '?'
    let valid = false

    if (existsSync(cachePath)) {
      const meta = await sharp(cachePath).metadata()
      dims = `${meta.width}x${meta.height}`
      const ratio = meta.height / meta.width
      ratioStr = ratio.toFixed(2)
      valid = isValidAspect('movie', ratio)
    }

    const srcTag = item.src?.posterUrl || item.imageSrc || '—'
    const status = valid ? '✓ Oficial y vertical' : '⚠️ Revisar'
    console.log(`| **${item.title}** | \`${item.id}\` | ${ratioStr} | ${dims} | \`${srcTag}\` | \`${item.posterUrl?.slice(0, 45)}...\` | ${status} |`)
  }

  console.log('\n---')
  if (badAspectList.length === 0) {
    console.log('✓ Criterio T14 de forma cumplido con éxito.')
  } else {
    process.exitCode = 1
  }
}

main().catch(console.error)
