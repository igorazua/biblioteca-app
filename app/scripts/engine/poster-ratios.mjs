/**
 * poster-ratios.mjs — Mide la proporción (ancho / alto) de las portadas guardadas (T29.1).
 *
 * 1. Recorre app/scripts/cache/covers/<estantería>/*.webp de todas las estanterías del catálogo.
 * 2. Mide cada imagen con sharp (metadata() -> width / height).
 * 3. Valida la correspondencia 1:1 contra seed.json (detiene si > 5 juegos no casan).
 * 4. Escribe app/scripts/cache/attrs/posterRatio.jsonl con formato estándar de atributos.
 * 5. Obras con póster generado (sin imagen real) no llevan posterRatio.
 *
 * Uso:
 *   node scripts/engine/poster-ratios.mjs
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const COVERS_DIR = join(ROOT, 'scripts', 'cache', 'covers')
const ATTRS_DIR = join(ROOT, 'scripts', 'cache', 'attrs')
const RATIOS_FILE = join(ATTRS_DIR, 'posterRatio.jsonl')

const SHELVES = ['boardgame', 'movie', 'series', 'book', 'artist']

async function main() {
  console.log('=== Midiendo proporciones de portadas (poster-ratios.mjs) ===\n')

  if (!existsSync(SEED_FILE)) {
    console.error('Error: no se encuentra seed.json en:', SEED_FILE)
    process.exit(1)
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []
  const itemMap = new Map(items.map((it) => [it.id, it]))

  mkdirSync(ATTRS_DIR, { recursive: true })

  // 1. Verificación previa de relaciones contra seed.json
  console.log('--- Comprobación de correspondencia archivos <-> seed.json ---')
  let boardgameUnmatchedFiles = 0
  let boardgameMissingCovers = 0

  const shelfFiles = new Map()

  for (const shelf of SHELVES) {
    const dir = join(COVERS_DIR, shelf)
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.webp')) : []
    shelfFiles.set(shelf, files)

    let unmatched = 0
    for (const f of files) {
      const slug = f.replace(/\.webp$/, '')
      const id = `${shelf}:${slug}`
      if (!itemMap.has(id)) {
        unmatched++
        if (shelf === 'boardgame') boardgameUnmatchedFiles++
      }
    }

    const shelfItems = items.filter((it) => it.type === shelf)
    let missingCovers = 0
    for (const it of shelfItems) {
      if (it.imageSrc !== 'generated') {
        const slug = it.id.replace(/^[^:]+:/, '')
        const filePath = join(dir, `${slug}.webp`)
        if (!existsSync(filePath)) {
          missingCovers++
          if (shelf === 'boardgame') boardgameMissingCovers++
        }
      }
    }

    console.log(`[${shelf.padEnd(9)}] Archivos: ${String(files.length).padStart(4)} | No casan con seed: ${unmatched} | Obras con portada real sin archivo: ${missingCovers}`)
  }

  if (boardgameUnmatchedFiles > 5) {
    console.error(`\nALERTA CRÍTICA: ${boardgameUnmatchedFiles} archivos de boardgame no casan con seed.json (> 5 permitido). Abortando.`)
    process.exit(1)
  }
  if (boardgameMissingCovers > 5) {
    console.error(`\nALERTA CRÍTICA: ${boardgameMissingCovers} juegos con portada real no tienen archivo webp (> 5 permitido). Abortando.`)
    process.exit(1)
  }

  // 2. Medir imágenes con sharp
  console.log('\n--- Midiendo dimensiones con sharp y generando posterRatio.jsonl ---')
  const dateStr = new Date().toISOString().slice(0, 10)
  const lines = []
  let measuredTotal = 0
  let generatedSkipped = 0

  // Estadísticas de formas para boardgames
  const bgBuckets = {
    vertical: 0,   // < 0.8
    casi3a4: 0,    // 0.8 - 0.95
    cuadrada: 0,   // 0.95 - 1.05
    apaisada: 0,   // > 1.05
  }
  const bgSamples = []

  for (const shelf of SHELVES) {
    const dir = join(COVERS_DIR, shelf)
    const files = shelfFiles.get(shelf) || []

    for (const f of files) {
      const slug = f.replace(/\.webp$/, '')
      const id = `${shelf}:${slug}`
      const item = itemMap.get(id)

      // Si el item no existe o su póster es generado, omitir
      if (!item) continue
      if (item.imageSrc === 'generated') {
        generatedSkipped++
        continue
      }

      const filePath = join(dir, f)
      try {
        const meta = await sharp(filePath).metadata()
        if (meta.width && meta.height) {
          const ratio = Math.round((meta.width / meta.height) * 1000) / 1000
          lines.push(JSON.stringify({
            id,
            value: ratio,
            src: 'measured',
            conf: 1,
            at: dateStr,
          }))
          measuredTotal++

          if (shelf === 'boardgame') {
            if (ratio < 0.8) bgBuckets.vertical++
            else if (ratio <= 0.95) bgBuckets.casi3a4++
            else if (ratio <= 1.05) bgBuckets.cuadrada++
            else bgBuckets.apaisada++

            bgSamples.push({ id, title: item.title, ratio })
          }
        }
      } catch (err) {
        console.warn(`Error midiendo ${filePath}:`, err.message)
      }
    }
  }

  writeFileSync(RATIOS_FILE, lines.join('\n') + '\n', 'utf8')
  console.log(`\nGuardado ${RATIOS_FILE} con ${lines.length} registros (medidos: ${measuredTotal}, generados omitidos: ${generatedSkipped}).`)

  // Reporte detallado para el registro
  const totalBg = items.filter((it) => it.type === 'boardgame' && it.imageSrc !== 'generated').length
  const bgWithRatio = bgSamples.length

  console.log('\n=== Estadísticas de Juegos de Mesa (T29.1) ===')
  console.log(`Juegos con portada real: ${totalBg}`)
  console.log(`Juegos con posterRatio medido: ${bgWithRatio} (${((bgWithRatio / totalBg) * 100).toFixed(1)}%)`)
  console.log('\nDistribución de formas en boardgame (ancho / alto):')
  console.log(`- Vertical (< 0,8):        ${bgBuckets.vertical}`)
  console.log(`- Casi 3:4 (0,8 – 0,95):    ${bgBuckets.casi3a4}`)
  console.log(`- Cuadrada (0,95 – 1,05):   ${bgBuckets.cuadrada}`)
  console.log(`- Apaisada (> 1,05):       ${bgBuckets.apaisada}`)

  // 10 juegos de muestra: 5 verticales y 5 apaisados
  const verticals = bgSamples.filter((s) => s.ratio < 0.8).slice(0, 5)
  const landscapes = bgSamples.filter((s) => s.ratio > 1.05).slice(0, 5)

  console.log('\nMuestra de 5 juegos verticales:')
  for (const v of verticals) {
    console.log(`  ${v.id.padEnd(35)} | ratio: ${v.ratio.toFixed(3)} | ${v.title}`)
  }

  console.log('\nMuestra de 5 juegos apaisados:')
  for (const l of landscapes) {
    console.log(`  ${l.id.padEnd(35)} | ratio: ${l.ratio.toFixed(3)} | ${l.title}`)
  }
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
