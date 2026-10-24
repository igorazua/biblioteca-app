// Preguntas del asistente «Decidir»: solo lo básico (ánimo + una práctica). Lo que más determina son los duelos orientadores.
import type { ShelfType } from '../types'

export interface Option { id: string; label: string; sub?: string }
export interface Question { id: string; q: string; options: Option[]; multi?: boolean; /** se salta si devuelve true con las respuestas dadas */ skipIf?: (a: Record<string, string | string[] | undefined>) => boolean }

const MOOD_AV: Question = {
  id: 'mood', q: '¿Qué te apetece?',
  options: [
    { id: 'accion', label: 'Acción' }, { id: 'romantica', label: 'Romántica' }, { id: 'profunda', label: 'Profunda' },
    { id: 'risas', label: 'Risas' }, { id: 'miedo', label: 'Miedo' }, { id: 'igual', label: 'Me da igual' },
  ],
}
const COMPANY: Question = {
  id: 'company', q: '¿Con quién?',
  options: [{ id: 'solo', label: 'Solo', sub: 'Plan para mí' }, { id: 'pareja', label: 'En pareja', sub: 'Plan de dos' }, { id: 'amigos', label: 'Con amigos', sub: 'Que nos riamos o vibremos' }],
}
const PLATFORMS: Question = { id: 'platforms', q: '¿Qué plataformas tenéis?', multi: true, options: [] } // las opciones salen de config.PLATFORMS

const SOURCE: Question = {
  id: 'source', q: '¿De tus guardados o de otras?',
  options: [
    { id: 'pendientes', label: 'De mis guardados', sub: 'Lo que ya tienes pendiente' },
    { id: 'todas', label: 'De todas', sub: 'Guardadas y nuevas' },
    { id: 'igual', label: 'Me da igual' },
  ],
}
const SOURCE_NEW: Question = {
  id: 'source', q: '¿De tus guardados o algo nuevo?',
  options: [
    { id: 'pendientes', label: 'De mis guardados', sub: 'Lo que ya tienes pendiente' },
    { id: 'nuevas', label: 'Nuevas', sub: 'Algo que aún no tienes' },
    { id: 'igual', label: 'Me da igual' },
  ],
}
const SEEN_OR_NEW: Question = {
  id: 'seen', q: '¿Algo que ya has visto o algo nuevo?',
  options: [
    { id: 'vista', label: 'Una que ya vi', sub: 'Para repetir' },
    { id: 'nueva', label: 'Nueva', sub: 'Que aún no he visto' },
  ],
}

export const QUESTIONS_BY_SHELF: Record<Exclude<ShelfType, 'book' | 'song'>, Question[]> = {
  // Pelis: vista o nueva → de guardados / todas / da igual → plataformas
  movie: [SEEN_OR_NEW, SOURCE, PLATFORMS],
  // Series: miniserie o larga → terminada o en emisión → guardados / nuevas / da igual
  series: [
    { id: 'format', q: '¿Miniserie o algo largo?', options: [{ id: 'mini', label: 'Miniserie', sub: '1-2 temporadas' }, { id: 'larga', label: 'Algo largo', sub: 'Para meses' }, { id: 'igual', label: 'Me da igual' }] },
    { id: 'airing', q: '¿Terminada o en emisión?', options: [{ id: 'terminada', label: 'Terminada', sub: 'Para verla del tirón' }, { id: 'emision', label: 'En emisión', sub: 'Para seguirla al día' }, { id: 'igual', label: 'Me da igual' }] },
    SOURCE_NEW,
  ],
  // Juegos de mesa: cuántos sois → tiempo → estilo → guardados o nuevos
  boardgame: [
    { id: 'players', q: '¿Cuántos sois?', options: [{ id: '2', label: 'En pareja (2)', sub: 'Duelo o cooperativo para dos' }, { id: 'grupo', label: '3-4 personas', sub: 'El grupo estándar' }, { id: 'fiesta', label: '5 o más', sub: 'Mesa llena / Party' }, { id: 'igual', label: 'Me da igual' }] },
    { id: 'time', q: '¿Cuánto tiempo tenéis?', options: [{ id: 'corta', label: 'Rápida', sub: '≤ 30 min' }, { id: 'media', label: 'Normal', sub: '~45-60 min' }, { id: 'larga', label: 'Sesión larga', sub: '≥ 90 min' }, { id: 'igual', label: 'Me da igual' }] },
    { id: 'mood', q: '¿Qué estilo os apetece?', options: [{ id: 'risas', label: 'Party / Risas' }, { id: 'estrategia', label: 'Estrategia / Euro' }, { id: 'coop', label: 'Cooperativo' }, { id: 'cartas', label: 'Cartas' }, { id: 'igual', label: 'Me da igual' }] },
    SOURCE_NEW,
  ],
  // Artistas: vibra → época → guardados o nuevos
  artist: [
    { id: 'mood', q: '¿Qué vibra buscas?', options: [{ id: 'foco', label: 'Concentración', sub: 'Para trabajar o leer' }, { id: 'energia', label: 'Energía', sub: 'Para motivarme o entrenar' }, { id: 'chill', label: 'Chill', sub: 'Para relajarme y desconectar' }, { id: 'fiesta', label: 'Arriba / Fiesta', sub: 'Buen rollo' }, { id: 'igual', label: 'Me da igual' }] },
    { id: 'era', q: '¿Clásicos o actualidad?', options: [{ id: 'clasico', label: 'Clásicos', sub: 'Los de siempre' }, { id: 'actual', label: 'Actual', sub: 'Sonidos recientes' }, { id: 'igual', label: 'Me da igual' }] },
    SOURCE_NEW,
  ],
}

