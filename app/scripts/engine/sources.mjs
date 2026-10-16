/**
 * Script de re-anclaje de fuentes oficiales (MOTOR.md §4.2).
 * Descarga y guarda en caché cruda los datos oficiales de TMDB, Open Library,
 * Wikidata y MusicBrainz para sustituir los orígenes no licenciados de la semilla.
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/engine/sources.mjs [opciones]
 *
 * Opciones:
 *   --shelf <shelf>   Filtra por estantería ('movie', 'series', 'book', 'boardgame', 'artist')
 *   --limit <n>       Procesa como máximo n items por estantería (para pruebas)
 *   --refresh         Ignora la caché y vuelve a descargar
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(here, '..', 'cache', 'sources')

const TMDB_KEY = process.env.TMDB_API_KEY
const args = process.argv.slice(2)
const FILTER_SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null
const REFRESH = args.includes('--refresh')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJson(url, options = {}) {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.status === 429) {
        const wait = attempt * 2000
        console.warn(`[429 Rate Limit] esperando ${wait}ms...`)
        await sleep(wait)
        continue
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} para ${url.replace(/api_key=[^&]+/, 'api_key=***')}`)
      }
      return await res.json()
    } catch (err) {
      if (attempt === maxRetries) throw err
      await sleep(attempt * 1000)
    }
  }
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

/**
 * Resuelve películas y series con Wikidata (recurso libre) extrayendo QID, IMDb y TMDb ID
 */
async function fetchWikidataMovieOrSeries(item) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(item.title)}&language=es&format=json&type=item&limit=5`
  const res = await fetchJson(url, {
    headers: { 'User-Agent': 'BibliotecaSocial/1.0.0 ( contact@biblioteca-social.vercel.app )' },
  })
  await sleep(250)

  if (!res.search?.length) return null

  const isMovie = item.type === 'movie'
  const yearStr = `${item.year}`
  let hit = res.search.find((s) => {
    const desc = (s.description || '').toLowerCase()
    const matchesYear = desc.includes(yearStr)
    const matchesType = isMovie
      ? desc.includes('film') || desc.includes('película')
      : desc.includes('series') || desc.includes('serie')
    return matchesYear && matchesType
  })
  if (!hit) {
    hit = res.search.find((s) => {
      const desc = (s.description || '').toLowerCase()
      return isMovie
        ? desc.includes('film') || desc.includes('película')
        : desc.includes('series') || desc.includes('serie')
    })
  }
  if (!hit) hit = res.search[0]

  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${hit.id}.json`
  const entityData = await fetchJson(entityUrl, {
    headers: { 'User-Agent': 'BibliotecaSocial/1.0.0 ( contact@biblioteca-social.vercel.app )' },
  })
  await sleep(250)

  const entity = entityData.entities?.[hit.id]
  if (!entity) return null

  const claims = entity.claims || {}
  const imdbId = claims.P345?.[0]?.mainsnak?.datavalue?.value || null
  const tmdbProp = isMovie ? claims.P4947 : claims.P4983
  const tmdbIdRaw = tmdbProp?.[0]?.mainsnak?.datavalue?.value
  const tmdbId = tmdbIdRaw ? parseInt(tmdbIdRaw, 10) : null
  const sitelinksCount = Object.keys(entity.sitelinks || {}).length

  return {
    source: 'wikidata',
    wikidataId: hit.id,
    tmdbId,
    imdbId,
    title: entity.labels?.es?.value || entity.labels?.en?.value || hit.label,
    year: item.year,
    synopsis: entity.descriptions?.es?.value || entity.descriptions?.en?.value || item.synopsis,
    wikiLangs: sitelinksCount,
    originCountry: claims.P495?.[0]?.mainsnak?.datavalue?.value?.id ? [claims.P495[0].mainsnak.datavalue.value.id] : [],
  }
}

/**
 * Resuelve y enriquece películas y series con TMDB
 */
