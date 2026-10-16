/**
 * Script de re-anclaje y enriquecimiento de fuentes oficiales abiertas (MOTOR.md §4.2, ENRIQUECIMIENTO.md E1-E3).
 *
 * Descarga y guarda en caché cruda los datos oficiales de Wikidata, Wikipedia REST API,
 * Open Library y MusicBrainz sin requerir claves comerciales.
 *
 * Uso:
 *   node scripts/engine/sources.mjs [opciones]
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

const args = process.argv.slice(2)
const FILTER_SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null
const REFRESH = args.includes('--refresh')

const USER_AGENT = 'BibliotecaSocial/1.0.0 ( contact@biblioteca-social.vercel.app )'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJson(url, options = {}) {
  const maxRetries = 3
  const headers = { 'User-Agent': USER_AGENT, ...(options.headers || {}) }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers })
      if (res.status === 429) {
        const wait = attempt * 2000
        console.warn(`[429 Rate Limit] esperando ${wait}ms...`)
        await sleep(wait)
        continue
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} para ${url}`)
      }
      return await res.json()
    } catch (err) {
      if (attempt === maxRetries) throw err
      await sleep(attempt * 800)
    }
  }
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

/**
 * Obtiene el resumen de Wikipedia en español o inglés
 */
async function fetchWikiSummary(title, lang = 'es') {
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    const data = await fetchJson(url)
    await sleep(150)
    return {
      title: data.title,
      extract: data.extract,
      description: data.description,
      thumbnail: data.thumbnail?.source || null,
    }
  } catch {
    return null
  }
}

/**
 * Resuelve películas y series con Wikidata y Wikipedia
 */
async function fetchWikidataMovieOrSeries(item) {
  const isMovie = item.type === 'movie'
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    item.title
  )}&language=es&format=json&type=item&limit=5`
  const res = await fetchJson(searchUrl)
  await sleep(200)

  if (!res.search?.length) return null

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
  const entityData = await fetchJson(entityUrl)
  await sleep(200)

  const entity = entityData.entities?.[hit.id]
  if (!entity) return null

  const claims = entity.claims || {}
  const imdbId = claims.P345?.[0]?.mainsnak?.datavalue?.value || null
  const tmdbProp = isMovie ? claims.P4947 : claims.P4983
  const tmdbIdRaw = tmdbProp?.[0]?.mainsnak?.datavalue?.value
  const tmdbId = tmdbIdRaw ? parseInt(tmdbIdRaw, 10) : null
  const sitelinks = entity.sitelinks || {}
  const sitelinksCount = Object.keys(sitelinks).length

  // Portada libre de Wikimedia Commons (P18)
  const commonsImage = claims.P18?.[0]?.mainsnak?.datavalue?.value || null
  let posterUrl = null
  let imageSrc = null
  let imageCredit = null
  if (commonsImage) {
    posterUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsImage)}?width=600`
    imageSrc = 'wikimedia'
    imageCredit = 'Wikimedia Commons'
  }

  // Resumen en Wikipedia
  let synopsis = entity.descriptions?.es?.value || item.synopsis
  const esArticle = sitelinks.eswiki?.title
  const enArticle = sitelinks.enwiki?.title

  if (esArticle) {
    const summary = await fetchWikiSummary(esArticle, 'es')
    if (summary?.extract) {
      synopsis = summary.extract
      if (!posterUrl && summary.thumbnail) {
        posterUrl = summary.thumbnail
        imageSrc = 'wikimedia'
        imageCredit = 'Wikipedia / Wikimedia Commons'
      }
    }
  } else if (enArticle) {
    const summary = await fetchWikiSummary(enArticle, 'en')
    if (summary?.extract && !synopsis) {
      synopsis = summary.extract
    }
    if (!posterUrl && summary?.thumbnail) {
      posterUrl = summary.thumbnail
      imageSrc = 'wikimedia'
      imageCredit = 'Wikipedia / Wikimedia Commons'
    }
  }

  // Metadatos adicionales para grafos y LLM (E2, E4)
  const collection = claims.P179?.[0]?.mainsnak?.datavalue?.value?.id || null
  const basedOn = claims.P144?.[0]?.mainsnak?.datavalue?.value?.id || null
  const awards = (claims.P166 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean)
  const duration = claims.P2047?.[0]?.mainsnak?.datavalue?.value?.amount
    ? parseInt(claims.P2047[0].mainsnak.datavalue.value.amount, 10)
    : item.durationMin

  return {
    source: 'wikidata',
    wikidataId: hit.id,
    tmdbId,
    imdbId,
    title: entity.labels?.es?.value || entity.labels?.en?.value || hit.label,
    year: item.year,
    synopsis,
    wikiLangs: sitelinksCount,
    durationMin: duration,
    originCountry: claims.P495?.[0]?.mainsnak?.datavalue?.value?.id ? [claims.P495[0].mainsnak.datavalue.value.id] : [],
    collection,
    basedOn,
    awards,
    posterUrl: posterUrl || item.posterUrl,
    imageSrc: imageSrc || 'seed',
    imageCredit: imageCredit || 'IMDb / Archivo',
    src: {
      wikidataId: 'wikidata',
      tmdbId: tmdbId ? 'wikidata' : undefined,
      imdbId: imdbId ? 'wikidata' : undefined,
      synopsis: esArticle ? 'wikipedia' : 'wikidata',
      posterUrl: imageSrc || 'seed',
    },
  }
}

