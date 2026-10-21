/**
 * enrich-series-tvmaze.mjs — Enriquecimiento de series con metadatos de TVmaze (MOTOR v2 §2b.2, T13).
 *
 * TVmaze es gratuito, sin clave y con endpoints públicos:
 *   - /search/shows?q=...
 *   - /shows/:id?embed=seasons
 *
 * Extrae:
 *   - seasons: número de temporadas
 *   - episodes: número total de episodios
 *   - durationMin: duración media por episodio
 *   - network: cadena original o plataforma emisora
 *   - ongoing: si la serie sigue en emisión (status === 'Running')
 *
 * Caché local en scripts/cache/tvmaze/<slug>.json para reanudación instantánea.
 *
 * Uso:
 *   node scripts/engine/enrich-series-tvmaze.mjs [--sample 50] [--apply]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_TVMAZE_DIR = join(here, '..', 'cache', 'tvmaze')
const CACHE_ATTRS_DIR = join(here, '..', 'cache', 'attrs')

const args = process.argv.slice(2)
const DO_APPLY = args.includes('--apply')
const sampleArgIdx = args.indexOf('--sample')
const SAMPLE = sampleArgIdx !== -1 ? parseInt(args[sampleArgIdx + 1], 10) : null

function ensureDirs() {
  if (!existsSync(CACHE_TVMAZE_DIR)) mkdirSync(CACHE_TVMAZE_DIR, { recursive: true })
  if (!existsSync(CACHE_ATTRS_DIR)) mkdirSync(CACHE_ATTRS_DIR, { recursive: true })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const USER_AGENT = 'BibliotecaApp/1.0 ( series-enricher; mailto:contact@biblioteca.app )'

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    return null
  }
}

async function findShowOnTVmaze(title, year) {
  // Limpiar título de sufijos de país tipo (EE. UU.), (España), etc.
  const clean = title.replace(/\s*\([^)]*\)/g, '').trim()
  const queries = [
    title,
    clean,
    clean.replace(/\by\b/g, 'and'),
  ]

  for (const q of queries) {
    const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`
    const list = await fetchJson(url)
    await sleep(150)
    if (Array.isArray(list) && list.length > 0) {
      for (const item of list) {
        const show = item.show
        if (!show) continue
        const premYear = show.premiered ? parseInt(show.premiered.slice(0, 4), 10) : null
        // Comprobar año con margen de 1 año (estreno original vs estreno en España)
        if (premYear && Math.abs(premYear - year) <= 1) {
          return show
        }
      }
      // Si la lista tiene un único resultado con puntuación alta y nombre muy cercano
      if (list.length === 1 && list[0].score > 15) {
        return list[0].show
      }
    }
  }

  return null
}

async function getShowDetails(showId) {
  const url = `https://api.tvmaze.com/shows/${showId}?embed=seasons`
  const data = await fetchJson(url)
  await sleep(150)
  return data
}

async function main() {
  ensureDirs()
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const series = seed.items.filter((i) => i.type === 'series')
  console.log(`\n=== ENRIQUECEDOR DE SERIES VÍA TVMAZE (T13) ===`)
  console.log(`Total series en catálogo: ${series.length}`)

  let targets = series
  if (SAMPLE) targets = targets.slice(0, SAMPLE)
  console.log(`Procesando: ${targets.length} series (Modo apply: ${DO_APPLY ? 'SÍ' : 'NO (simulación)'})\n`)

  let hitCount = 0
  let missCount = 0
  const enrichedMap = new Map()

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i]
    const slug = item.id.replace(/^series:/, '')
    const cachePath = join(CACHE_TVMAZE_DIR, `${slug}.json`)

    let tvData = null
    if (existsSync(cachePath)) {
      try {
        tvData = JSON.parse(readFileSync(cachePath, 'utf8'))
      } catch {}
    }

    if (!tvData) {
      const showBasic = await findShowOnTVmaze(item.title, item.year)
      if (showBasic?.id) {
        const fullShow = await getShowDetails(showBasic.id)
        if (fullShow) {
          const seasons = fullShow._embedded?.seasons || []
          const seasonCount = seasons.length || null
          const totalEpisodes = seasons.reduce((sum, s) => sum + (s.episodeOrder || 0), 0) || null
          const avgRuntime = fullShow.averageRuntime || fullShow.runtime || null
          const network = fullShow.network?.name || fullShow.webChannel?.name || null
          const ongoing = fullShow.status === 'Running'

          tvData = {
            id: fullShow.id,
            name: fullShow.name,
            premiered: fullShow.premiered,
            status: fullShow.status,
            seasons: seasonCount,
            episodes: totalEpisodes,
            durationMin: avgRuntime,
            network,
            ongoing,
            fetchedAt: new Date().toISOString(),
          }
          writeFileSync(cachePath, JSON.stringify(tvData, null, 2), 'utf8')
        }
      } else {
        // Guardar marcador de no encontrado para no repetir peticiones
        tvData = { notFound: true, fetchedAt: new Date().toISOString() }
        writeFileSync(cachePath, JSON.stringify(tvData, null, 2), 'utf8')
      }
    }

    if (tvData && !tvData.notFound) {
      hitCount++
      enrichedMap.set(item.id, tvData)
      if (i < 10 || i % 50 === 0) {
        console.log(`[${i + 1}/${targets.length}] ✓ ${item.title} -> S:${tvData.seasons} Ep:${tvData.episodes} Dur:${tvData.durationMin}m Net:${tvData.network} (${tvData.status})`)
      }
    } else {
      missCount++
      if (i < 10 || i % 50 === 0) {
        console.log(`[${i + 1}/${targets.length}] ✗ No encontrado: ${item.title} (${item.year})`)
      }
    }
  }

  console.log(`\n--- RESUMEN TVMAZE ---`)
  console.log(`Coincidencias encontradas: ${hitCount}/${targets.length} (${((hitCount / targets.length) * 100).toFixed(1)}%)`)
  console.log(`No encontradas: ${missCount}/${targets.length}`)

  if (DO_APPLY) {
    console.log(`\nAplicando a seed.json...`)
    let updatedItems = 0
    for (const item of seed.items) {
      if (item.type === 'series') {
        const tv = enrichedMap.get(item.id)
        if (tv) {
          item.src = item.src || {}
          if (tv.seasons != null) {
            item.seasons = tv.seasons
            item.src.seasons = 'tvmaze'
          }
          if (tv.episodes != null) {
            item.episodes = tv.episodes
            item.src.episodes = 'tvmaze'
          }
          if (tv.durationMin != null && !item.durationMin) {
            item.durationMin = tv.durationMin
            item.src.durationMin = 'tvmaze'
          }
          if (tv.network != null) {
            item.network = tv.network
            item.src.network = 'tvmaze'
          }
          if (tv.ongoing != null) {
            item.ongoing = tv.ongoing
            item.src.ongoing = 'tvmaze'
          }
          updatedItems++
        }
      }
    }

    writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
    console.log(`✓ seed.json actualizado con ${updatedItems} series enriquecidas con TVmaze`)
  }
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
