/**
 * fix-wikidata-types.mjs — T2b: Limpieza y re-resolución de fichas con tipo erróneo de Wikidata.
 *
 * Resuelve las 641 obras de wikidata-tipo-equivocado.json garantizando que:
 * 1. Cada candidato sea una instancia del tipo de su estantería (o su P629 en libros).
 * 2. Se purgan los datos erróneos heredados de Wikidata/Wikipedia.
 * 3. Se re-enriquecen las obras con la entidad correcta.
 * 4. Las no resolubles se documentan en docs/sin-resolver.md y conservan sinopsis/portada de fuentes de fallback (BGG, Open Library, etc.).
 *
 * Uso:
 *   node scripts/engine/fix-wikidata-types.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const BAD_FILE = join(here, '..', 'cache', 'wikidata-tipo-equivocado.json')
const SIN_RESOLVER_FILE = join(ROOT, '..', 'docs', 'sin-resolver.md')

const args = process.argv.slice(2)
const FILTER_SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null

const USER_AGENT = 'BibliotecaSocial-Fixer/1.1 (igorazua@gmail.com; https://biblioteca-social.vercel.app)'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ROOTS = {
  movie: ['Q11424'],
  series: ['Q5398426', 'Q526877', 'Q1259759'],
  book: ['Q47461344', 'Q7725634', 'Q571'],
  boardgame: ['Q11410', 'Q131436', 'Q714497', 'Q142714'],
  artist: ['Q5', 'Q2088357', 'Q215380'],
}

async function fetchJson(url, options = {}) {
  const maxRetries = 3
  const headers = { 'User-Agent': USER_AGENT, ...(options.headers || {}) }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(6000) })
      if (res.status === 429 || res.status >= 500) {
        const wait = attempt * 1500
        await sleep(wait)
        continue
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      return await res.json()
    } catch (err) {
      if (attempt === maxRetries) return null
      await sleep(attempt * 800)
    }
  }
  return null
}

async function fetchWikiSummary(articleTitle, lang = 'es') {
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`
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

/**
 * Valida un lote de QIDs contra SPARQL para una estantería dada.
 * Devuelve un mapa: { [candidateQid]: trueQid }
 */
async function batchValidateQids(qids, shelf) {
  if (!qids || !qids.length) return {}
  const uniqueQids = Array.from(new Set(qids.filter((q) => /^Q\d+$/.test(q))))
  if (!uniqueQids.length) return {}

  const rootVals = ROOTS[shelf].map((r) => 'wd:' + r).join(' ')
  const vals = uniqueQids.map((q) => 'wd:' + q).join(' ')
  const result = {}

  // 1. Comprobación directa de instancia
  const sparql1 = `SELECT DISTINCT ?item WHERE {
    VALUES ?item { ${vals} }
    VALUES ?root { ${rootVals} }
    ?item wdt:P31/wdt:P279* ?root .
  }`

  const url1 = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql1)
  const res1 = await fetchJson(url1, { headers: { Accept: 'application/sparql-results+json' } })
  if (res1?.results?.bindings) {
    for (const b of res1.results.bindings) {
      const itemQ = b.item.value.split('/').pop()
      result[itemQ] = itemQ
    }
  }

  // 2. Si es libro y hay no resueltos, comprobar si son ediciones con P629
  if (shelf === 'book') {
    const remaining = uniqueQids.filter((q) => !result[q])
    if (remaining.length) {
      const remVals = remaining.map((q) => 'wd:' + q).join(' ')
      const sparql2 = `SELECT DISTINCT ?item ?work WHERE {
        VALUES ?item { ${remVals} }
        ?item wdt:P629 ?work .
        VALUES ?root { ${rootVals} }
        ?work wdt:P31/wdt:P279* ?root .
      }`
      const url2 = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql2)
      const res2 = await fetchJson(url2, { headers: { Accept: 'application/sparql-results+json' } })
      if (res2?.results?.bindings) {
        for (const b of res2.results.bindings) {
          const itemQ = b.item.value.split('/').pop()
          const workQ = b.work.value.split('/').pop()
          result[itemQ] = workQ
        }
      }
    }
  }

  return result
}

/**
 * Busca candidatos usando tanto list=search como wbsearchentities
 */