/**
 * Resuelve libros con Open Library
 */
async function fetchOpenLibrary(item) {
  const q = `https://openlibrary.org/search.json?title=${encodeURIComponent(
    item.title
  )}&author=${encodeURIComponent(item.creator)}&limit=1&fields=key,subject,ratings_average,ratings_count,want_to_read_count,currently_reading_count,already_read_count,first_publish_year,id_wikidata,cover_i`
  const res = await fetchJson(q)
  await sleep(200)

  const doc = res.docs?.[0]
  if (!doc) return null

  const readers =
    (doc.want_to_read_count || 0) +
    (doc.currently_reading_count || 0) +
    (doc.already_read_count || 0)

  const coverUrl = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    : item.posterUrl

  return {
    source: 'openlibrary',
    olid: doc.key?.replace('/works/', ''),
    wikidataId: doc.id_wikidata?.[0] || null,
    voteAvg: doc.ratings_average ? Math.round(doc.ratings_average * 2 * 10) / 10 : null,
    voteCount: doc.ratings_count || 0,
    readers,
    subjects: (doc.subject || []).slice(0, 15).map((s) => s.toLowerCase()),
    firstPublishYear: doc.first_publish_year || item.year,
    posterUrl: coverUrl,
    imageSrc: doc.cover_i ? 'openlibrary' : 'seed',
    imageCredit: doc.cover_i ? 'Open Library' : undefined,
    src: {
      olid: 'openlibrary',
      readers: 'openlibrary',
      voteAvg: 'openlibrary',
      subjects: 'openlibrary',
      posterUrl: doc.cover_i ? 'openlibrary' : 'seed',
    },
  }
}

/**
 * Resuelve artistas con MusicBrainz y Wikidata
 */
