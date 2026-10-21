/**
 * attrs.mjs — Registro de atributos y especificación de datos (MOTOR v2 §2b.2).
 *
 * Cada dato nuevo del catálogo es una entrada en ATTRS.
 * Define tipos, fuentes permitidas por orden de autoridad, objetivos de cobertura y reglas de validación.
 */

export const SOURCE_HIERARCHY = [
  'wikidata',
  'openlibrary',
  'musicbrainz',
  'tvmaze',
  'tmdb',
  'bgg',
  'wikimedia-api',
  'computed',
  'scrape',
  'llm-search',
  'llm-infer',
  'manual',
  'seed',
]

export function isMoreAuthoritative(srcA, srcB) {
  const idxA = SOURCE_HIERARCHY.indexOf(srcA)
  const idxB = SOURCE_HIERARCHY.indexOf(srcB)
  const rankA = idxA === -1 ? 999 : idxA
  const rankB = idxB === -1 ? 999 : idxB
  return rankA < rankB
}

export const ATTRS = {
  wikidataId: {
    type: 'qid',
    shelves: ['book', 'movie', 'series', 'boardgame', 'artist'],
    consumers: ['pageviews', 'notoriety', 'R'],
    sources: ['wikidata', 'openlibrary', 'musicbrainz', 'llm-search'],
    needsEvidence: true,
    minCoverage: 0.6,
    refresh: 'never',
  },
  originalLanguage: {
    type: 'lang',
    shelves: ['movie', 'series', 'book', 'artist'],
    consumers: ['R', 'D'],
    sources: ['wikidata', 'openlibrary', 'musicbrainz', 'llm-infer'],
    minCoverage: 0.95,
    refresh: 'never',
  },
  originCountry: {
    type: 'country[]',
    shelves: ['movie', 'series', 'book', 'boardgame', 'artist'],
    consumers: ['R', 'D'],
    sources: ['wikidata', 'musicbrainz', 'llm-infer'],
    minCoverage: 0.9,
    refresh: 'never',
  },
  titles: {
    type: 'map<locale,string>',
    shelves: ['movie', 'series', 'book', 'boardgame'],
    consumers: ['R', 'títulos'],
    sources: ['wikidata', 'openlibrary', 'llm-search'],
    needsEvidence: true,
    minCoverage: 0.9,
    refresh: 'never',
  },
  pageviews: {
    type: 'map<lang,number>',
    shelves: ['movie', 'series', 'book', 'boardgame', 'artist'],
    consumers: ['notoriety', 'popPct', 'R'],
    sources: ['wikimedia-api'],
    minCoverage: 0.85,
    refresh: 'monthly',
  },
  popPct: {
    type: 'percentile',
    shelves: ['movie', 'series', 'book', 'boardgame', 'artist'],
    consumers: ['R', 'D', 'explore'],
    sources: ['computed'],
    minCoverage: 1.0,
    refresh: 'build',
  },
  isCanon: {
    type: 'bool',
    shelves: ['movie', 'series', 'book', 'boardgame', 'artist'],
    consumers: ['R'],
    sources: ['wikidata', 'scrape', 'llm-infer'],
    minCoverage: 1.0,
    refresh: 'never',
  },
  schoolReading: {
    type: 'map<country,bool>',
    shelves: ['book'],
    consumers: ['R'],
    question: '¿Es (o ha sido) lectura habitual en institutos de {country}?',
    sources: ['scrape', 'llm-search'],
    needsEvidence: true,
    minCoverage: 1.0,
    refresh: 'yearly',
  },
  notoriety: {
    type: 'map<country,number>',
    shelves: ['movie', 'series', 'book', 'boardgame', 'artist'],
    consumers: ['R'],
    sources: ['computed'],
    minCoverage: 1.0,
    refresh: 'build',
  },
  trend: {
    type: 'map<country,number>',
    shelves: ['movie', 'series', 'book', 'boardgame', 'artist'],
    consumers: ['D', 'A'],
    sources: ['computed'],
    minCoverage: 0.85,
    refresh: 'weekly',
  },
  seasons: {
    type: 'number',
    shelves: ['series'],
    consumers: ['filtros', 'R', 'Decidir'],
    sources: ['tvmaze', 'wikidata', 'tmdb'],
    minCoverage: 0.85,
    refresh: 'yearly',
  },
  episodes: {
    type: 'number',
    shelves: ['series'],
    consumers: ['filtros', 'R'],
    sources: ['tvmaze', 'wikidata', 'tmdb'],
    minCoverage: 0.80,
    refresh: 'yearly',
  },
  network: {
    type: 'string',
    shelves: ['series'],
    consumers: ['filtros', 'D'],
    sources: ['tvmaze', 'wikidata'],
    minCoverage: 0.70,
    refresh: 'never',
  },
  ongoing: {
    type: 'bool',
    shelves: ['series'],
    consumers: ['filtros', 'D'],
    sources: ['tvmaze', 'wikidata', 'computed'],
    minCoverage: 0.85,
    refresh: 'monthly',
  },
  weight: {
    type: 'number',
    shelves: ['boardgame'],
    consumers: ['filtros', 'R', 'Decidir'],
    sources: ['bgg', 'wikidata', 'llm-infer'],
    minCoverage: 0.75,
    refresh: 'never',
  },
  minAge: {
    type: 'number',
    shelves: ['boardgame'],
    consumers: ['filtros', 'Decidir'],
    sources: ['bgg', 'wikidata'],
    minCoverage: 0.75,
    refresh: 'never',
  },
  cooperative: {
    type: 'bool',
    shelves: ['boardgame'],
    consumers: ['filtros', 'Decidir'],
    sources: ['bgg', 'wikidata', 'llm-infer'],
    minCoverage: 0.85,
    refresh: 'never',
  },
  mechanics: {
    type: 'string[]',
    shelves: ['boardgame'],
    consumers: ['filtros', 'Decidir', 'R'],
    sources: ['bgg', 'wikidata'],
    minCoverage: 0.75,
    refresh: 'never',
  },
  cast: {
    type: 'string[]',
    shelves: ['movie'],
    consumers: ['R', 'filtros', 'búsqueda'],
    sources: ['wikidata', 'tmdb'],
    minCoverage: 0.70,
    refresh: 'never',
  },
  peakDecades: {
    type: 'string[]',
    shelves: ['artist'],
    consumers: ['R', 'era', 'popPct'],
    sources: ['wikidata', 'llm-infer', 'computed'],
    minCoverage: 0.80,
    refresh: 'never',
  },
}