async function searchCandidates(item, shelf) {
  const cleanTitle = item.title.trim()
  const candidateQids = []

  const searchTerms = [cleanTitle]
  if (shelf === 'movie') {
    if (item.year) {
      searchTerms.push(`${cleanTitle} ${item.year}`)
      searchTerms.push(`${cleanTitle} (película de ${item.year})`)
      searchTerms.push(`${cleanTitle} ${item.year} film`)
    }
    searchTerms.push(`${cleanTitle} (película)`)
    searchTerms.push(`${cleanTitle} film`)
    if (item.creator) searchTerms.push(`${cleanTitle} ${item.creator}`)
  } else if (shelf === 'series') {
    if (item.year) searchTerms.push(`${cleanTitle} ${item.year}`)
    searchTerms.push(`${cleanTitle} (serie de televisión)`)
    searchTerms.push(`${cleanTitle} serie`)
    searchTerms.push(`${cleanTitle} television series`)
  } else if (shelf === 'boardgame') {
    if (item.year) searchTerms.push(`${cleanTitle} ${item.year}`)
    searchTerms.push(`${cleanTitle} (juego de mesa)`)
    searchTerms.push(`${cleanTitle} board game`)
    searchTerms.push(`${cleanTitle} (juego)`)
  } else if (shelf === 'book') {
    searchTerms.push(`${cleanTitle} (novela)`)
    searchTerms.push(`${cleanTitle} (libro)`)
    if (item.creator) searchTerms.push(`${cleanTitle} ${item.creator}`)
  } else if (shelf === 'artist') {
    searchTerms.push(`${cleanTitle} (banda)`)
    searchTerms.push(`${cleanTitle} (grupo musical)`)
    searchTerms.push(`${cleanTitle} band`)
    searchTerms.push(`${cleanTitle} (cantante)`)
  }

  // 1. CirrusSearch / list=search (muy preciso con desambiguaciones)
  for (const term of searchTerms) {
    const sUrl = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      term
    )}&format=json&srlimit=5`
    const sRes = await fetchJson(sUrl)
    await sleep(80)
    for (const hit of sRes?.query?.search || []) {
      if (/^Q\d+$/.test(hit.title) && !candidateQids.includes(hit.title)) {
        candidateQids.push(hit.title)
      }
    }
    if (candidateQids.length >= 8) break
  }

  // 2. Fallback wbsearchentities en español y en inglés
  if (candidateQids.length < 8) {
    for (const lang of ['es', 'en']) {
      const wbUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
        cleanTitle
      )}&language=${lang}&format=json&limit=8`
      const wbRes = await fetchJson(wbUrl)
      await sleep(80)
      for (const hit of wbRes?.search || []) {
        if (!candidateQids.includes(hit.id)) candidateQids.push(hit.id)
      }
    }
  }

  return candidateQids
}

/**
 * Descarga metadatos ligeros (labels, descriptions, sitelinks) para puntuar candidatos.
 */
