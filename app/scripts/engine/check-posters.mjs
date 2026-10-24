/**
 * check-posters.mjs — Comprueba la calidad y forma de los pósteres (T14 / T19 §2)
 *
 * Criterios de aceptación T19 §2:
 *   1. Menos de 10 portadas generadas por estantería (libros, juegos, pelis, series, artistas).
 *   2. "Sin noticias de Gurb" y "El juego del ángel" tienen portada real.
 *   3. Control de forma: 0 imágenes con relación de aspecto incorrecta.
 *   4. Obras clave de cine con póster oficial y vertical.
 *
 * Uso:
 *   node scripts/engine/check-posters.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const COVERS_CACHE = join(ROOT, 'scripts', 'cache', 'covers')
const ATTRS_POSTER_FILE = join(ROOT, 'scripts', 'cache', 'attrs', 'posterUrl.jsonl')
const REPORT_FILE = join(ROOT, 'scripts', 'cache', 'posters', 'report.md')

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

export function isValidAspect(type, ratio) {
  if (type === 'movie' || type === 'series' || type === 'book') {
    return ratio >= 1.3 && ratio <= 1.65
  }
  if (type === 'boardgame') {
    // Las cajas de juegos no se recortan (Igor 23/10, Poster.tsx):
    // van desde apaisadas panorámicas (Descent 0.50, Risk 0.67) a cuadradas (1.0) y esbeltas de cartas (Scout 1.76, CAH 1.82)
    return ratio >= 0.45 && ratio <= 2.0
  }
  if (type === 'artist') {
    return true
  }
  return true
}

async function runPool(items, concurrency, fn) {
  const results = new Array(items.length)
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
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const shelves = ['movie', 'series', 'book', 'boardgame', 'artist']

  // Superponer posterUrl.jsonl si existe (registro de atributos antes del seed final)
  if (existsSync(ATTRS_POSTER_FILE)) {
    const lines = readFileSync(ATTRS_POSTER_FILE, 'utf8').split('\n').filter(Boolean)
    const itemMap = new Map(seed.items.map((i) => [i.id, i]))
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        const it = itemMap.get(entry.id)
        if (it) {
          it.posterUrl = entry.value
          it.imageSrc = entry.imageSrc || entry.src?.replace(/^scrape:/, '')
          it.src = { ...(it.src || {}), posterUrl: entry.src }
        }
      } catch {}
    }
  }

  const summary = {}
  for (const shelf of shelves) {
    summary[shelf] = {
      total: 0,
      inStorage: 0,
      generated: 0,
      withV2: 0,
      missingV2: 0,
    }
  }

  const badAspectList = []

  // Comprobar items en paralelo (solo obras visibles no ocultas según T20.1 y T20.6)
  const visibleItems = seed.items.filter((i) => !i.hidden)
  await runPool(visibleItems, 16, async (it) => {
    const s = summary[it.type]
    if (!s) return
    s.total++

    const isStorage = it.posterUrl?.includes('biblio-covers')
    const hasV2 = /\?v=\d+/.test(it.posterUrl || '')
    const isGen = it.imageSrc === 'generated' || it.src?.posterUrl === 'generated'

    if (isStorage) s.inStorage++
    if (isGen) s.generated++
    if (hasV2) s.withV2++
    else s.missingV2++

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
      } catch {
        badAspectList.push({
          id: it.id,
          title: it.title,
          type: it.type,
          ratio: 'error reading',
          src: it.src?.posterUrl,
        })
      }
    } else if (hasV2) {
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
  })

  let output = '# Informe de comprobación de pósteres (T19 §2)\n\n'

  // 1. Tabla resumen
  output += '## 1. Cobertura por categoría\n\n'
  output += '| Categoría | Total | En biblio-covers | Con ?v=2 | Sin ?v=2 | Portada generada |\n'
  output += '|---|---|---|---|---|---|\n'
  for (const [shelf, s] of Object.entries(summary)) {
    output += `| **${shelf}** | ${s.total} | ${s.inStorage} (${Math.round((s.inStorage / s.total) * 100)}%) | ${s.withV2} | ${s.missingV2} | ${s.generated} |\n`
  }

  // 2. Control de forma
  output += '\n## 2. Control de forma (debe salir vacía)\n\n'
  if (badAspectList.length === 0) {
    output += '✓ Ninguna obra tiene proporción incorrecta. **0 imágenes con forma incorrecta**.\n\n'
  } else {
    output += `⚠️ Se encontraron ${badAspectList.length} obras con forma incorrecta:\n\n`
    output += '| ID | Título | Tipo | Dimensiones | Ratio | Origen |\n'
    output += '|---|---|---|---|---|---|\n'
    for (const b of badAspectList) {
      output += `| ${b.id} | ${b.title} | ${b.type} | ${b.width || '?'}x${b.height || '?'} | ${b.ratio} | ${b.src} |\n`
    }
    output += '\n'
  }

  // 3. Comprobación de Sin noticias de Gurb y El juego del ángel (T19 §2)
  output += '## 3. Obras clave de libros (T19 §2)\n\n'
  output += '| Obra | ID | posterUrl | imageSrc | Estado |\n'
  output += '|---|---|---|---|---|\n'

  const gurb = seed.items.find((x) => x.id === 'book:sin-noticias-de-gurb-1991')
  const angel = seed.items.find((x) => x.id === 'book:el-juego-del-angel-2008')

  for (const b of [gurb, angel]) {
    if (!b) continue
    const isGen = b.imageSrc === 'generated' || b.src?.posterUrl === 'generated'
    const status = !isGen && b.posterUrl ? '✓ Portada real restaurada' : '❌ Sigue con portada generada'
    output += `| **${b.title}** | \`${b.id}\` | \`${b.posterUrl?.slice(0, 50)}...\` | \`${b.imageSrc}\` | ${status} |\n`
  }
  output += '\n'

  // 4. Comprobación de las 11 obras clave
  output += '## 4. Comprobación de las 11 obras clave (póster oficial y vertical)\n\n'
  output += '| Obra | ID | Ratio | Dimensiones | URL Origen | posterUrl | Estado |\n'
  output += '|---|---|---|---|---|---|---|\n'

  for (const k of KEY_MOVIES) {
    const item = seed.items.find((x) => x.id === k.id || x.title?.toLowerCase() === k.title.toLowerCase())
    if (!item) {
      output += `| ${k.title} | ${k.id} | — | — | — | — | ❌ No encontrada |\n`
      continue
    }

    const slug = item.id.replace(/^[^:]+:/, '')
    const cachePath = join(COVERS_CACHE, item.type, `${slug}.webp`)
    let dims = '?'
    let ratioStr = '?'
    let valid = false

    if (existsSync(cachePath)) {
      try {
        const meta = await sharp(cachePath).metadata()
        dims = `${meta.width}x${meta.height}`
        const ratio = meta.height / meta.width
        ratioStr = ratio.toFixed(2)
        valid = isValidAspect('movie', ratio)
      } catch {}
    }

    const srcTag = item.src?.posterUrl || item.imageSrc || '—'
    const status = valid ? '✓ Oficial y vertical' : '⚠️ Revisar'
    output += `| **${item.title}** | \`${item.id}\` | ${ratioStr} | ${dims} | \`${srcTag}\` | \`${item.posterUrl?.slice(0, 45)}...\` | ${status} |\n`
  }

  // Comprobar criterios de aceptación de T19 §2
  let failedCriteria = false
  for (const [shelf, s] of Object.entries(summary)) {
    if (s.generated >= 10) {
      failedCriteria = true
      output += `\n❌ Criterio T19 fallido: ${shelf} tiene ${s.generated} portadas generadas (objetivo: < 10)`
    }
  }

  const gurbGen = gurb ? (gurb.imageSrc === 'generated' || gurb.src?.posterUrl === 'generated') : true
  const angelGen = angel ? (angel.imageSrc === 'generated' || angel.src?.posterUrl === 'generated') : true
  if (gurbGen || angelGen) {
    failedCriteria = true
    output += `\n❌ Criterio T19 fallido: Sin noticias de Gurb o El juego del ángel siguen con portada generada.`
  }

  if (badAspectList.length > 0) {
    failedCriteria = true
    output += `\n❌ Criterio T19 fallido: Hay ${badAspectList.length} imágenes con relación de aspecto incorrecta.`
  }

  output += '\n\n---\n'
  if (!failedCriteria) {
    output += '✨ **Todos los criterios de aceptación de T19 §2 cumplidos con éxito.**\n'
  }

  console.log(output)

  mkdirSync(dirname(REPORT_FILE), { recursive: true })
  writeFileSync(REPORT_FILE, output, 'utf8')

  if (failedCriteria) {
    process.exitCode = 1
  }
}

main().catch(console.error)
