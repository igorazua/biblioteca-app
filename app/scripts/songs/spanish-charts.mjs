/**
 * spanish-charts.mjs — Raspado de listas oficiales de éxitos en España con procedencia real (T28 §28.2)
 *
 * Fuentes oficiales documentadas:
 * 1. PROMUSICAE: Números uno anuales del Top 100 Canciones España (2009-2024)
 * 2. PROMUSICAE: Números uno por semanas (2015-2024)
 * 3. LOS40: Histórico de números uno de la lista LOS40 (1980-2024)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const CHARTS_CACHE_DIR = join(here, '..', 'cache', 'songs', 'charts')
mkdirSync(CHARTS_CACHE_DIR, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Limpia texto wikitext eliminando enlaces y comillas */
function cleanWikiText(str) {
  if (!str) return ''
  return str
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1') // [[Link|Text]] -> Text
    .replace(/«([^»]+)»/g, '$1') // «Title» -> Title
    .replace(/['’"”«»]/g, '')
    .replace(/<ref[^>]*>.*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .trim()
}

/** Obtiene wikitext de la API de Wikipedia en español */
async function fetchWikiText(page, section = null) {
  const cacheKey = `${page.replace(/[^a-zA-Z0-9_-]/g, '_')}${section ? `_s${section}` : ''}.json`
  const cachePath = join(CHARTS_CACHE_DIR, cacheKey)

  if (existsSync(cachePath)) {
    try {
      return JSON.parse(readFileSync(cachePath, 'utf8'))
    } catch {
      // re-fetch
    }
  }

  const sectionParam = section ? `&section=${section}` : ''
  const url = `https://es.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext${sectionParam}&format=json`

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'BibliotecaApp/1.0 (contacto@biblioteca.app)' } })
    if (!res.ok) return null
    const json = await res.json()
    const text = json.parse?.wikitext?.['*'] || ''
    writeFileSync(cachePath, JSON.stringify(text), 'utf8')
    await sleep(200)
    return text
  } catch (err) {
    console.warn(`Error al descargar ${page}:`, err.message)
    return null
  }
}

/** Raspa los números uno anuales oficiales de PROMUSICAE */
export async function scrapePromusicaeAnnualN1() {
  const text = await fetchWikiText('Top_100_Canciones', 4)
  if (!text) return []

  const rows = text.split('|-')
  const hits = []

  for (const r of rows) {
    const yearMatch = r.match(/!\s*(\d{4})/)
    if (!yearMatch) continue
    const year = parseInt(yearMatch[1], 10)

    const lines = r.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'))
    if (lines.length >= 2) {
      const rawTitle = lines[0].replace(/^\|\s*/, '')
      const rawArtist = lines[1].replace(/^\|\s*/, '')

      const title = cleanWikiText(rawTitle)
      const artist = cleanWikiText(rawArtist)

      if (title && artist && title !== 'Canción') {
        hits.push({
          title,
          artist,
          year,
          provenance: `promusicae-n1-anual-${year}`,
        })
      }
    }
  }

  return hits
}

/** Raspa números uno semanales recientes de PROMUSICAE (2018-2024) */
export async function scrapePromusicaeRecentN1() {
  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024]
  const hits = []

  for (const yr of years) {
    const text = await fetchWikiText(`Anexo:Sencillos_número_uno_de_Top_100_Canciones_de_${yr}`)
    if (!text) continue

    const rows = text.split('|-')
    for (const r of rows) {
      // Buscar filas con título y artista
      const titleMatch = r.match(/«([^»]+)»/) || r.match(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/)
      const lines = r.split('\n').filter((l) => l.startsWith('|'))
      if (lines.length >= 2) {
        const rawTitle = lines[0].replace(/^\|\s*/, '')
        const rawArtist = lines[1].replace(/^\|\s*/, '')

        const title = cleanWikiText(rawTitle)
        const artist = cleanWikiText(rawArtist)

        if (title && artist && !title.includes('Fecha') && title.length < 60) {
          hits.push({
            title,
            artist,
            year: yr,
            provenance: `promusicae-n1-semanal-${yr}`,
          })
        }
      }
    }
  }

  return hits
}

/** Raspa números uno emblemáticos de la lista de LOS40 */
export async function scrapeLos40HistoricN1() {
  const text = await fetchWikiText('Anexo:Los_números_uno_de_LOS40')
  if (!text) return []

  const rows = text.split('|-')
  const hits = []

  for (const r of rows) {
    const yearMatch = r.match(/(\d{4})/)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 2000
    const lines = r.split('\n').filter((l) => l.startsWith('|'))

    if (lines.length >= 2) {
      const title = cleanWikiText(lines[0].replace(/^\|\s*/, ''))
      const artist = cleanWikiText(lines[1].replace(/^\|\s*/, ''))

      if (title && artist && title.length < 60 && artist.length < 60 && !title.includes('Canción')) {
        hits.push({
          title,
          artist,
          year,
          provenance: `los40-historico-${year}`,
        })
      }
    }
  }

  return hits
}

/** Obtiene todos los éxitos raspados en España unificados y deduplicados por título/artista */
export async function getAllScrapedSpanishHits() {
  console.log('Descargando y extrayendo listas oficiales de España (PROMUSICAE y LOS40)...')
  const [promuAnnual, promuRecent, los40] = await Promise.all([
    scrapePromusicaeAnnualN1(),
    scrapePromusicaeRecentN1(),
    scrapeLos40HistoricN1(),
  ])

  console.log(`- PROMUSICAE anuales: ${promuAnnual.length}`)
  console.log(`- PROMUSICAE semanales (2018-2024): ${promuRecent.length}`)
  console.log(`- LOS40 histórico: ${los40.length}`)

  const all = [...promuAnnual, ...promuRecent, ...los40]
  const seen = new Set()
  const unique = []

  for (const h of all) {
    const key = `${h.artist.toLowerCase()}:::${h.title.toLowerCase()}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(h)
    }
  }

  console.log(`Total éxitos oficiales en España únicos: ${unique.length}`)
  return unique
}