async function fetchMusicBrainz(item) {
  const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(
    item.title
  )}&fmt=json&limit=1`
  const res = await fetchJson(url)
  await sleep(1000) // 1 req/s por política de MusicBrainz

  const artist = res.artists?.[0]
  if (!artist) return null

  // Buscar Wikidata ID a partir de MusicBrainz URL relations
  let wikidataId = null
  let commonsImage = null
  try {
    const detailUrl = `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=url-rels&fmt=json`
    const details = await fetchJson(detailUrl)
    await sleep(1000)
    const wikiRel = (details.relations || []).find((r) => r.type === 'wikidata')
    if (wikiRel?.url?.resource) {
      wikidataId = wikiRel.url.resource.split('/').pop()
      const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`
      const entityData = await fetchJson(entityUrl)
      commonsImage = entityData.entities?.[wikidataId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value || null
    }
  } catch {}

  const posterUrl = commonsImage
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsImage)}?width=600`
    : item.posterUrl

  return {
    source: 'musicbrainz',
    mbid: artist.id,
    wikidataId,
    name: artist.name,
    country: artist.country || null,
    tags: (artist.tags || []).map((t) => t.name.toLowerCase()),
    posterUrl,
    imageSrc: commonsImage ? 'wikimedia' : 'seed',
    imageCredit: commonsImage ? 'Wikimedia Commons' : undefined,
    src: {
      mbid: 'musicbrainz',
      wikidataId: wikidataId ? 'wikidata' : undefined,
      tags: 'musicbrainz',
      posterUrl: commonsImage ? 'wikimedia' : 'seed',
    },
  }
}

/**
 * Resuelve juegos de mesa con Wikidata y Wikipedia
 */
async function fetchWikidataBoardgame(item) {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    item.title
  )}&language=es&format=json&type=item&limit=5`
  const res = await fetchJson(searchUrl)
  await sleep(200)

  if (!res.search?.length) return null

  let hit = res.search.find((s) => {
    const desc = (s.description || '').toLowerCase()
    return (
      desc.includes('game') ||
      desc.includes('juego') ||
      desc.includes('board') ||
      desc.includes('mesa')
    )
  })
  if (!hit) hit = res.search[0]

  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${hit.id}.json`
  const entityData = await fetchJson(entityUrl)
  await sleep(200)

  const entity = entityData.entities?.[hit.id]
  if (!entity) return null

  const claims = entity.claims || {}
  const bggId = claims.P2339?.[0]?.mainsnak?.datavalue?.value || null
  const commonsImage = claims.P18?.[0]?.mainsnak?.datavalue?.value || null
  const sitelinks = entity.sitelinks || {}

  let posterUrl = commonsImage
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsImage)}?width=600`
    : item.posterUrl

  let synopsis = entity.descriptions?.es?.value || item.synopsis
  const esArticle = sitelinks.eswiki?.title

  if (esArticle) {
    const summary = await fetchWikiSummary(esArticle, 'es')
    if (summary?.extract) synopsis = summary.extract
    if (!commonsImage && summary?.thumbnail) {
      posterUrl = summary.thumbnail
    }
  }

  return {
    source: 'wikidata',
    wikidataId: hit.id,
    bggId,
    title: entity.labels?.es?.value || entity.labels?.en?.value || hit.label,
    synopsis,
    wikiLangs: Object.keys(sitelinks).length,
    posterUrl,
    imageSrc: commonsImage || esArticle ? 'wikimedia' : 'seed',
    imageCredit: commonsImage || esArticle ? 'Wikimedia Commons / Wikipedia' : undefined,
    src: {
      wikidataId: 'wikidata',
      bggId: bggId ? 'wikidata' : undefined,
      synopsis: esArticle ? 'wikipedia' : 'wikidata',
      posterUrl: commonsImage || esArticle ? 'wikimedia' : 'seed',
    },
  }
}

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Iniciando Re-anclaje de fuentes abiertas (sources.mjs) ---')
  console.log('Fuentes: Wikidata, Wikipedia REST API, Open Library, MusicBrainz (100% abiertas, sin TMDB_KEY)')

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
          data = await fetchWikidataMovieOrSeries(item)
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
  console.log(
    `Emparejados: ${stats.matched} (${
      stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0
    }%)`
  )
  console.log(`No emparejados: ${stats.unmatched}`)
  console.log('Desglose por estantería:', JSON.stringify(stats.byShelf, null, 2))
  console.log(`Lista de no emparejados guardada en: ${unmatchedPath}`)
}

main().catch((err) => {
  console.error('Error fatal en sources.mjs:', err)
  process.exit(1)
})