// Libros: todo sobre la SIGUIENTE lectura (§14.1), nada de «cómo eres como lector».
export const BOOK_QUESTIONS: Question[] = [
  { id: 'difficulty', q: '¿Qué dificultad?', options: [{ id: 'ligera', label: 'Ligera', sub: 'Ágil y fácil de leer' }, { id: 'media', label: 'Media' }, { id: 'densa', label: 'Densa', sub: 'De fondo, aunque cueste' }, { id: 'igual', label: 'Me da igual' }] },
  { id: 'novelty', q: '¿Parecido a lo que te gusta o salir de tu zona?', options: [{ id: 'parecido', label: 'Parecido', sub: 'En la línea de tus favoritos' }, { id: 'nuevo', label: 'Salir de mi zona', sub: 'Algo distinto a lo de siempre' }, { id: 'igual', label: 'Me da igual' }] },
  SOURCE_NEW,
]

export const NONFICTION_GENRES = ['Ensayo', 'Historia', 'Biografía']
export const PACE_GENRES: Record<string, string[]> = {
  enganche: ['Thriller', 'Misterio', 'Crimen', 'Aventura', 'Fantasía', 'Ciencia ficción'],
  pausado: ['Clásico', 'Realismo mágico', 'Novela', 'Ensayo', 'Fábula'],
}

export const MOOD_GENRES: Record<ShelfType, Record<string, string[]>> = {
  movie: { accion: ['Acción', 'Aventura', 'Bélica'], romantica: ['Romance', 'Musical'], profunda: ['Drama', 'Histórica', 'Biografía'], risas: ['Comedia', 'Animación'], miedo: ['Terror', 'Thriller'] },
  series: { accion: ['Acción', 'Aventura', 'Crimen'], romantica: ['Romance'], profunda: ['Drama', 'Histórica', 'Misterio'], risas: ['Comedia', 'Animación'], miedo: ['Terror', 'Thriller', 'Misterio'] },
  book: { aventura: ['Aventura', 'Fantasía', 'Ciencia ficción'], emocion: ['Romance', 'Novela'], profunda: ['Clásico', 'Ensayo', 'Distopía', 'Realismo mágico', 'Historia'], intriga: ['Misterio', 'Thriller', 'Crimen'], ligera: ['Fábula'] },
  artist: {
    foco: ['Ambient', 'Clásica', 'Indie', 'Jazz', 'Instrumental', 'Post-rock'],
    energia: ['Rock', 'Hip hop', 'Metal', 'Electrónica', 'Punk'],
    chill: ['Soul', 'Folk', 'Acústico', 'R&B', 'Blues'],
    fiesta: ['Pop', 'Funk', 'Disco', 'Reggaeton', 'Dance'],
  },
  boardgame: {
    risas: ['Party', 'Familiar', 'Humor', 'Deducción'],
    estrategia: ['Eurogame', 'Estrategia', 'Gestión', 'Económico'],
    coop: ['Cooperativo', 'Aventura', 'Narrativo'],
    cartas: ['Cartas', 'Deckbuilding', 'Draft'],
  },
  song: {
    foco: ['Ambient', 'Clásica', 'Indie', 'Jazz', 'Instrumental', 'Post-rock'],
    energia: ['Rock', 'Hip hop', 'Metal', 'Electrónica', 'Punk'],
    chill: ['Soul', 'Folk', 'Acústico', 'R&B', 'Blues'],
    fiesta: ['Pop', 'Funk', 'Disco', 'Reggaeton', 'Dance'],
  },
}

export const COMPANY_GENRES: Record<string, string[]> = {
  solo: ['Drama', 'Thriller', 'Misterio', 'Ciencia ficción', 'Terror'],
  pareja: ['Romance', 'Comedia', 'Drama', 'Thriller'],
  amigos: ['Comedia', 'Acción', 'Aventura', 'Animación', 'Terror'],
}