async function fetchTmdb(item) {
  if (!TMDB_KEY) {
    return fetchWikidataMovieOrSeries(item)
  }

  const kind = item.type === 'movie' ? 'movie' : 'tv'
  const yearParam = item.type === 'movie' ? 'year' : 'first_air_date_year'
  const searchUrl = `https://api.themoviedb.org/3/search/${kind}?api_key=${TMDB_KEY}&language=es-ES&query=${encodeURIComponent(item.title)}&${yearParam}=${item.year}`

  const search = await fetchJson(searchUrl)
  const hit = search.results?.[0]
  if (!hit) return null

  await sleep(250) // Respetar rate limit de TMDB (~40 req / 10s)

  const detailUrl = `https://api.themoviedb.org/3/${kind}/${hit.id}?api_key=${TMDB_KEY}&language=es-ES&append_to_response=keywords,credits,recommendations,similar,release_dates,watch/providers,external_ids`
  const details = await fetchJson(detailUrl)
  await sleep(250)

  return {
    source: 'tmdb',
    tmdbId: hit.id,
    title: details.title || details.name,
    year: parseInt((details.release_date || details.first_air_date || `${item.year}`).slice(0, 4), 10),
    synopsis: details.overview || item.synopsis,
    voteAvg: details.vote_average,
    voteCount: details.vote_count,
    popularity: details.popularity,
    originCountry: details.origin_country || [],
    originalLanguage: details.original_language,
    keywords: (details.keywords?.keywords || details.keywords?.results || []).map((k) => k.name.toLowerCase()),
    wikidataId: details.external_ids?.wikidata_id || null,
    imdbId: details.external_ids?.imdb_id || null,
    providers: details['watch/providers']?.results || {},
    runtime: details.runtime || details.episode_run_time?.[0] || null,
    ongoing: details.status === 'Returning Series',
    collection: details.belongs_to_collection?.name || null,
  }
}

/**
 * Resuelve libros con Open Library
 */
async function fetchOpenLibrary(item) {
  const q = `https://openlibrary.org/search.json?title=${encodeURIComponent(item.title)}&author=${encodeURIComponent(item.creator)}&limit=1&fields=key,subject,ratings_average,ratings_count,want_to_read_count,currently_reading_count,already_read_count,first_publish_year,id_wikidata`
  const res = await fetchJson(q)
  await sleep(200)

  const doc = res.docs?.[0]
  if (!doc) return null

  const readers = (doc.want_to_read_count || 0) + (doc.currently_reading_count || 0) + (doc.already_read_count || 0)

  return {
    source: 'openlibrary',
    olid: doc.key?.replace('/works/', ''),
    wikidataId: doc.id_wikidata?.[0] || null,
    voteAvg: doc.ratings_average ? Math.round(doc.ratings_average * 2 * 10) / 10 : null, // 0-5 a 0-10
    voteCount: doc.ratings_count || 0,
    readers,
    subjects: (doc.subject || []).slice(0, 15).map((s) => s.toLowerCase()),
    firstPublishYear: doc.first_publish_year || item.year,
  }
}

/**
 * Resuelve artistas con MusicBrainz y ListenBrainz
 */
async function fetchMusicBrainz(item) {
  const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(item.title)}&fmt=json&limit=1`
  const res = await fetchJson(url, {
    headers: { 'User-Agent': 'BibliotecaSocial/1.0.0 ( https://biblioteca-social.vercel.app )' },
  })
  await sleep(1000) // Estricto 1 req/s por política de MusicBrainz

  const artist = res.artists?.[0]
  if (!artist) return null

  let similar = []
  try {
    const lbUrl = `https://api.listenbrainz.org/1/artist/${artist.id}/similar-artists`
    const lbRes = await fetchJson(lbUrl)
    if (lbRes.payload?.similar_artists) {
      similar = lbRes.payload.similar_artists.slice(0, 10).map((a) => a.artist_name)
    }
  } catch {
    // ListenBrainz es opcional
  }

  return {
    source: 'musicbrainz',
    mbid: artist.id,
    name: artist.name,
    country: artist.country || null,
    disambiguation: artist.disambiguation || null,
    tags: (artist.tags || []).map((t) => t.name.toLowerCase()),
    similar,
  }
}

