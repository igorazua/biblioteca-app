/**
 * additions.mjs — Incorpora obras nuevas de app/scripts/cache/additions/<shelf>.json
 * a la cadena durable de seed.json y las resuelve contra Wikidata, Open Library y MusicBrainz.
 *
 * MOTOR v2 §2b / TAREAS_MOTOR_V2.md T2.3
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ADDITIONS_DIR = join(here, '..', 'cache', 'additions')
const CACHE_SOURCES_DIR = join(here, '..', 'cache', 'sources')
const UNRESOLVED_FILE = join(ADDITIONS_DIR, 'sin-resolver.md')

const USER_AGENT = 'BibliotecaSocial/1.0.0 ( contact@biblioteca-social.vercel.app )'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

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
      if (attempt === maxRetries) return null
      await sleep(attempt * 600)
    }
  }
  return null
}

async function fetchWikiSummary(title, lang = 'es') {
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    const data = await fetchJson(url)
    if (!data) return null
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

async function resolveWikidataEntity(wikidataId) {
  if (!wikidataId) return null
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`
  const data = await fetchJson(url)
  return data?.entities?.[wikidataId] || null
}

async function searchWikidata(query, lang = 'es') {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    query
  )}&language=${lang}&format=json&type=item&limit=5`
  const data = await fetchJson(url)
  return data?.search || []
}

async function resolveArtist(item) {
  let wikidataId = item.wikidataId || null
  let mbid = item.mbid || null
  let commonsImage = null
  let synopsis = null
  let originCountry = item.originCountry || null
  let genres = item.genres || []
  let entity = null

  // 1. Si no hay wikidataId, buscar en Wikidata
  if (!wikidataId) {
    const hits = await searchWikidata(item.title, 'es')
    for (const h of hits) {
      const desc = (h.description || '').toLowerCase()
      if (
        desc.includes('banda') ||
        desc.includes('grupo') ||
        desc.includes('cantante') ||
        desc.includes('músic') ||
        desc.includes('music') ||
        desc.includes('rock') ||
        desc.includes('pop') ||
        desc.includes('singer') ||
        desc.includes('rapper') ||
        desc.includes('dj') ||
        desc.includes('composer')
      ) {
        wikidataId = h.id
        break
      }
    }
    // Si aún no, probar el primer resultado si el nombre coincide exactamente
    if (!wikidataId && hits.length > 0 && hits[0].label?.toLowerCase() === item.title.toLowerCase()) {
      wikidataId = hits[0].id
    }
  }

  // 2. Si tenemos wikidataId, extraer datos de la entidad
  if (wikidataId) {
    entity = await resolveWikidataEntity(wikidataId)
    if (entity) {
      const claims = entity.claims || {}
      if (!mbid && claims.P434?.[0]?.mainsnak?.datavalue?.value) {
        mbid = claims.P434[0].mainsnak.datavalue.value
      }
      if (claims.P18?.[0]?.mainsnak?.datavalue?.value) {
        commonsImage = claims.P18[0].mainsnak.datavalue.value
      }
      if (!originCountry && claims.P495?.[0]?.mainsnak?.datavalue?.value?.id) {
        const countryQid = claims.P495[0].mainsnak.datavalue.value.id
        if (countryQid === 'Q29') originCountry = ['ES']
      }
      const sitelinks = entity.sitelinks || {}
      if (sitelinks.eswiki?.title) {
        const sum = await fetchWikiSummary(sitelinks.eswiki.title, 'es')
        if (sum?.extract) synopsis = sum.extract
        if (!commonsImage && sum?.thumbnail) commonsImage = sum.thumbnail
      } else if (sitelinks.enwiki?.title) {
        const sum = await fetchWikiSummary(sitelinks.enwiki.title, 'en')
        if (sum?.extract && !synopsis) synopsis = sum.extract
        if (!commonsImage && sum?.thumbnail) commonsImage = sum.thumbnail
      }
    }
  }

  // 3. Si no hay MBID, consultar MusicBrainz API
  if (!mbid) {
    const mbUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(
      item.title
    )}&fmt=json&limit=1`
    const mbData = await fetchJson(mbUrl)
    await sleep(400)
    const mbHit = mbData?.artists?.[0]
    if (mbHit) {
      mbid = mbHit.id
      if (!originCountry && mbHit.country) originCountry = [mbHit.country]
      if (!genres.length && mbHit.tags?.length) {
        genres = mbHit.tags.slice(0, 3).map((t) => t.name)
      }
    }
  }

  const posterUrl = commonsImage
    ? commonsImage.startsWith('http')
      ? commonsImage
      : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsImage)}?width=600`
    : null

  return {
    wikidataId,
    mbid,
    originCountry: originCountry || ['ES'],
    genres: genres.length ? genres : ['Música'],
    synopsis: synopsis || `${item.title} es un artista/grupo musical.`,
    posterUrl,
    imageSrc: posterUrl ? 'wikimedia' : undefined,
    imageCredit: posterUrl ? 'Wikimedia Commons' : undefined,
  }
}

async function resolveMovieOrSeries(item) {
  let wikidataId = item.wikidataId || null
  let tmdbId = item.tmdbId || null
  let commonsImage = null
  let synopsis = null
  let originCountry = item.originCountry || null
  let originalLanguage = item.originalLanguage || null
  let genres = item.genres || []
  let entity = null

  if (!wikidataId) {
    const hits = await searchWikidata(item.title, 'es')
    if (hits.length > 0) wikidataId = hits[0].id
  }

  if (wikidataId) {
    entity = await resolveWikidataEntity(wikidataId)
    if (entity) {
      const claims = entity.claims || {}
      const tmdbProp = item.type === 'movie' ? claims.P4947 : claims.P4983
      if (!tmdbId && tmdbProp?.[0]?.mainsnak?.datavalue?.value) {
        tmdbId = parseInt(tmdbProp[0].mainsnak.datavalue.value, 10)
      }
      if (claims.P18?.[0]?.mainsnak?.datavalue?.value) {
        commonsImage = claims.P18[0].mainsnak.datavalue.value
      }
      if (!originCountry && claims.P495?.[0]?.mainsnak?.datavalue?.value?.id) {
        const countryQid = claims.P495[0].mainsnak.datavalue.value.id
        if (countryQid === 'Q29') originCountry = ['ES']
      }
      if (!originalLanguage && claims.P364?.[0]?.mainsnak?.datavalue?.value?.id) {
        const langQid = claims.P364[0].mainsnak.datavalue.value.id
        if (langQid === 'Q1321') originalLanguage = 'es'
        else if (langQid === 'Q1860') originalLanguage = 'en'
      }
      const sitelinks = entity.sitelinks || {}
      if (sitelinks.eswiki?.title) {
        const sum = await fetchWikiSummary(sitelinks.eswiki.title, 'es')
        if (sum?.extract) synopsis = sum.extract
        if (!commonsImage && sum?.thumbnail) commonsImage = sum.thumbnail
      }
    }
  }

  const posterUrl = commonsImage
    ? commonsImage.startsWith('http')
      ? commonsImage
      : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsImage)}?width=600`
    : null

  return {
    wikidataId,
    tmdbId,
    originCountry: originCountry || ['ES'],
    originalLanguage: originalLanguage || 'es',
    genres: genres.length ? genres : [item.type === 'movie' ? 'Cine español' : 'Serie española'],
    synopsis: synopsis || `${item.title} (${item.year}), obra de ${item.creator || 'autor desconocido'}.`,
    posterUrl,
    imageSrc: posterUrl ? 'wikimedia' : undefined,
    imageCredit: posterUrl ? 'Wikimedia Commons' : undefined,
  }
}

async function resolveBook(item) {
  let wikidataId = item.wikidataId || null
  let olid = item.olid || null
  let posterUrl = null
  let imageSrc = null
  let imageCredit = null
  let readers = null
  let synopsis = null
  let subjects = []

  // 1. Open Library
  try {
    const q = `https://openlibrary.org/search.json?title=${encodeURIComponent(
      item.title
    )}&author=${encodeURIComponent(item.creator || '')}&limit=1&fields=key,subject,ratings_average,ratings_count,want_to_read_count,currently_reading_count,already_read_count,cover_i,id_wikidata`
    const olData = await fetchJson(q)
    await sleep(200)
    const doc = olData?.docs?.[0]
    if (doc) {
      if (doc.key) olid = doc.key.replace('/works/', '')
      if (!wikidataId && doc.id_wikidata?.[0]) wikidataId = doc.id_wikidata[0]
      if (doc.cover_i) {
        posterUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        imageSrc = 'openlibrary'
        imageCredit = 'Open Library'
      }
      readers =
        (doc.want_to_read_count || 0) +
        (doc.currently_reading_count || 0) +
        (doc.already_read_count || 0)
      if (doc.subject?.length) {
        subjects = doc.subject.slice(0, 10).map((s) => s.toLowerCase())
      }
    }
  } catch {}

  // 2. Wikidata
  if (wikidataId) {
    try {
      const entity = await resolveWikidataEntity(wikidataId)
      if (entity) {
        const sitelinks = entity.sitelinks || {}
        if (sitelinks.eswiki?.title) {
          const sum = await fetchWikiSummary(sitelinks.eswiki.title, 'es')
          if (sum?.extract) synopsis = sum.extract
          if (!posterUrl && sum?.thumbnail) {
            posterUrl = sum.thumbnail
            imageSrc = 'wikimedia'
            imageCredit = 'Wikipedia / Wikimedia Commons'
          }
        }
      }
    } catch {}
  }

  return {
    wikidataId,
    olid,
    readers: readers || 0,
    originCountry: ['ES'],
    originalLanguage: 'es',
    genres: item.genres?.length ? item.genres : ['Narrativa'],
    synopsis: synopsis || `${item.title} (${item.year}), novela de ${item.creator}.`,
    posterUrl,
    imageSrc,
    imageCredit,
    subjects,
  }
}

async function main() {
  console.log('--- Procesando obras nuevas de app/scripts/cache/additions/ (additions.mjs) ---')

  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const existingMap = new Map(seed.items.map((i) => [i.id, i]))
  const existingByTitle = new Map(seed.items.map((i) => [`${i.type}:${i.title.toLowerCase().trim()}`, i]))

  const additionsFiles = existsSync(ADDITIONS_DIR)
    ? readdirSync(ADDITIONS_DIR).filter((f) => f.endsWith('.json'))
    : []

  if (!additionsFiles.length) {
    console.log('No hay archivos de adiciones en cache/additions/')
    return
  }

  const unresolved = []
  let addedCount = 0
  let enrichedCount = 0

  for (const file of additionsFiles) {
    const filePath = join(ADDITIONS_DIR, file)
    let additionsList = []
    try {
      additionsList = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (e) {
      console.warn(`Error leyendo ${file}:`, e.message)
      continue
    }

    console.log(`\nRevisando ${file} (${additionsList.length} propuestas)...`)

    for (const raw of additionsList) {
      const type = raw.type
      const title = raw.title?.trim()
      const year = raw.year
      const slug = type === 'artist' ? slugify(title) : `${slugify(title)}-${year}`
      const id = `${type}:${slug}`
      const key = `${type}:${title.toLowerCase()}`

      // Si ya existe en seed.json, verificar si le faltan ids externos
      const existing = existingMap.get(id) || existingByTitle.get(key)
      if (existing) {
        let changed = false
        if (!existing.wikidataId && raw.wikidataId) {
          existing.wikidataId = raw.wikidataId
          changed = true
        }
        if (!existing.olid && raw.olid) {
          existing.olid = raw.olid
          changed = true
        }
        if (!existing.mbid && raw.mbid) {
          existing.mbid = raw.mbid
          changed = true
        }
        if (changed) enrichedCount++
        continue
      }

      // Comprobar si ya existe caché cruda en sources/
      const shelfSourceDir = join(CACHE_SOURCES_DIR, type)
      if (!existsSync(shelfSourceDir)) mkdirSync(shelfSourceDir, { recursive: true })
      const sourceCachePath = join(shelfSourceDir, `${slug}.json`)

      let resolved = null
      if (existsSync(sourceCachePath)) {
        try {
          resolved = JSON.parse(readFileSync(sourceCachePath, 'utf8'))
        } catch {}
      }

      if (!resolved) {
        console.log(`  Resolviendo ${id} («${title}»)...`)
        if (type === 'artist') {
          resolved = await resolveArtist(raw)
        } else if (type === 'movie' || type === 'series') {
          resolved = await resolveMovieOrSeries(raw)
        } else if (type === 'book') {
          resolved = await resolveBook(raw)
        }
        await sleep(150)
      }

      if (!resolved || (!resolved.wikidataId && !resolved.mbid && !resolved.olid)) {
        console.warn(`  ⚠️ Sin id externo para: ${title} (${type})`)
        unresolved.push({ id, type, title, year, creator: raw.creator })
      }

      // Guardar en caché cruda de sources
      if (resolved) {
        writeFileSync(sourceCachePath, JSON.stringify(resolved, null, 2), 'utf8')
      }

      // Crear item durable para seed.json (sin inventar popularidad ni notas)
      const newItem = {
        id,
        type,
        title,
        year,
        ...(raw.creator ? { creator: raw.creator } : {}),
        ...(raw.durationMin ? { durationMin: raw.durationMin } : {}),
        ...(raw.seasons ? { seasons: raw.seasons } : {}),
        ...(raw.pages ? { pages: raw.pages } : {}),
        genres: resolved?.genres || raw.genres || [],
        synopsis: resolved?.synopsis || raw.synopsis || '',
        posterUrl: resolved?.posterUrl || null,
        ...(resolved?.imageSrc ? { imageSrc: resolved.imageSrc, imageCredit: resolved.imageCredit } : {}),
        ...(resolved?.wikidataId ? { wikidataId: resolved.wikidataId } : {}),
        ...(resolved?.olid ? { olid: resolved.olid } : {}),
        ...(resolved?.mbid ? { mbid: resolved.mbid } : {}),
        ...(resolved?.tmdbId ? { tmdbId: resolved.tmdbId } : {}),
        originCountry: resolved?.originCountry || ['ES'],
        originalLanguage: resolved?.originalLanguage || 'es',
      }

      seed.items.push(newItem)
      existingMap.set(id, newItem)
      existingByTitle.set(key, newItem)
      addedCount++
    }
  }

  // Guardar archivo sin-resolver.md si hay casos
  if (unresolved.length) {
    const mdLines = [
      '# Obras sin resolver externamente',
      '',
      'Estas obras necesitan revisión manual para asignarles QID / MBID / OLID:',
      '',
      '| Tipo | Título | Año | Creador | ID propuesto |',
      '|---|---|---|---|---|',
      ...unresolved.map((u) => `| ${u.type} | ${u.title} | ${u.year || '-'} | ${u.creator || '-'} | \`${u.id}\` |`),
      '',
    ]
    writeFileSync(UNRESOLVED_FILE, mdLines.join('\n'), 'utf8')
    console.log(`\n⚠️ Se guardaron ${unresolved.length} obras sin resolver en ${UNRESOLVED_FILE}`)
  } else if (existsSync(UNRESOLVED_FILE)) {
    // Si todo se resolvió, limpiar archivo
    writeFileSync(UNRESOLVED_FILE, '# Sin resolver\n\nTodas las obras están resueltas con IDs externos.\n', 'utf8')
  }

  writeFileSync(SEED_FILE, JSON.stringify(seed))
  console.log(`\n✓ additions.mjs finalizado: +${addedCount} obras nuevas añadidas, ${enrichedCount} actualizadas. Total obras en catálogo: ${seed.items.length}`)
}

main().catch((err) => {
  console.error('Error fatal en additions.mjs:', err)
  process.exit(1)
})
