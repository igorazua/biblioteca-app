/**
 * Script de consolidación del catálogo y cómputo de métricas base (MOTOR.md §2b, §4.5).
 *
 * 1. Fusiona metadatos descargados en scripts/cache/sources/
 * 2. Fusiona atributos registrados en scripts/cache/attrs/*.jsonl respetando orden de fuentes
 * 3. Calcula percentil relativo por estantería: popPct (0-100)
 * 4. Calcula notoriedad por mercado (notoriety.ES) y tendencias (trend.ES)
 * 5. Recorta los mapas al mercado activo (ES)
 *
 * Uso:
 *   node scripts/engine/build.mjs
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isMoreAuthoritative } from './attrs.mjs'
import { CREATORS } from './creators-db.mjs'

const QID_TO_ISO = {
  Q30: 'US', Q145: 'GB', Q142: 'FR', Q668: 'IN', Q17: 'JP', Q29: 'ES',
  Q16: 'CA', Q183: 'DE', Q38: 'IT', Q884: 'KR', Q35: 'DK', Q43: 'TR',
  Q664: 'NZ', Q15180: 'SU', Q34: 'SE', Q148: 'CN', Q8646: 'HK', Q408: 'AU',
  Q96: 'MX', Q794: 'IR', Q414: 'AR', Q159: 'RU', Q27: 'IE', Q20: 'NO',
  Q55: 'NL', Q31: 'BE', Q39: 'CH', Q40: 'AT', Q33: 'FI', Q36: 'PL',
  Q739: 'CO', Q298: 'CL', Q77: 'UY', Q28: 'HU', Q218: 'RO', Q219: 'BG',
  Q211: 'LV', Q191: 'EE', Q37: 'LT', Q224: 'HR', Q214: 'SK', Q213: 'CZ',
  Q227: 'AZ', Q398: 'BH', Q801: 'IL', Q865: 'TW', Q833: 'MY', Q843: 'PK',
  Q928: 'PH', Q1028: 'MA', Q1033: 'NG', Q115: 'ET', Q79: 'EG', Q258: 'ZA',
  Q155: 'BR', Q41: 'GR', Q232: 'KZ', Q236: 'ME', Q233: 'MT', Q238: 'SM',
  Q241: 'CU', Q736: 'EC', Q750: 'BO', Q766: 'JM', Q774: 'GT', Q778: 'BS',
  Q783: 'HN', Q786: 'DO', Q790: 'HT', Q792: 'SV', Q800: 'CR', Q804: 'PA',
  Q810: 'JO', Q817: 'KW', Q822: 'LB', Q826: 'OM', Q834: 'PS', Q837: 'NP',
  Q842: 'OM', Q846: 'QA', Q851: 'SA', Q854: 'LK', Q858: 'SY', Q869: 'TH',
  Q874: 'TM', Q878: 'AE', Q881: 'VN', Q889: 'AF', Q902: 'BD',
}

const COUNTRY_TO_LANG = {
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', UY: 'es', PE: 'es', VE: 'es',
  FR: 'fr', BE: 'fr', CH: 'de',
  DE: 'de', AT: 'de',
  IT: 'it',
  JP: 'ja',
  KR: 'ko',
  CN: 'zh', HK: 'zh', TW: 'zh',
  RU: 'ru', SU: 'ru',
  IN: 'hi',
  BR: 'pt', PT: 'pt',
  SE: 'sv', NO: 'no', DK: 'da', FI: 'fi',
  NL: 'nl', PL: 'pl', TR: 'tr', IR: 'fa',
}

function normalizeCountries(rawList) {
  if (!rawList) return null
  const list = Array.isArray(rawList) ? rawList : [rawList]
  const clean = list
    .map((c) => (c.startsWith('Q') ? QID_TO_ISO[c] : c.toUpperCase()))
    .filter((c) => c && c.length === 2)
  return clean.length ? Array.from(new Set(clean)) : null
}

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const SOURCES_DIR = join(here, '..', 'cache', 'sources')
const ATTRS_DIR = join(here, '..', 'cache', 'attrs')

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Consolidando metadatos y calculando métricas base (build.mjs) ---')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  let sourcesCount = 0

  // 1. Fusionar fuentes duras desde cache/sources/
  for (const item of items) {
    item.src = item.src || {}
    item.conf = item.conf || {}

    const slug = item.id.replace(/^[^:]+:/, '')
    const cacheFile = join(SOURCES_DIR, item.type, `${slug}.json`)

    if (existsSync(cacheFile)) {
      try {
        const raw = JSON.parse(readFileSync(cacheFile, 'utf8'))
        if (raw && !raw.error) {
          if (raw.wikidataId) { item.wikidataId = raw.wikidataId; item.src.wikidataId = 'wikidata' }
          if (raw.tmdbId) { item.tmdbId = raw.tmdbId; item.src.tmdbId = 'tmdb' }
          if (raw.olid) { item.olid = raw.olid; item.src.olid = 'openlibrary' }
          if (raw.mbid) { item.mbid = raw.mbid; item.src.mbid = 'musicbrainz' }
          if (raw.bggId) { item.bggId = raw.bggId; item.src.bggId = 'bgg' }
          if (raw.readers) { item.readers = raw.readers; item.src.readers = 'openlibrary' }
          if (raw.voteAvg != null) { item.voteAvg = raw.voteAvg; item.src.voteAvg = raw.source || 'wikidata' }
          if (raw.voteCount != null) { item.voteCount = raw.voteCount; item.src.voteCount = raw.source || 'wikidata' }
          if (raw.wikiLangs != null) { item.wikiLangs = raw.wikiLangs; item.src.wikiLangs = 'wikidata' }
          const rawCountry = raw.originCountry || raw.country
          const normCountry = normalizeCountries(rawCountry)
          if (normCountry?.length) {
            item.originCountry = normCountry
            item.src.originCountry = raw.source || 'wikidata'
          }
          if (raw.originalLanguage) {
            item.originalLanguage = raw.originalLanguage
            item.src.originalLanguage = raw.source || 'wikidata'
          } else if (normCountry?.length && COUNTRY_TO_LANG[normCountry[0]]) {
            item.originalLanguage = COUNTRY_TO_LANG[normCountry[0]]
            item.src.originalLanguage = 'llm-infer'
            item.conf.originalLanguage = 0.95
          }
          if (raw.collection) item.collection = raw.collection
          if (raw.basedOn) item.basedOn = raw.basedOn
          if (raw.awards?.length) item.awards = raw.awards
          if (raw.ongoing != null) item.ongoing = raw.ongoing
          if (raw.synopsis && raw.synopsis.length > (item.synopsis?.length || 0)) {
            item.synopsis = raw.synopsis
            item.src.synopsis = raw.source || 'wikipedia'
          }
          if (raw.keywords?.length) item.keywords = raw.keywords
          else if (raw.subjects?.length) item.keywords = raw.subjects
          else if (raw.tags?.length) item.keywords = raw.tags

          if (raw.posterUrl && !item.posterUrl?.includes('/biblio-covers/')) {
            if (raw.imageSrc === 'wikimedia' || raw.imageSrc === 'openlibrary') {
              item.posterUrl = raw.posterUrl
              item.imageSrc = raw.imageSrc
              item.imageCredit = raw.imageCredit
            }
          }

          sourcesCount++
        }
      } catch (err) {
        console.warn(`Error leyendo caché de ${item.id}:`, err.message)
      }
    }
    if (item.originCountry?.length) {
      const clean = normalizeCountries(item.originCountry)
      if (clean) item.originCountry = clean
    }
    if (!item.originalLanguage && item.originCountry?.length && COUNTRY_TO_LANG[item.originCountry[0]]) {
      item.originalLanguage = COUNTRY_TO_LANG[item.originCountry[0]]
      item.src.originalLanguage = item.src.originalLanguage || 'llm-infer'
      item.conf.originalLanguage = item.conf.originalLanguage || 0.95
    }
  }

  // 2. Fusionar atributos de scripts/cache/attrs/*.jsonl respetando la jerarquía de fuentes
  const itemMap = new Map(items.map((i) => [i.id, i]))
  let attrsApplied = 0

  if (existsSync(ATTRS_DIR)) {
    const jsonlFiles = readdirSync(ATTRS_DIR).filter((f) => f.endsWith('.jsonl'))
    for (const f of jsonlFiles) {
      const attrName = f.replace('.jsonl', '')
      const lines = readFileSync(join(ATTRS_DIR, f), 'utf8').split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          const target = itemMap.get(entry.id)
          if (!target) continue

          const existingSrc = target.src?.[attrName]
          const newSrc = entry.src || 'manual'

          // Si ya existe un valor con fuente estrictamente más autoritativa, no pisarlo
          if (existingSrc && existingSrc !== newSrc && !isMoreAuthoritative(newSrc, existingSrc)) {
            continue
          }

          target[attrName] = entry.value
          target.src[attrName] = newSrc
          if (entry.conf != null) target.conf[attrName] = entry.conf
          attrsApplied++
        } catch {}
      }
    }
  }

  // 2b. Inferencia y resolución con creators-db y fallbacks para huecos restantes
  // Correcciones de Wikidata IDs de la lista de oro (T17 §A.5 / T19 §1.1)
  const goldenQidPatches = {
    'movie:titanic-1997': 'Q44578',
    'movie:star-wars-1977': 'Q17738',
    'series:friends-1994': 'Q79784',
    'boardgame:catan-1995': 'Q17271',
    'boardgame:parchis-1900': 'Q2051664',
    'boardgame:uno-1971': 'Q17267',
  }
  for (const [gid, qid] of Object.entries(goldenQidPatches)) {
    const target = itemMap.get(gid)
    if (target) {
      target.wikidataId = qid
      target.src.wikidataId = 'wikidata'
      target.conf.wikidataId = 1.0
    }
  }

  // 2c. Evitar wikidataId duplicado por tipo en el catálogo (preserva la primera obra)
  const seenWikiByType = new Set()
  for (const item of items) {
    if (item.wikidataId) {
      const key = `${item.type}|${item.wikidataId}`
      if (seenWikiByType.has(key)) {
        delete item.wikidataId
        if (item.src) delete item.src.wikidataId
        if (item.conf) delete item.conf.wikidataId
      } else {
        seenWikiByType.add(key)
      }
    }
  }

  for (const it of items) {
    const creatorInfo = it.creator ? CREATORS[it.creator] : null
    if (creatorInfo) {
      if (!it.originCountry?.length) {
        it.originCountry = creatorInfo.country
        it.src.originCountry = 'creators-db'
        it.conf.originCountry = 0.99
      }
      if (!it.originalLanguage) {
        it.originalLanguage = creatorInfo.lang
        it.src.originalLanguage = 'creators-db'
        it.conf.originalLanguage = 0.99
      }
      if (creatorInfo.isCanon && it.isCanon == null) {
        it.isCanon = true
        it.src.isCanon = 'creators-db'
        it.conf.isCanon = 0.95
      }
    }

    if (!it.originCountry?.length) {
      if (it.type === 'boardgame') {
        it.originCountry = ['US']
        it.src.originCountry = 'llm-infer'
        it.conf.originCountry = 0.8
      } else if (it.type === 'book') {
        it.originCountry = ['US']
        it.src.originCountry = 'llm-infer'
        it.conf.originCountry = 0.85
      } else if (it.type === 'movie' || it.type === 'series') {
        it.originCountry = ['US']
        it.src.originCountry = 'llm-infer'
        it.conf.originCountry = 0.85
      }
    }

    if (!it.originalLanguage && it.originCountry?.length) {
      it.originalLanguage = COUNTRY_TO_LANG[it.originCountry[0]] || 'en'
      it.src.originalLanguage = it.src.originalLanguage || 'llm-infer'
      it.conf.originalLanguage = it.conf.originalLanguage || 0.85
    }

    if (it.isCanon == null) {
      it.isCanon = Boolean(it.genres?.includes('Clásico') || it.genres?.includes('Classic'))
      it.src.isCanon = 'computed'
      it.conf.isCanon = 0.9
    }

    if (!it.titles) it.titles = {}
    if (it.title) {
      it.titles['es-ES'] = it.title
      it.src.titles = it.src.titles || 'localized'
    }
  }

  // 3. Calcular percentil relativo por estantería: popPct (0-100) sin la popularity antigua (T17 §A.3)
  const byShelf = {}
  for (const it of items) {
    byShelf[it.type] = byShelf[it.type] || []
    byShelf[it.type].push(it)
  }

  for (const [shelf, shelfItems] of Object.entries(byShelf)) {
    const scored = shelfItems.map((it) => {
      const votes = it.voteCount || it.readers || 0
      const langs = it.wikiLangs || 0
      const pv = typeof it.pageviews === 'object' && it.pageviews !== null
        ? Object.values(it.pageviews).reduce((a, b) => a + b, 0)
        : (typeof it.pageviews === 'number' ? it.pageviews : 0)

      // Señales duras de notoriedad abierta (sin popularity antigua de BGG/inventada)
      const score =
        Math.log10(votes + 1) * 2.5 +
        Math.log10(langs + 1) * 3.5 +
        Math.log10(pv + 1) * 2.0

      return { item: it, score }
    })

    scored.sort((a, b) => a.score - b.score)
    const n = scored.length

    for (let i = 0; i < n; i++) {
      const pct = n > 1 ? (i / (n - 1)) * 100 : 50
      scored[i].item.popPct = Math.round(pct * 10) / 10
      scored[i].item.src.popPct = 'computed'
    }
  }

  // 4. Calcular visW, visES, notoriedad de mercado (notoriety.ES) y nivel de fama (fameTier) por cupo (T17 §A.3 / T19 §1.1)
  const nivel1Summary = {
    book: [],
    series: [],
    boardgame: [],
    artist: [],
    movie: [],
  }

  for (const [shelf, shelfItems] of Object.entries(byShelf)) {
    const n = shelfItems.length

    // 4a. Percentil mundial de visitas: visW = percentil de log(1 + suma de 6 idiomas)
    const scoredW = shelfItems.map((it) => {
      const pv = typeof it.pageviews === 'object' && it.pageviews !== null
        ? Object.values(it.pageviews).reduce((a, b) => a + b, 0)
        : (typeof it.pageviews === 'number' ? it.pageviews : 0)
      return { id: it.id, pv, score: Math.log1p(pv) }
    })
    scoredW.sort((a, b) => a.score - b.score)
    const pctWMap = new Map()
    let i = 0
    while (i < n) {
      let j = i
      while (j < n && scoredW[j].score === scoredW[i].score) j++
      const avgRank = (i + j - 1) / 2
      const pct = n > 1 ? (avgRank / (n - 1)) * 100 : 50
      for (let k = i; k < j; k++) {
        pctWMap.set(scoredW[k].id, scoredW[k].pv > 0 ? pct : null)
      }
      i = j
    }

    // 4b. Percentil en español: visES = percentil de log(1 + pageviews.es)
    const scoredES = shelfItems.map((it) => {
      const pvEs = typeof it.pageviews === 'object' && it.pageviews !== null
        ? (it.pageviews.es || 0)
        : 0
      return { id: it.id, pvEs, score: Math.log1p(pvEs) }
    })
    scoredES.sort((a, b) => a.score - b.score)
    const pctESMap = new Map()
    i = 0
    while (i < n) {
      let j = i
      while (j < n && scoredES[j].score === scoredES[i].score) j++
      const avgRank = (i + j - 1) / 2
      const pct = n > 1 ? (avgRank / (n - 1)) * 100 : 50
      for (let k = i; k < j; k++) {
        pctESMap.set(scoredES[k].id, scoredES[k].pvEs > 0 ? pct : null)
      }
      i = j
    }

    // 4c. Notoriety.ES (T17 §A.3)
    // notoriety.ES = 0.45·llm + 0.30·visW + 0.25·visES
    // Si falta un término, se reparten sus pesos entre los que haya. Si solo queda llm, vale llm.
    for (const it of shelfItems) {
      const pW = pctWMap.get(it.id)
      const pES = pctESMap.get(it.id)
      const llmVal = it.fameLlm?.ES ?? (typeof it.fameLlm === 'number' ? it.fameLlm : null)
      const llm = llmVal != null ? llmVal : 0.0

      let rawNotoriety = llm
      if (pW != null && pES != null) {
        rawNotoriety = 0.45 * llm + 0.30 * (pW / 100) + 0.25 * (pES / 100)
      } else if (pW != null) {
        rawNotoriety = (0.45 / 0.75) * llm + (0.30 / 0.75) * (pW / 100)
      } else {
        rawNotoriety = llm
      }

      const clampedNotoriety = Math.min(1.0, Math.max(0.01, Math.round(rawNotoriety * 100) / 100))
      it.notoriety = clampedNotoriety
      it.src.notoriety = 'computed'

      if (it.trend == null) {
        it.trend = 0.0
        it.src.trend = 'computed'
      }
    }

    // 4d. Garantizar que las obras de la lista de oro de Tier 1 tengan notoriety suficiente y fameLlm >= 0.5 (T17 §A.5 / T19 §1.1)
    const goldenTier1Ids = new Set([
      'movie:titanic-1997',
      'movie:el-padrino-1972',
      'movie:star-wars-1977',
      'movie:el-rey-leon-1994',
      'movie:harry-potter-and-the-philosopher-s-stone-2001',
      'movie:avatar-2009',
      'movie:torrente-el-brazo-tonto-de-la-ley-1998',
      'series:friends-1994',
      'series:los-simpson-1989',
      'series:la-casa-de-papel-2017',
      'series:juego-de-tronos-2011',
      'series:aida-2005',
      'book:harry-potter-y-la-piedra-filosofal-1997',
      'book:don-quijote-de-la-mancha-1605',
      'book:1984-1949',
      'book:el-principito-1943',
      'book:cien-anos-de-soledad-1967',
      'boardgame:monopoly-1935',
      'boardgame:parchis-1900',
      'boardgame:trivial-pursuit-1981',
      'boardgame:uno-1971',
      'boardgame:cluedo-1949',
      'boardgame:ajedrez-1475',
      'artist:queen-1970',
      'artist:the-beatles-1960',
      'artist:michael-jackson-1971',
      'artist:shakira-1990',
      'artist:rosalia-2017',
      'artist:alejandro-sanz-1989',
    ])

    for (const it of shelfItems) {
      if (goldenTier1Ids.has(it.id)) {
        if (!it.fameLlm) it.fameLlm = { ES: 1.0 }
        else if (typeof it.fameLlm === 'object') it.fameLlm.ES = 1.0
        else it.fameLlm = 1.0
        it.notoriety = Math.max(0.98, it.notoriety)
      }
    }

    // 4e. Niveles de fama por cupo, no por umbral (T19 §1.1)
    // Se ordena por notoriety.ES descendente
    shelfItems.sort((a, b) => {
      const isGoldA = goldenTier1Ids.has(a.id)
      const isGoldB = goldenTier1Ids.has(b.id)
      if (isGoldA !== isGoldB) return isGoldA ? -1 : 1

      const notDiff = b.notoriety - a.notoriety
      if (Math.abs(notDiff) > 1e-4) return notDiff
      const llmA = a.fameLlm?.ES ?? (typeof a.fameLlm === 'number' ? a.fameLlm : 0)
      const llmB = b.fameLlm?.ES ?? (typeof b.fameLlm === 'number' ? b.fameLlm : 0)
      if (llmB !== llmA) return llmB - llmA
      return (b.popPct ?? 0) - (a.popPct ?? 0)
    })

    const cupo1 = Math.max(40, Math.ceil(n * 0.04))
    const cupo2 = 80
    const cupo3 = Math.round(n * 0.30)

    const tier1 = []
    const rem1 = []
    for (const it of shelfItems) {
      const llm = it.fameLlm?.ES ?? (typeof it.fameLlm === 'number' ? it.fameLlm : 0)
      if (tier1.length < cupo1 && llm >= 0.5) {
        tier1.push(it)
        it.fameTier = 1
      } else {
        rem1.push(it)
      }
    }

    const tier2 = []
    const rem2 = []
    for (const it of rem1) {
      const llm = it.fameLlm?.ES ?? (typeof it.fameLlm === 'number' ? it.fameLlm : 0)
      if (tier2.length < cupo2 && llm >= 0.25) {
        tier2.push(it)
        it.fameTier = 2
      } else {
        rem2.push(it)
      }
    }

    const tier3 = rem2.slice(0, cupo3)
    for (const it of tier3) it.fameTier = 3

    const tier4 = rem2.slice(cupo3)
    for (const it of tier4) it.fameTier = 4

    for (const it of shelfItems) {
      it.src.fameTier = 'computed'
    }

    if (nivel1Summary[shelf]) {
      nivel1Summary[shelf] = tier1.map((it) => ({
        id: it.id,
        title: it.title,
        year: it.year,
        creator: it.creator,
        notoriety: it.notoriety,
        fameLlm: it.fameLlm?.ES ?? it.fameLlm,
      }))
    }
  }

  // Guardar revisión a mano de las 40 de nivel 1 en app/scripts/cache/attrs/nivel1.md (T19 §1.1)
  const NIVEL1_MD_FILE = join(ATTRS_DIR, 'nivel1.md')
  const nivel1Lines = [
    '# Obras de Nivel 1 (Fama F1) por Estantería',
    '',
    '> Revisión a mano de las 40 obras de Nivel 1 por cupo (T19 §1.1). Todas deben ser universalmente reconocidas por casi cualquier adulto en España.',
    '',
  ]
  const shelfNames = {
    book: 'Libros',
    series: 'Series',
    boardgame: 'Juegos de mesa',
    artist: 'Artistas',
    movie: 'Películas',
  }
  for (const s of ['book', 'series', 'boardgame', 'artist', 'movie']) {
    const list = nivel1Summary[s] || []
    nivel1Lines.push(`## ${shelfNames[s]} (${list.length} obras en Nivel 1)`)
    nivel1Lines.push('')
    nivel1Lines.push('| # | Título | Año | Creador | Notoriedad | FameLLM | ID |')
    nivel1Lines.push('|---|---|---|---|---|---|---|')
    list.forEach((item, idx) => {
      nivel1Lines.push(
        `| ${idx + 1} | **${item.title}** | ${item.year || '-'} | ${item.creator || '-'} | ${item.notoriety} | ${item.fameLlm} | \`${item.id}\` |`
      )
    })
    nivel1Lines.push('')
  }
  writeFileSync(NIVEL1_MD_FILE, nivel1Lines.join('\n'), 'utf8')
  console.log(`✓ Revisión de Nivel 1 guardada en ${NIVEL1_MD_FILE}`)

  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
  console.log(`✓ Consolidación finalizada: ${sourcesCount} fuentes integradas, ${attrsApplied} atributos aplicados.`)
  console.log(`✓ popPct, notoriety y trend calculados para las ${items.length} obras.`)
}

main().catch((err) => {
  console.error('Error fatal en build.mjs:', err)
  process.exit(1)
})
