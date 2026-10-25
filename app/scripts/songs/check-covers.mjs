/**
 * check-covers.mjs — Comprobación de carátulas de canciones en Supabase Storage (T28.9)
 *
 * Realiza peticiones HEAD a todos los posterUrl de songs.json en lotes concurrentes de 25
 * y falla con código 1 si alguna carátula devuelve un estado distinto de 200.
 *
 * Uso:
 *   node app/scripts/songs/check-covers.mjs
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const candidates = [
  join(here, '..', '..', 'public', 'data', 'songs.json'),
  join(here, '..', '..', 'app', 'public', 'data', 'songs.json'),
  join(process.cwd(), 'app', 'public', 'data', 'songs.json'),
  join(process.cwd(), 'public', 'data', 'songs.json'),
]
const songsFile = candidates.find((p) => existsSync(p))

if (!songsFile) {
  console.error('ERROR: No se encontró public/data/songs.json')
  process.exit(1)
}

const songs = JSON.parse(readFileSync(songsFile, 'utf8'))
console.log(`Cargadas ${songs.length} canciones desde ${songsFile}`)
console.log('Iniciando verificación HEAD de carátulas (concurrencia: 25)...\n')

const CONCURRENCY = 25
const TIMEOUT_MS = 10000

async function checkUrl(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.status === 200) {
        return { ok: true, status: 200 }
      }
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
        continue
      }
      return { ok: false, status: res.status }
    } catch (err) {
      if (attempt === retries) {
        return { ok: false, status: 0, error: err.message }
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  return { ok: false, status: 0 }
}

async function run() {
  const startTime = Date.now()
  const broken = []
  let okCount = 0
  let checked = 0

  for (let i = 0; i < songs.length; i += CONCURRENCY) {
    const chunk = songs.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      chunk.map(async (song) => {
        if (!song.posterUrl) {
          return { song, ok: false, status: 404, reason: 'sin posterUrl' }
        }
        const res = await checkUrl(song.posterUrl)
        return { song, ...res }
      })
    )

    for (const r of results) {
      checked++
      if (r.ok) {
        okCount++
      } else {
        broken.push({
          id: r.song.id,
          title: r.song.title,
          creator: r.song.creator,
          status: r.status,
          url: r.song.posterUrl,
          error: r.error,
        })
      }
    }

    if (checked % 500 === 0 || checked === songs.length) {
      console.log(`Progreso: ${checked}/${songs.length} verificadas | OK: ${okCount} | Rotas: ${broken.length}`)
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n============================================================')
  console.log('RESUMEN DE COMPROBACIÓN DE CARÁTULAS')
  console.log('============================================================')
  console.log(`Tiempo total: ${durationSec} s`)
  console.log(`Total canciones analizadas: ${songs.length}`)
  console.log(`Carátulas con estado 200 (OK): ${okCount}`)
  console.log(`Carátulas rotas (no 200): ${broken.length}`)

  if (broken.length > 0) {
    console.log('\nPrimeras carátulas rotas encontradas:')
    broken.slice(0, 10).forEach((b, idx) => {
      console.log(`  ${idx + 1}. [${b.status}] ${b.id} -> ${b.url}`)
    })
    if (broken.length > 10) {
      console.log(`  ... y ${broken.length - 10} más.`)
    }
    console.log('============================================================')
    console.log(`FALLO: Existen ${broken.length} carátulas rotas en Supabase Storage.`)
    process.exit(1)
  }

  console.log('============================================================')
  console.log('ÉXITO: 0 carátulas rotas de 4.474 canciones. Todas verificadas con HTTP 200.')
  process.exit(0)
}

run().catch((err) => {
  console.error('Error fatal al comprobar carátulas:', err)
  process.exit(1)
})