async function scoreCandidates(validCandidates, item) {
  if (!validCandidates.length) return []
  const idsParam = validCandidates.join('|')
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${idsParam}&props=labels|descriptions|sitelinks|aliases&languages=es|en&format=json`
  const data = await fetchJson(url)
  if (!data?.entities) return validCandidates

  const scored = []
  const targetTitle = item.title.toLowerCase().trim()
  const targetYearStr = item.year ? String(item.year) : null
  const creatorSurname = item.creator
    ? item.creator.split(/[\s,]+/).filter((w) => w.length > 2).pop()?.toLowerCase()
    : null

  for (const qid of validCandidates) {
    const entity = data.entities[qid]
    if (!entity) continue

    let score = 0
    const labelEs = (entity.labels?.es?.value || '').toLowerCase().trim()
    const labelEn = (entity.labels?.en?.value || '').toLowerCase().trim()
    const descEs = (entity.descriptions?.es?.value || '').toLowerCase()
    const descEn = (entity.descriptions?.en?.value || '').toLowerCase()
    const desc = `${descEs} ${descEn}`
    const sitelinksCount = Object.keys(entity.sitelinks || {}).length

    // 1. Título coincidente obligatorio (comprobando labels, sitelinks y aliases)
    const isExact = (l) => {
      if (!l) return false
      const cleanL = l.toLowerCase().replace(/\s*\([^)]*\)$/, '').trim()
      return cleanL === targetTitle
    }

    const hasSequelSuffix = (l) => {
      if (!l) return false
      const cleanL = l.toLowerCase().replace(/\s*\([^)]*\)$/, '').trim()
      const candidateNum = cleanL.match(/(?:\s+|:)(?:\d+|ii|iii|iv|v|vi|vii|viii|ix|x|2|3|4|5)$/i)
      const targetNum = targetTitle.match(/(?:\s+|:)(?:\d+|ii|iii|iv|v|vi|vii|viii|ix|x|2|3|4|5)$/i)
      return Boolean(candidateNum && !targetNum)
    }

    const titlesToCheck = [
      entity.labels?.es?.value,
      entity.labels?.en?.value,
      entity.sitelinks?.eswiki?.title,
      entity.sitelinks?.enwiki?.title,
      ...(entity.aliases?.es?.map((a) => a.value) || []),
      ...(entity.aliases?.en?.map((a) => a.value) || []),
    ].filter(Boolean)

    let titleMatch = false
    let titleScore = 0

    for (const t of titlesToCheck) {
      if (isExact(t)) {
        titleScore = Math.max(titleScore, 120)
        titleMatch = true
      } else if (!hasSequelSuffix(t)) {
        const cleanT = t.toLowerCase().replace(/\s*\([^)]*\)$/, '').trim()
        if (cleanT.startsWith(targetTitle)) {
          titleScore = Math.max(titleScore, 30)
          titleMatch = true
        } else if (cleanT.includes(targetTitle)) {
          titleScore = Math.max(titleScore, 15)
          titleMatch = true
        }
      }
    }

    // Si el título no coincide en ninguna fuente, descartar
    if (!titleMatch) continue

    score += titleScore

    // 2. Año coincidente en descripción
    if (targetYearStr) {
      if (desc.includes(targetYearStr)) {
        score += 50
      } else {
        const prevYear = String(item.year - 1)
        const nextYear = String(item.year + 1)
        if (desc.includes(prevYear) || desc.includes(nextYear)) {
          score += 30
        }
      }
    }

    // 3. Creador / director coincidente
    if (creatorSurname && desc.includes(creatorSurname)) {
      score += 40
    }

    // 4. Notoriedad por sitelinks (hasta 40 pts)
    score += Math.min(40, sitelinksCount)

    scored.push({ qid, score, sitelinksCount, label: entity.labels?.es?.value || entity.labels?.en?.value })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored
}
async function fetchEnrichedWikidata(targetQid, item, shelf) {
  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${targetQid}.json`
  const data = await fetchJson(entityUrl)
  if (!data?.entities?.[targetQid]) return null
  const entity = data.entities[targetQid]

  const claims = entity.claims || {}
  const sitelinks = entity.sitelinks || {}
  const sitelinksCount = Object.keys(sitelinks).length

  // Portada libre de Commons (P18)
  const commonsImage = claims.P18?.[0]?.mainsnak?.datavalue?.value || null
  let posterUrl = null
  let imageSrc = null
  let imageCredit = null

  if (commonsImage) {
    posterUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsImage)}?width=600`
    imageSrc = 'wikimedia'
    imageCredit = 'Wikimedia Commons'
  }

  // Resumen Wikipedia
  const esArticle = sitelinks.eswiki?.title
  const enArticle = sitelinks.enwiki?.title
  let synopsis = entity.descriptions?.es?.value || entity.descriptions?.en?.value || null

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
    if (summary?.extract) {
      synopsis = summary.extract
      if (!posterUrl && summary.thumbnail) {
        posterUrl = summary.thumbnail
        imageSrc = 'wikimedia'
        imageCredit = 'Wikipedia / Wikimedia Commons'
      }
    }
  }

  const collection = claims.P179?.[0]?.mainsnak?.datavalue?.value?.id || null
  const basedOn = claims.P144?.[0]?.mainsnak?.datavalue?.value?.id || null
  const awards = (claims.P166 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean)
  const bggId = claims.P2339?.[0]?.mainsnak?.datavalue?.value || null
  const imdbId = claims.P345?.[0]?.mainsnak?.datavalue?.value || null

  return {
    wikidataId: targetQid,
    title: entity.labels?.es?.value || entity.labels?.en?.value || item.title,
    synopsis: synopsis || item.synopsis,
    posterUrl: posterUrl || item.posterUrl,
    imageSrc: imageSrc || item.imageSrc || 'seed',
    imageCredit: imageCredit || item.imageCredit || 'Archivo',
    wikiLangs: sitelinksCount,
    collection,
    basedOn,
    awards: awards.length ? awards : undefined,
    bggId,
    imdbId,
    originCountry: claims.P495?.[0]?.mainsnak?.datavalue?.value?.id
      ? [claims.P495[0].mainsnak.datavalue.value.id]
      : item.originCountry,
  }
}

/**
 * Consulta fallback para juegos de mesa vía recommend.games / BGG
 */
async function fetchBoardgameFallback(title, year) {
  try {
    const url = `https://recommend.games/api/games/?search=${encodeURIComponent(title)}`
    const res = await fetchJson(url)
    const match = res?.results?.find(
      (r) =>
        r.name?.toLowerCase() === title.toLowerCase() ||
        (r.year && year && Math.abs(r.year - year) <= 1 && r.name?.toLowerCase().includes(title.toLowerCase()))
    ) || res?.results?.[0]

    if (match) {
      return {
        bggId: match.bgg_id ? String(match.bgg_id) : null,
        wikidataId: match.wikidata_id?.[0] || null,
        posterUrl: match.image_url?.[0] || null,
        synopsis: match.description ? match.description.slice(0, 300) + '...' : null,
      }
    }
  } catch {}
  return null
}

