// Preguntas del asistente «Decidir»: solo lo básico. Lo que más determina son los duelos orientadores.
// Flujo (Igor, 27/10): primero de dónde sale (una que ya conoces / de tus guardados / nueva) y luego lo práctico.
// Cada respuesta abre su camino: con «una que ya vi» no se pregunta por guardados, y si de donde sale hay muy pocas
// (≤ TINY_POOL) no se filtra más, que los duelos eligen entre ellas.
import type { ShelfType } from '../types'

type A = Record<string, string | string[] | undefined>
/** Lo que tiene el usuario en la estantería: decide qué preguntas tienen sentido. */
export interface QCtx { seen: number; pending: number }
/** De qué obras sacar las portadas del fondo de la tarjeta de una opción. */
export type OptionArt = 'seen' | 'pending' | 'new'
export interface Option { id: string; label: string; sub?: string; art?: OptionArt }
export interface Question { id: string; q: string; options: Option[]; multi?: boolean; /** se salta si devuelve true con las respuestas dadas */ skipIf?: (a: A, ctx: QCtx) => boolean }

const TINY_POOL = 6
/** De donde quiere sacarla hay tan pocas que filtrar más solo la dejaría sin ninguna. */
const tinyPool = (a: A, c: QCtx) => (a.seen === 'vista' && c.seen <= TINY_POOL) || (a.source === 'pendientes' && c.pending <= TINY_POOL)
const withSkip = (q: Question, skip: (a: A, c: QCtx) => boolean): Question => ({ ...q, skipIf: (a, c) => skip(a, c) || Boolean(q.skipIf?.(a, c)) })
const filter = (q: Question) => withSkip(q, tinyPool)

const SEEN_TEXT: Record<Exclude<ShelfType, 'song'>, { q: string; seen: string; seenSub: string; fresh: string; freshSub: string }> = {
  movie: { q: '¿Repetir una que ya viste o algo nuevo?', seen: 'Una que ya vi', seenSub: 'Para volver a verla', fresh: 'Algo nuevo', freshSub: 'Que aún no he visto' },
  series: { q: '¿Volver a una que ya viste o algo nuevo?', seen: 'Una que ya vi', seenSub: 'Para volver a verla', fresh: 'Algo nuevo', freshSub: 'Que aún no he visto' },
  book: { q: '¿Releer uno o algo nuevo?', seen: 'Releer uno', seenSub: 'De los que ya leí', fresh: 'Uno nuevo', freshSub: 'Que aún no he leído' },
  boardgame: { q: '¿Uno que ya conocéis o uno nuevo?', seen: 'Uno que ya hemos jugado', seenSub: 'Sin explicar reglas', fresh: 'Uno nuevo', freshSub: 'Para estrenar' },
  artist: { q: '¿Alguien que ya escuchas o descubrir?', seen: 'Uno que ya escucho', seenSub: 'Sobre seguro', fresh: 'Descubrir', freshSub: 'Alguien nuevo para mí' },
}
const seenOrNew = (s: Exclude<ShelfType, 'song'>): Question => ({
  id: 'seen',
  q: SEEN_TEXT[s].q,
  options: [
    { id: 'vista', label: SEEN_TEXT[s].seen, sub: SEEN_TEXT[s].seenSub, art: 'seen' },
    { id: 'nueva', label: SEEN_TEXT[s].fresh, sub: SEEN_TEXT[s].freshSub, art: 'new' },
  ],
  // sin ninguna vista no hay nada que repetir
  skipIf: (_a, c) => c.seen === 0,
})

// Principio (Igor, 27/10): se pregunta solo lo que los duelos no pueden aprender y descansa en datos reales
// (de dónde sale, con quién, cuánto tiempo, cuántos sois, plataformas). El gusto lo sacan los duelos.
const COMPANY: Question = filter({
  id: 'company', q: '¿Con quién?',
  options: [
    { id: 'solo', label: 'Yo solo', sub: 'Plan para mí' },
    { id: 'pareja', label: 'En pareja', sub: 'Plan de dos' },
    { id: 'amigos', label: 'Con amigos', sub: 'Para pasarlo bien' },
    { id: 'ninos', label: 'Con niños', sub: 'Animación y familiar' },
    { id: 'igual', label: 'Me da igual' },
  ],
})
const PLATFORMS: Question = filter({ id: 'platforms', q: '¿Qué plataformas tenéis?', multi: true, options: [] }) // las opciones salen de config.PLATFORMS

// Solo si busca algo nuevo y tiene guardados: con «una que ya vi» ya se sabe de dónde sale
const SOURCE: Question = {
  id: 'source', q: '¿De tus guardados o algo nuevo?',
  options: [
    { id: 'pendientes', label: 'De mis guardados', sub: 'Lo que ya tienes pendiente', art: 'pending' },
    { id: 'nuevas', label: 'Algo que no tengo', sub: 'Ni visto ni guardado', art: 'new' },
    { id: 'igual', label: 'Me da igual' },
  ],
  skipIf: (a, c) => a.seen === 'vista' || c.pending === 0,
}