export function validateAttrValue(attrName, val, evidence, source) {
  const def = ATTRS[attrName]
  if (!def) return { valid: false, error: `Atributo desconocido: ${attrName}` }

  if (def.needsEvidence && (source === 'llm-search' || source === 'scrape') && (!evidence || typeof evidence !== 'string')) {
    return { valid: false, error: `Atributo ${attrName} requiere 'evidence' (URL o cita) para la fuente ${source}` }
  }

  switch (def.type) {
    case 'qid':
      if (typeof val !== 'string' || !/^Q\d+$/.test(val.trim())) {
        return { valid: false, error: `QID inválido: ${val}` }
      }
      return { valid: true, value: val.trim() }

    case 'lang':
      if (typeof val !== 'string' || val.trim().length !== 2) {
        return { valid: false, error: `Código ISO-639-1 inválido: ${val}` }
      }
      return { valid: true, value: val.trim().toLowerCase() }

    case 'country[]':
      if (!Array.isArray(val) || val.some((c) => typeof c !== 'string' || c.length !== 2)) {
        return { valid: false, error: `Lista de países ISO-3166 inválida: ${JSON.stringify(val)}` }
      }
      return { valid: true, value: val.map((c) => c.toUpperCase()) }

    case 'bool':
      if (typeof val !== 'boolean') {
        return { valid: false, error: `Booleano esperado: ${val}` }
      }
      return { valid: true, value: val }

    case 'percentile':
      if (typeof val !== 'number' || val < 0 || val > 100) {
        return { valid: false, error: `Percentil 0-100 esperado: ${val}` }
      }
      return { valid: true, value: Math.round(val * 10) / 10 }

    case 'map<locale,string>':
      if (typeof val !== 'object' || val === null || Array.isArray(val)) {
        return { valid: false, error: `Mapa de locales esperado: ${JSON.stringify(val)}` }
      }
      return { valid: true, value: val }

    case 'map<country,bool>':
      if (typeof val !== 'object' || val === null || Array.isArray(val)) {
        return { valid: false, error: `Mapa de países booleano esperado: ${JSON.stringify(val)}` }
      }
      return { valid: true, value: val }

    case 'map<country,number>':
      if (typeof val !== 'object' || val === null || Array.isArray(val)) {
        return { valid: false, error: `Mapa de países numérico esperado: ${JSON.stringify(val)}` }
      }
      return { valid: true, value: val }

    case 'map<lang,number>':
      if (typeof val !== 'object' || val === null || Array.isArray(val)) {
        return { valid: false, error: `Mapa de visitas por idioma esperado: ${JSON.stringify(val)}` }
      }
      return { valid: true, value: val }

    case 'number':
      if (typeof val !== 'number' || isNaN(val)) {
        return { valid: false, error: `Número esperado: ${val}` }
      }
      return { valid: true, value: val }

    case 'string':
      if (typeof val !== 'string' || !val.trim()) {
        return { valid: false, error: `Texto no vacío esperado: ${val}` }
      }
      return { valid: true, value: val.trim() }

    case 'string[]':
      if (!Array.isArray(val) || val.some((s) => typeof s !== 'string' || !s.trim())) {
        return { valid: false, error: `Lista de textos esperada: ${JSON.stringify(val)}` }
      }
      return { valid: true, value: val.map((s) => s.trim()) }

    default:
      return { valid: true, value: val }
  }
}