async function main() {
  console.log('=== T2b: Corrección y re-resolución de tipos erróneos de Wikidata ===\n')

  if (!existsSync(SEED_FILE) || !existsSync(BAD_FILE)) {
    console.error('Faltan archivos seed.json o wikidata-tipo-equivocado.json')
    process.exit(1)
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const badData = JSON.parse(readFileSync(BAD_FILE, 'utf8'))

  const seedMap = new Map()
  for (const it of seed.items) {
    seedMap.set(it.id, it)
  }

  // Pre-batch para libros: averiguar en 1 consulta SPARQL cuáles eran ediciones con P629
  console.log('Comprobando P629 en lote para todos los libros erróneos...')
  const bookPrevQids = (badData.book || []).map((b) => b.wikidataId)
  const bookWorksMap = await batchValidateQids(bookPrevQids, 'book')
  console.log(`De ${bookPrevQids.length} libros, ${Object.keys(bookWorksMap).length} son ediciones que suben directo a la obra.\n`)

  const sinResolver = []
  let totalFixed = 0
  let totalPurgedWithoutWikidata = 0

  for (const [shelf, badItems] of Object.entries(badData)) {
    if (FILTER_SHELF && shelf !== FILTER_SHELF) continue
    const itemsToFix = LIMIT ? badItems.slice(0, LIMIT) : badItems
    console.log(`\n=================== ${shelf.toUpperCase()} (${itemsToFix.length} fichas) ===================`)

    for (let i = 0; i < itemsToFix.length; i++) {
      const bad = itemsToFix[i]
      const item = seedMap.get(bad.id)
      if (!item) continue

      process.stdout.write(`[${i + 1}/${badItems.length}] ${item.title} (prev: ${bad.wikidataId})... `)

      // 1. Purgar todo lo que vino de Wikidata/Wikipedia
      delete item.wikidataId
      if (item.src) {
        if (item.src.synopsis === 'wikidata' || item.src.synopsis === 'wikipedia') {
          delete item.synopsis
          delete item.src.synopsis
        }
        if (item.src.posterUrl === 'wikimedia' || item.src.posterUrl === 'wikipedia') {
          delete item.posterUrl
          delete item.src.posterUrl
        }
        delete item.src.wikidataId
        delete item.src.wikiLangs
        delete item.src.awards
      }
      if (item.imageSrc === 'wikimedia') {
        item.imageSrc = 'seed'
        item.imageCredit = 'Archivo'
      }

      // 2. Determinar candidate target QID
      let targetQid = null

      // En libros: mirar el mapa precalculado de ediciones P629 (solo si el título de la obra coincide)
      if (shelf === 'book' && bookWorksMap[bad.wikidataId]) {
        const candidateP629 = bookWorksMap[bad.wikidataId]
        const scored = await scoreCandidates([candidateP629], item)
        if (scored.length > 0) {
          targetQid = scored[0].qid
        }
      }

      // Si no tenemos targetQid, buscar candidatos y validar
      if (!targetQid) {
        const candidates = await searchCandidates(item, shelf)
        if (candidates.length) {
          const validMap = await batchValidateQids(candidates, shelf)
          const validQids = Array.from(new Set(Object.values(validMap)))
          if (validQids.length) {
            const scored = await scoreCandidates(validQids, item)
            if (scored.length) {
              targetQid = scored[0].qid
            }
          }
        }

        // Para boardgame: si la búsqueda no dio nada, consultar recommend.games
        if (!targetQid && shelf === 'boardgame') {
          const bgFallback = await fetchBoardgameFallback(item.title, item.year)
          if (bgFallback?.wikidataId) {
            const validMap = await batchValidateQids([bgFallback.wikidataId], shelf)
            if (validMap[bgFallback.wikidataId]) {
              targetQid = bgFallback.wikidataId
            }
          }
        }
      }

      // 3. Enriquecer con entidad válida
      if (targetQid) {
        const enriched = await fetchEnrichedWikidata(targetQid, item, shelf)
        if (enriched) {
          item.wikidataId = enriched.wikidataId
          item.synopsis = enriched.synopsis || item.synopsis
          item.posterUrl = enriched.posterUrl || item.posterUrl
          item.imageSrc = enriched.imageSrc
          item.imageCredit = enriched.imageCredit
          item.wikiLangs = enriched.wikiLangs
          if (enriched.awards) item.awards = enriched.awards
          if (enriched.collection) item.collection = enriched.collection
          if (enriched.basedOn) item.basedOn = enriched.basedOn
          if (enriched.bggId) item.bggId = enriched.bggId
          if (enriched.imdbId) item.imdbId = enriched.imdbId

          item.src = item.src || {}
          item.src.wikidataId = 'wikidata'
          if (enriched.synopsis) item.src.synopsis = 'wikipedia'
          if (enriched.posterUrl) item.src.posterUrl = enriched.imageSrc

          totalFixed++
          console.log(`✅ ${targetQid} (${enriched.title})`)
        } else {
          targetQid = null
        }
      }

      // 4. Si NO se resolvió: registrar y aplicar fallback limpio
      if (!targetQid) {
        totalPurgedWithoutWikidata++
        sinResolver.push({
          id: item.id,
          title: item.title,
          year: item.year,
          creator: item.creator,
          shelf: item.type,
          prevBadId: bad.wikidataId,
        })

        if (shelf === 'boardgame') {
          const bgFallback = await fetchBoardgameFallback(item.title, item.year)
          if (bgFallback) {
            if (bgFallback.posterUrl) {
              item.posterUrl = bgFallback.posterUrl
              item.imageSrc = 'bgg'
              item.imageCredit = 'BoardGameGeek'
            }
            if (bgFallback.synopsis && !item.synopsis) {
              item.synopsis = bgFallback.synopsis
            }
            if (bgFallback.bggId) item.bggId = bgFallback.bggId
          }
        }

        console.log(`⚠️ Sin Wikidata válido -> Purgado (fallback aplicado)`)
      }

      await sleep(120)
    }
  }

  // Guardar seed.json actualizado
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
  console.log(`\n💾 seed.json actualizado con éxito.`)
  console.log(`Total corregidas y enlazadas a entidad válida: ${totalFixed}`)
  console.log(`Total sin entidad en Wikidata (purgadas y limpias): ${totalPurgedWithoutWikidata}`)

  // Generar docs/sin-resolver.md
  let sinResolverMd = `# Obras sin resolver en Wikidata (T2b)\n\n`
  sinResolverMd += `Total de obras sin id en Wikidata: ${sinResolver.length}\n`
  sinResolverMd += `Fecha: ${new Date().toISOString()}\n\n`
  sinResolverMd += `| ID | Estantería | Título | Año | Creador | ID erróneo anterior descartado |\n`
  sinResolverMd += `|---|---|---|---|---|---|\n`
  for (const s of sinResolver) {
    sinResolverMd += `| \`${s.id}\` | ${s.shelf} | **${s.title}** | ${s.year || '-'} | ${s.creator || '-'} | ${s.prevBadId || '-'} |\n`
  }
  sinResolverMd += `\n*Nota: estas obras quedan sin \`wikidataId\` y sus portadas/sinopsis provienen de BGG, Open Library, catálogo semilla o la ficha del LLM (T5).*\n`

  writeFileSync(SIN_RESOLVER_FILE, sinResolverMd, 'utf8')
  console.log(`📄 Generado docs/sin-resolver.md con ${sinResolver.length} obras.`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