/**
 * Resuelve juegos de mesa con Wikidata
 */
async function fetchWikidataBoardgame(item) {
  const query = `
    SELECT ?item ?itemLabel ?wikidataId WHERE {
      ?item wdt:P31/wdt:P279* wd:Q131436.
      ?item rdfs:label ?itemLabel.
      FILTER(CONTAINS(LCASE(?itemLabel), "${item.title.toLowerCase().replace(/"/g, '\\"')}"))
      BIND(REPLACE(STR(?item), "^.*/", "") AS ?wikidataId)
    } LIMIT 1
  `
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`
  const res = await fetchJson(url, {
    headers: {
      'User-Agent': 'BibliotecaSocial/1.0.0 ( https://biblioteca-social.vercel.app )',
      Accept: 'application/sparql-results+json',
    },
  })
  await sleep(500)

  const hit = res.results?.bindings?.[0]
  if (!hit) return null

  return {
    source: 'wikidata',
    wikidataId: hit.wikidataId.value,
    label: hit.itemLabel.value,
  }
}

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Iniciando Fase 1: Descarga y re-anclaje de fuentes (sources.mjs) ---')
  if (!TMDB_KEY) {
    console.warn('⚠️  TMDB_API_KEY no detectada en app/.env.local: las películas y series se omitirán de TMDB.')
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  const stats = {
    total: 0,
    matched: 0,
    unmatched: 0,
    byShelf: {},
  }

  const unmatchedItems = []

  for (const item of items) {
    if (FILTER_SHELF && item.type !== FILTER_SHELF) continue
    if (!stats.byShelf[item.type]) {
      stats.byShelf[item.type] = { total: 0, matched: 0, unmatched: 0 }
    }
    if (LIMIT && stats.byShelf[item.type].total >= LIMIT) continue

    stats.total++
    stats.byShelf[item.type].total++

    const shelfDir = join(CACHE_DIR, item.type)
    ensureDir(shelfDir)
    const slug = item.id.replace(/^[^:]+:/, '')
    const cacheFile = join(shelfDir, `${slug}.json`)

    let data = null
    if (!REFRESH && existsSync(cacheFile)) {
      try {
        data = JSON.parse(readFileSync(cacheFile, 'utf8'))
      } catch {}
    }

    if (!data) {
      try {
        if (item.type === 'movie' || item.type === 'series') {
          data = await fetchTmdb(item)
        } else if (item.type === 'book') {
          data = await fetchOpenLibrary(item)
        } else if (item.type === 'artist') {
          data = await fetchMusicBrainz(item)
        } else if (item.type === 'boardgame') {
          data = await fetchWikidataBoardgame(item)
        }
      } catch (err) {
        console.warn(`Error al resolver ${item.id} («${item.title}»):`, err.message)
      }

      if (data && !data.error) {
        writeFileSync(cacheFile, JSON.stringify(data, null, 2))
      }
    }

    if (data && !data.error) {
      stats.matched++
      stats.byShelf[item.type].matched++
      process.stdout.write(`✓ [${item.type}] ${item.title}\n`)
    } else {
      stats.unmatched++
      stats.byShelf[item.type].unmatched++
      unmatchedItems.push({ id: item.id, type: item.type, title: item.title, year: item.year })
      process.stdout.write(`✗ [${item.type}] ${item.title} (sin match)\n`)
    }
  }

  ensureDir(CACHE_DIR)
  const unmatchedPath = join(CACHE_DIR, 'unmatched.json')
  writeFileSync(unmatchedPath, JSON.stringify(unmatchedItems, null, 2))

  console.log('\n--- Resumen de re-anclaje ---')
  console.log(`Total procesados: ${stats.total}`)
  console.log(`Emparejados: ${stats.matched} (${stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0}%)`)
  console.log(`No emparejados: ${stats.unmatched}`)
  console.log('Desglose por estantería:', JSON.stringify(stats.byShelf, null, 2))
  console.log(`Lista de no emparejados guardada en: ${unmatchedPath}`)
}

main().catch((err) => {
  console.error('Error fatal en sources.mjs:', err)
  process.exit(1)
})
