// app/scripts/engine/genres-es.mjs
// Mapa fijo de normalización de géneros inglés -> español para el catálogo de Biblioteca

export const GENRE_MAP_EN_ES = {
  // Películas y Series
  'action': 'Acción',
  'acción': 'Acción',
  'adventure': 'Aventura',
  'aventura': 'Aventura',
  'animation': 'Animación',
  'animación': 'Animación',
  'anime': 'Anime',
  'biography': 'Biografía',
  'biografía': 'Biografía',
  'comedy': 'Comedia',
  'comedia': 'Comedia',
  'crime': 'Crimen',
  'crimen': 'Crimen',
  'documentary': 'Documental',
  'documental': 'Documental',
  'drama': 'Drama',
  'family': 'Familiar',
  'familiar': 'Familiar',
  'fantasy': 'Fantasía',
  'fantasía': 'Fantasía',
  'film-noir': 'Cine negro',
  'cine negro': 'Cine negro',
  'history': 'Historia',
  'historia': 'Historia',
  'horror': 'Terror',
  'terror': 'Terror',
  'music': 'Música',
  'música': 'Música',
  'musical': 'Musical',
  'mystery': 'Misterio',
  'misterio': 'Misterio',
  'romance': 'Romance',
  'sci-fi': 'Ciencia ficción',
  'science fiction': 'Ciencia ficción',
  'ciencia ficción': 'Ciencia ficción',
  'short': 'Cortometraje',
  'cortometraje': 'Cortometraje',
  'sport': 'Deporte',
  'deporte': 'Deporte',
  'thriller': 'Thriller',
  'war': 'Bélica',
  'bélica': 'Bélica',
  'western': 'Western',

  // Libros
  'novel': 'Novela',
  'novela': 'Novela',
  'fiction': 'Ficción',
  'ficción': 'Ficción',
  'non-fiction': 'No ficción',
  'no ficción': 'No ficción',
  'essay': 'Ensayo',
  'ensayo': 'Ensayo',
  'poetry': 'Poesía',
  'poesía': 'Poesía',
  'classic': 'Clásico',
  'clásico': 'Clásico',
  'philosophy': 'Filosofía',
  'filosofía': 'Filosofía',
  'dystopia': 'Distopía',
  'distopía': 'Distopía',

  // Juegos de mesa
  'card game': 'Cartas',
  'cartas': 'Cartas',
  'party': 'Party',
  'strategy': 'Estrategia',
  'estrategia': 'Estrategia',
  'cooperative': 'Cooperativo',
  'cooperativo': 'Cooperativo',
  'thematic': 'Temático',
  'economic': 'Económico',
  'wargame': 'Juego de guerra',
  'deduction': 'Deducción',
  'bluffing': 'Faroleo',
  'dice': 'Dados',
  'abstract strategy': 'Estrategia abstracta',
  'city building': 'Construcción de ciudades',
  'civilization': 'Civilización',
  'miniatures': 'Miniaturas',
  'science fiction / space': 'Ciencia ficción',
  'medieval': 'Medieval',
  'ancient': 'Antigüedad',
  'exploration': 'Exploración',
  'adventure / fantasy': 'Aventura',
  'humor': 'Humor',
  'environmental': 'Medio ambiente',
  'animals': 'Animales',
}

/**
 * Normaliza un género a español si existe traducción.
 */
export function normalizeGenre(g) {
  if (!g || typeof g !== 'string') return ''
  const trimmed = g.trim()
  const lower = trimmed.toLowerCase()
  return GENRE_MAP_EN_ES[lower] || trimmed
}

/**
 * Normaliza un array de géneros eliminando duplicados.
 */
export function normalizeGenres(genres) {
  if (!Array.isArray(genres)) return []
  const seen = new Set()
  const result = []
  for (const g of genres) {
    const norm = normalizeGenre(g)
    if (norm && !seen.has(norm.toLowerCase())) {
      seen.add(norm.toLowerCase())
      result.push(norm)
    }
  }
  return result
}
