/**
 * dimensions.ts — Dimensiones de contraste para los duelos de Decidir (T17 §B.2).
 *
 * Cada dimensión clasifica una obra en el lado 'A', 'B' o null (si está en medio).
 * Incluye pureza [0.6, 1.0] y textos para los motivos finales.
 */

import type { Item, ShelfType } from '../../types'

export interface DimensionSide {
  label: string
  reason: string
}

export interface Dimension {
  id: string
  shelves: ShelfType[]
  name: string
  sideA: DimensionSide
  sideB: DimensionSide
  side: (item: Item) => 'A' | 'B' | null
  purity: (item: Item, s: 'A' | 'B') => number
}

const norm = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const hasGenre = (item: Item, ...terms: string[]) => {
  const gList = (item.genres || []).map(norm)
  const kwList = (item.keywords || []).map(norm)
  return terms.some((t) => {
    const nt = norm(t)
    return gList.some((g) => g.includes(nt)) || kwList.some((k) => k.includes(nt))
  })
}

export const DIMENSIONS: Dimension[] = [
  // ==================== PELIS Y SERIES ====================
  {
    id: 'formato_animacion',
    shelves: ['movie', 'series'],
    name: 'Formato visual',
    sideA: { label: 'animación', reason: 'Porque elegiste animación' },
    sideB: { label: 'imagen real', reason: 'Porque elegiste imagen real' },
    side: (it) => {
      if (hasGenre(it, 'animacion', 'animation', 'anime')) return 'A'
      return 'B'
    },
    purity: () => 1.0,
  },
  {
    id: 'tono_comedia_drama',
    shelves: ['movie', 'series'],
    name: 'Tono emocional',
    sideA: { label: 'comedia', reason: 'Para reírte y pasar un buen rato' },
    sideB: { label: 'drama', reason: 'De las que emocionan y dejan huella' },
    side: (it) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const humor = axes?.humor
      const emocion = axes?.emocion
      if (humor != null && humor >= 4) return 'A'
      if (humor != null && emocion != null && humor <= 2 && emocion >= 4) return 'B'
      // Respaldo por géneros
      if (hasGenre(it, 'comedia', 'comedy')) return 'A'
      if (hasGenre(it, 'drama')) return 'B'
      return null
    },
    purity: (it, s) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      if (s === 'A') {
        const h = axes?.humor ?? 4
        return h >= 5 ? 1.0 : 0.8
      } else {
        const e = axes?.emocion ?? 4
        return e >= 5 ? 1.0 : 0.8
      }
    },
  },
  {
    id: 'intensidad_tension',
    shelves: ['movie', 'series'],
    name: 'Nivel de intensidad',
    sideA: { label: 'para desconectar', reason: 'Para desconectar tranquilamente' },
    sideB: { label: 'de tensión', reason: 'De las que te ponen en tensión' },
    side: (it) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const reconfort = axes?.reconfort
      const tension = axes?.tension
      if (reconfort != null && tension != null && reconfort >= 4 && tension <= 2) return 'A'
      if (tension != null && tension >= 4) return 'B'
      // Respaldo por géneros
      if (hasGenre(it, 'terror', 'thriller', 'suspense', 'misterio', 'horror')) return 'B'
      if (hasGenre(it, 'familiar', 'animacion', 'romance')) return 'A'
      return null
    },
    purity: (it, s) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      if (s === 'B') {
        const t = axes?.tension ?? 4
        return t >= 5 ? 1.0 : 0.8
      }
      return 0.9
    },
  },
  {
    id: 'realismo_fantasia',
    shelves: ['movie', 'series', 'book'],
    name: 'Realismo vs fantasía',
    sideA: { label: 'fantasía o ciencia ficción', reason: 'Con mundos de fantasía y ciencia ficción' },
    sideB: { label: 'realista', reason: 'Con una historia realista y apegada al mundo real' },
    side: (it) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const fantasia = axes?.fantasia
      if (fantasia != null && fantasia >= 4) return 'A'
      if (fantasia != null && fantasia <= 2) return 'B'
      if (hasGenre(it, 'fantasia', 'fantasy', 'ciencia ficcion', 'sci-fi', 'superheroes')) return 'A'
      if (hasGenre(it, 'biografia', 'historico', 'drama', 'crimen', 'documental')) return 'B'
      return null
    },
    purity: (it, s) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const f = axes?.fantasia
      if (s === 'A') return f === 5 ? 1.0 : 0.8
      if (s === 'B') return f === 1 ? 1.0 : 0.8
      return 0.85
    },
  },
  {
    id: 'epoca_clasica_reciente',
    shelves: ['movie', 'series'],
    name: 'Época de estreno',
    sideA: { label: 'clásica', reason: 'De época clásica' },
    sideB: { label: 'reciente', reason: 'De las más recientes' },
    side: (it) => {
      const y = it.year
      if (!y) return null
      if (y < 1995) return 'A'
      if (y >= 2015) return 'B'
      return null
    },
    purity: (it, s) => {
      const y = it.year || 2000
      if (s === 'A') return y < 1980 ? 1.0 : 0.75
      if (s === 'B') return y >= 2020 ? 1.0 : 0.75
      return 0.7
    },
  },
  {
    id: 'idioma_esp_extranjero',
    shelves: ['movie', 'series', 'book', 'artist'],
    name: 'Idioma y origen',
    sideA: { label: 'en español', reason: 'En español y de raíz cercana' },
    sideB: { label: 'en otro idioma', reason: 'De producción internacional' },
    side: (it) => {
      const lang = it.originalLanguage
      const country = it.originCountry || []
      if (lang === 'es' || country.includes('ES')) return 'A'
      if (lang && lang !== 'es') return 'B'
      return null
    },
    purity: () => 1.0,
  },
  {
    id: 'exigencia_ligera_exigente',
    shelves: ['movie', 'series'],
    name: 'Nivel de exigencia',
    sideA: { label: 'ligera', reason: 'Fácil de seguir y ligera' },
    sideB: { label: 'exigente', reason: 'Exigente y con capas para pensar' },
    side: (it) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const ex = axes?.exigencia
      if (ex != null && ex <= 2) return 'A'
      if (ex != null && ex >= 4) return 'B'
      return null
    },
    purity: (it, s) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const ex = axes?.exigencia
      if (s === 'A') return ex === 1 ? 1.0 : 0.7
      if (s === 'B') return ex === 5 ? 1.0 : 0.7
      return 0.75
    },
  },

  // ==================== SOLO SERIES ====================
  {
    id: 'series_duracion_capitulo',
    shelves: ['series'],
    name: 'Duración de episodios',
    sideA: { label: 'capítulos cortos (≤ 30 min)', reason: 'Con capítulos cortos y directos' },
    sideB: { label: 'capítulos largos (≥ 45 min)', reason: 'Con capítulos largos y reposados' },
    side: (it) => {
      const d = it.durationMin
      if (!d) return null
      if (d <= 30) return 'A'
      if (d >= 45) return 'B'
      return null
    },
    purity: (it, s) => {
      const d = it.durationMin || 40
      if (s === 'A') return d <= 25 ? 1.0 : 0.7
      if (s === 'B') return d >= 55 ? 1.0 : 0.7
      return 0.8
    },
  },
  {
    id: 'series_compromiso_temporadas',
    shelves: ['series'],
    name: 'Compromiso de temporadas',
    sideA: { label: 'miniserie (1 temporada)', reason: 'Formato miniserie autoconclusiva' },
    sideB: { label: 'larga (5 o más temporadas)', reason: 'Una serie larga para acompañarte mucho tiempo' },
    side: (it) => {
      const s = it.seasons
      if (!s) return null
      if (s === 1) return 'A'
      if (s >= 5) return 'B'
      return null
    },
    purity: (it, s) => {
      const seasons = it.seasons || 1
      if (s === 'A') return 1.0
      if (s === 'B') return seasons >= 7 ? 1.0 : 0.75
      return 0.8
    },
  },

  // ==================== LIBROS ====================
  {
    id: 'libros_tipo_ficcion',
    shelves: ['book'],
    name: 'Tipo de libro',
    sideA: { label: 'ficción', reason: 'Obra de ficción' },
    sideB: { label: 'no ficción', reason: 'Ensayo y no ficción para aprender' },
    side: (it) => {
      if (hasGenre(it, 'ensayo', 'biografia', 'historia', 'filosofia', 'no ficcion', 'divulgacion')) return 'B'
      if (hasGenre(it, 'novela', 'ficcion', 'cuento', 'poesia', 'narrativa')) return 'A'
      return 'A' // Mayoría del catálogo de libros es narrativa
    },
    purity: () => 1.0,
  },
  {
    id: 'libros_extension_paginas',
    shelves: ['book'],
    name: 'Extensión de lectura',
    sideA: { label: 'corto (< 250 págs.)', reason: 'Una lectura breve y condensada' },
    sideB: { label: 'largo (> 450 págs.)', reason: 'Un libro extenso para sumergirte a fondo' },
    side: (it) => {
      const p = it.pages
      if (!p) return null
      if (p < 250) return 'A'
      if (p > 450) return 'B'
      return null
    },
    purity: (it, s) => {
      const p = it.pages || 300
      if (s === 'A') return p < 180 ? 1.0 : 0.7
      if (s === 'B') return p > 600 ? 1.0 : 0.7
      return 0.8
    },
  },
  {
    id: 'libros_epoca_clasico_actual',
    shelves: ['book'],
    name: 'Época del libro',
    sideA: { label: 'clásico (antes de 1950)', reason: 'Un clásico de la literatura universal' },
    sideB: { label: 'actual (2000 o después)', reason: 'Literatura actual del siglo XXI' },
    side: (it) => {
      const y = it.year
      if (!y) return null
      if (y < 1950) return 'A'
      if (y >= 2000) return 'B'
      return null
    },
    purity: (it, s) => {
      const y = it.year || 2000
      if (s === 'A') return y < 1900 ? 1.0 : 0.75
      if (s === 'B') return y >= 2015 ? 1.0 : 0.75
      return 0.8
    },
  },
  {
    id: 'libros_ritmo_trepidante_pausado',
    shelves: ['book'],
    name: 'Ritmo narrativo',
    sideA: { label: 'trepidante', reason: 'Ritmo trepidante que no puedes soltar' },
    sideB: { label: 'pausado', reason: 'Ritmo pausado y reflexivo' },
    side: (it) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const ritmo = axes?.ritmo
      if (ritmo != null && ritmo >= 4) return 'A'
      if (ritmo != null && ritmo <= 2) return 'B'
      if (hasGenre(it, 'thriller', 'misterio', 'policiaco', 'aventura')) return 'A'
      if (hasGenre(it, 'ensayo', 'poesia', 'filosofia', 'clasico')) return 'B'
      return null
    },
    purity: (it, s) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const r = axes?.ritmo
      if (s === 'A') return r === 5 ? 1.0 : 0.75
      if (s === 'B') return r === 1 ? 1.0 : 0.75
      return 0.8
    },
  },

  // ==================== JUEGOS DE MESA ====================
  {
    id: 'juegos_peso_reglas',
    shelves: ['boardgame'],
    name: 'Complejidad y peso',
    sideA: { label: 'ligero', reason: 'Fácil de explicar y jugar al momento' },
    sideB: { label: 'de pensar', reason: 'Estratégico y de reglas profundas' },
    side: (it) => {
      const w = it.weight
      const axes = (it as any).axes as Record<string, number> | undefined
      const peso = axes?.peso
      if (w != null) {
        if (w <= 2.2) return 'A'
        if (w >= 3.0) return 'B'
      }
      if (peso != null) {
        if (peso <= 2) return 'A'
        if (peso >= 4) return 'B'
      }
      return null
    },
    purity: (it, s) => {
      const w = it.weight
      if (w != null) {
        if (s === 'A') return w <= 1.5 ? 1.0 : 0.75
        if (s === 'B') return w >= 3.8 ? 1.0 : 0.75
      }
      return 0.85
    },
  },
  {
    id: 'juegos_modo_coop_competitivo',
    shelves: ['boardgame'],
    name: 'Modo de juego',
    sideA: { label: 'cooperativo', reason: 'Para colaborar juntos en el mismo equipo' },
    sideB: { label: 'competitivo', reason: 'Competitivo de rivalidad directa' },
    side: (it) => {
      const coop = it.cooperative ?? (it as any).coop
      if (coop === true) return 'A'
      if (coop === false) return 'B'
      const axes = (it as any).axes as Record<string, number> | undefined
      if (axes?.cooperacion != null && axes.cooperacion >= 4) return 'A'
      if (axes?.cooperacion != null && axes.cooperacion <= 2) return 'B'
      return 'B' // Por defecto los juegos son competitivos
    },
    purity: () => 1.0,
  },
  {
    id: 'juegos_ambiente_fiesta_estrategia',
    shelves: ['boardgame'],
    name: 'Ambiente de partida',
    sideA: { label: 'de fiesta y risas', reason: 'Ambiente festivo y risas aseguradas' },
    sideB: { label: 'de estrategia', reason: 'Ambiente concentrado y estratégico' },
    side: (it) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      if (axes?.risas != null && axes.risas >= 4) return 'A'
      if (hasGenre(it, 'party', 'humor', 'fiesta', 'familiar')) return 'A'
      if (hasGenre(it, 'estrategia', 'gestion de recursos', 'economico', 'wargame')) return 'B'
      if (axes?.confrontacion != null && axes.confrontacion >= 4) return 'B'
      return null
    },
    purity: (it, s) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      if (s === 'A') return (axes?.risas ?? 4) >= 5 ? 1.0 : 0.75
      return 0.85
    },
  },
  {
    id: 'juegos_grupo_jugadores',
    shelves: ['boardgame'],
    name: 'Tamaño del grupo',
    sideA: { label: 'para 2', reason: 'Perfecto para jugar en pareja a 2' },
    sideB: { label: 'para 5 o más', reason: 'Ideal para grupos grandes de 5 o más' },
    side: (it) => {
      const pl = it.players || ''
      if (pl === '2' || pl === '1-2' || pl.startsWith('2-2')) return 'A'
      if (pl.includes('5') || pl.includes('6') || pl.includes('7') || pl.includes('8')) return 'B'
      return null
    },
    purity: () => 1.0,
  },
  {
    id: 'juegos_duracion_tiempo',
    shelves: ['boardgame'],
    name: 'Duración de partida',
    sideA: { label: 'rápido (≤ 30 min)', reason: 'Partidas rápidas y dinámicas' },
    sideB: { label: 'largo (≥ 90 min)', reason: 'Partidas largas y envolventes' },
    side: (it) => {
      const d = it.durationMin
      if (!d) return null
      if (d <= 30) return 'A'
      if (d >= 90) return 'B'
      return null
    },
    purity: (it, s) => {
      const d = it.durationMin || 45
      if (s === 'A') return d <= 20 ? 1.0 : 0.7
      if (s === 'B') return d >= 120 ? 1.0 : 0.7
      return 0.8
    },
  },

  // ==================== ARTISTAS ====================
  {
    id: 'artistas_energia',
    shelves: ['artist'],
    name: 'Nivel de energía musical',
    sideA: { label: 'tranquilo', reason: 'Música tranquila y relajada' },
    sideB: { label: 'de energía', reason: 'Música con mucha energía y fuerza' },
    side: (it) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const en = axes?.energia
      if (en != null && en <= 2) return 'A'
      if (en != null && en >= 4) return 'B'
      if (hasGenre(it, 'ambient', 'folk', 'acustico', 'jazz', 'clasica')) return 'A'
      if (hasGenre(it, 'rock', 'metal', 'punk', 'dance', 'techno', 'electronica')) return 'B'
      return null
    },
    purity: (it, s) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const en = axes?.energia
      if (s === 'A') return en === 1 ? 1.0 : 0.75
      if (s === 'B') return en === 5 ? 1.0 : 0.75
      return 0.8
    },
  },
  {
    id: 'artistas_sonido_acustico_electronico',
    shelves: ['artist'],
    name: 'Tipo de sonido',
    sideA: { label: 'electrónico', reason: 'Con sonido electrónico y sintetizadores' },
    sideB: { label: 'acústico u orgánico', reason: 'Con instrumentos acústicos y sonido orgánico' },
    side: (it) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const org = axes?.organico
      if (org != null && org <= 2) return 'A'
      if (org != null && org >= 4) return 'B'
      if (hasGenre(it, 'electronic', 'synth', 'electro', 'dance', 'techno', 'house')) return 'A'
      if (hasGenre(it, 'acoustic', 'folk', 'rock', 'guitar', 'unplugged', 'cantautor')) return 'B'
      return null
    },
    purity: (it, s) => {
      const axes = (it as any).axes as Record<string, number> | undefined
      const org = axes?.organico
      if (s === 'A') return org === 1 ? 1.0 : 0.75
      if (s === 'B') return org === 5 ? 1.0 : 0.75
      return 0.85
    },
  },
  {
    id: 'artistas_epoca_pico',
    shelves: ['artist'],
    name: 'Época dorada',
    sideA: { label: 'clásico (antes de 1995)', reason: 'Clásicos dorados de décadas pasadas' },
    sideB: { label: 'actual (desde 2010)', reason: 'Artistas contemporáneos y actuales' },
    side: (it) => {
      const decs = (it as any).peakDecades as string[] | undefined
      if (decs && decs.length > 0) {
        const hasOld = decs.some((d) => ['1960s', '1970s', '1980s', '1990s'].includes(d))
        const hasNew = decs.some((d) => ['2010s', '2020s'].includes(d))
        if (hasOld && !hasNew) return 'A'
        if (hasNew && !hasOld) return 'B'
      }
      const y = it.year
      if (y) {
        if (y < 1995) return 'A'
        if (y >= 2010) return 'B'
      }
      return null
    },
    purity: () => 1.0,
  },
]