export const QUESTIONS_BY_SHELF: Record<Exclude<ShelfType, 'book' | 'song'>, Question[]> = {
  // Pelis: ya vista o nueva → guardados → con quién → cuánto tiempo → plataformas
  movie: [
    seenOrNew('movie'),
    SOURCE,
    COMPANY,
    filter({ id: 'time', q: '¿Cuánto tiempo tenéis?', options: [{ id: 'corta', label: 'Poco', sub: 'Menos de 1 h 40' }, { id: 'media', label: 'Lo normal', sub: 'Hasta 2 h 15' }, { id: 'igual', label: 'Me da igual' }] }),
    PLATFORMS,
  ],
  // Series: ya vista o nueva → guardados → miniserie o larga → capítulos → plataformas.
  // Sin «¿terminada o en emisión?»: casi nunca decide y alargaba el camino.
  series: [
    seenOrNew('series'),
    SOURCE,
    filter({ id: 'format', q: '¿Miniserie o algo largo?', options: [{ id: 'mini', label: 'Miniserie', sub: '1 o 2 temporadas' }, { id: 'larga', label: 'Algo largo', sub: 'Para semanas' }, { id: 'igual', label: 'Me da igual' }], skipIf: (a) => a.seen === 'vista' }),
    filter({ id: 'episode', q: '¿Capítulos cortos o largos?', options: [{ id: 'corto', label: 'Cortos', sub: 'Media hora o menos' }, { id: 'largo', label: 'Largos', sub: 'Una hora' }, { id: 'igual', label: 'Me da igual' }], skipIf: (a) => a.seen === 'vista' }),
    PLATFORMS,
  ],
  // Juegos de mesa: ya jugado o nuevo → guardados → cuántos sois → tiempo → estilo
  boardgame: [
    seenOrNew('boardgame'),
    SOURCE,
    filter({ id: 'players', q: '¿Cuántos sois?', options: [{ id: '2', label: 'Dos', sub: 'En pareja' }, { id: 'grupo', label: '3 o 4', sub: 'El grupo de siempre' }, { id: 'fiesta', label: '5 o más', sub: 'Mesa llena' }, { id: 'igual', label: 'Me da igual' }] }),
    filter({ id: 'time', q: '¿Cuánto tiempo tenéis?', options: [{ id: 'corta', label: 'Poco', sub: 'Media hora o menos' }, { id: 'media', label: 'Una hora', sub: 'Entre 45 y 60 minutos' }, { id: 'larga', label: 'Toda la tarde', sub: 'Hora y media o más' }, { id: 'igual', label: 'Me da igual' }] }),
    // el estilo lo aprenderían los duelos, pero se dice en un toque y «cooperativo» es un sí o un no
    filter({ id: 'mood', q: '¿Qué estilo os apetece?', options: [{ id: 'risas', label: 'Risas', sub: 'Party y de grupo' }, { id: 'estrategia', label: 'Estrategia', sub: 'Para pensar' }, { id: 'coop', label: 'Cooperativo', sub: 'Todos contra el juego' }, { id: 'cartas', label: 'Cartas', sub: 'Mazos y draft' }, { id: 'igual', label: 'Me da igual' }] }),
  ],
  // Artistas: ya lo escucho o descubrir → guardados → vibra → (si es nuevo) época
  artist: [
    seenOrNew('artist'),
    SOURCE,
    filter({ id: 'mood', q: '¿Qué vibra buscas?', options: [{ id: 'foco', label: 'Concentración', sub: 'Para trabajar o leer' }, { id: 'energia', label: 'Energía', sub: 'Para moverme' }, { id: 'chill', label: 'Chill', sub: 'Para desconectar' }, { id: 'fiesta', label: 'Fiesta', sub: 'Buen rollo' }, { id: 'igual', label: 'Me da igual' }] }),
    filter({ id: 'era', q: '¿Clásicos o actualidad?', options: [{ id: 'clasico', label: 'Clásicos', sub: 'Los de siempre' }, { id: 'actual', label: 'Actual', sub: 'Sonidos recientes' }, { id: 'igual', label: 'Me da igual' }], skipIf: (a) => a.seen === 'vista' }),
  ],
}

// Libros: todo sobre la SIGUIENTE lectura (§14.1). Sin «dificultad»: en el catálogo no es un dato, sale de una regla
// por páginas y géneros; y «parecido o salir de tu zona» lo resuelven los duelos. Ficción o no y la extensión sí son datos.
export const BOOK_QUESTIONS: Question[] = [
  seenOrNew('book'),
  SOURCE,
  filter({ id: 'kind', q: '¿Ficción o no ficción?', options: [{ id: 'ficcion', label: 'Ficción', sub: 'Novela y cuentos' }, { id: 'noficcion', label: 'No ficción', sub: 'Ensayo, historia, divulgación' }, { id: 'igual', label: 'Me da igual' }], skipIf: (a) => a.seen === 'vista' }),
  filter({ id: 'length', q: '¿Largo o corto?', options: [{ id: 'corta', label: 'Corto', sub: 'Menos de 250 páginas' }, { id: 'media', label: 'Normal', sub: 'Hasta 450 páginas' }, { id: 'igual', label: 'Me da igual' }] }),
]

export const NONFICTION_GENRES = ['Ensayo', 'Historia', 'Biografía', 'Filosofía', 'Divulgación', 'Ciencia']
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