export function getDimensionsForShelf(shelf: ShelfType): Dimension[] {
  return DIMENSIONS.filter((d) => d.shelves.includes(shelf))
}


/**
 * Mapea las respuestas del cuestionario previo de Decidir a preferencias iniciales de dimensiones (T17 §B.2, §C.4).
 * Las respuestas previas fijan la dimensión con peso ±2 (cerrada de inicio).
 */
export function mapAnswersToPrefs(
  shelf: ShelfType,
  answers: Record<string, string | string[] | undefined>
): Record<string, number> {
  const prefs: Record<string, number> = {}
  const asStr = (v: unknown) => (typeof v === 'string' ? v : undefined)

  if (shelf === 'series') {
    const format = asStr(answers.format)
    if (format === 'mini') prefs['series_compromiso_temporadas'] = 2
    if (format === 'larga') prefs['series_compromiso_temporadas'] = -2
  }

  if (shelf === 'boardgame') {
    const players = asStr(answers.players)
    if (players === '2') prefs['juegos_grupo_jugadores'] = 2
    if (players === 'fiesta') prefs['juegos_grupo_jugadores'] = -2

    const time = asStr(answers.time)
    if (time === 'corta') prefs['juegos_duracion_tiempo'] = 2
    if (time === 'larga') prefs['juegos_duracion_tiempo'] = -2

    const mood = asStr(answers.mood)
    if (mood === 'risas') prefs['juegos_ambiente_fiesta_estrategia'] = 2
    if (mood === 'estrategia') prefs['juegos_ambiente_fiesta_estrategia'] = -2
    if (mood === 'coop') prefs['juegos_modo_coop_competitivo'] = 2
  }

  if (shelf === 'artist') {
    const era = asStr(answers.era)
    if (era === 'clasico') prefs['artistas_epoca_pico'] = 2
    if (era === 'actual') prefs['artistas_epoca_pico'] = -2

    const mood = asStr(answers.mood)
    if (mood === 'chill' || mood === 'foco') prefs['artistas_energia'] = 2
    if (mood === 'energia' || mood === 'fiesta') prefs['artistas_energia'] = -2
  }

  return prefs
}
