export type ShelfType = 'movie' | 'series' | 'book' | 'artist' | 'boardgame'
export const SHELVES: ShelfType[] = ['movie', 'series', 'book', 'artist', 'boardgame']

export interface Item {
  id: string // slug estable: 'movie:el-hoyo-2019'
  type: ShelfType
  title: string
  /** título original cuando se muestra el de España («Back to the Future»); sirve para buscar y para imports */
  originalTitle?: string
  year: number
  creator: string
  durationMin?: number
  seasons?: number
  pages?: number
  players?: string // solo juegos de mesa: '2-4', '1-6'
  depth?: Depth // solo libros
  genres: string[]
  synopsis: string
  posterUrl: string | null
  platforms?: string[]
  popularity: number // 0-100
  tmdbId?: number
  olid?: string
  wikidataId?: string
  mbid?: string
  keywords?: string[]
  voteAvg?: number
  voteCount?: number
  originCountry?: string[]
  originalLanguage?: string
  collection?: string
  basedOn?: string
  awards?: string[]
  imageSrc?: string
  imageCredit?: string
  titles?: Record<string, string>
  popPct?: number // percentil dentro de su estantería (0-100)
  notoriety?: Record<string, number> | number // por país o recortado a número para el mercado activo
  trend?: Record<string, number> | number
  isCanon?: boolean
  schoolReading?: Record<string, boolean> | boolean
  pageviews?: Record<string, number> | number
  src?: Record<string, string> // procedencia de cada metadato
  conf?: Record<string, number> // nivel de confianza (0-1)
  providers?: Record<string, string[]>
  releasedIn?: string[]
  cert?: Record<string, string>
  wikiLangs?: number
  wikiLocal?: string[]
  readers?: number
  related?: string[]
  ongoing?: boolean
}

export type Depth = 'ligera' | 'media' | 'densa'
export type Status = 'seen' | 'pending' | 'dismissed'
export type Stars = 1 | 2 | 3 | 4 | 5

export interface UserEntry {
  itemId: string
  shelf?: ShelfType
  status: Status
  stars?: Stars
  comment?: string
  ranked: boolean
  provisional?: boolean // colocada solo por estrellas; Comparar la afina
  cmp?: number // nº de comparaciones en las que ha salido (Comparar prioriza las que menos llevan, §14.4)
  origin?: string // «de Igor»: quién te pasó la obra en una lista compartida
  dismissedAt?: number // fecha del último descarte (permite volver a aparecer según §7.7)
  reviewedAt?: number // fecha de la última revisión en limpieza de pendientes (§9)
  updatedAt: number
}

export interface FriendEntry {
  itemId: string
  status: 'seen' | 'pending'
  score?: number
  comment?: string
  at?: number // fecha determinista de la entrada (para recencia y avisos sociales)
}

export interface Friend {
  id: string
  name: string
  avatarColor: string
  avatarUrl?: string | null
  contact?: { whatsapp?: string; instagram?: string }
  entries: FriendEntry[]
}

export interface ListItem {
  itemId: string
  note?: string
}

export interface List {
  id: string
  title: string
  description?: string
  items: ListItem[]
  createdAt: number
}

export interface Profile {
  name: string
  avatarColor: string
  avatarUrl?: string | null
  birthYear?: number
  platforms: string[]
  reader?: ReaderProfile
  country?: string // ISO-3166 ('ES', 'MX'...)
  lang?: string // ISO-639-1 ('es', 'en'...)
}

export type Motivation = 'aventura' | 'intriga' | 'emocion' | 'ideas' | 'lenguaje' | 'historia'
export interface ReaderProfile {
  scores: Record<Motivation, number>
  depth: Depth
  at: number
}

export interface Settings {
  commentBoxInPairs: boolean
  /** Descubrir: abrir la hoja de valoración al guardar como vista (se puede quitar y reactivar en Perfil) */
  rateOnSwipe?: boolean
}

export interface ShelfTerms {
  plural: string
  singular: string
  seen: string
  seenFem: string
  stamp: string
  actionPast: string
  pronoun: string
  pronounCap: string
  verbPast: string
  seenPastPart: string
  verbPerfSingular: string
  verbPerfPlural: string
  pendingSingular: string
  pendingPlural: string
}

export const SHELF_LABEL: Record<ShelfType, ShelfTerms> = {
  movie: {
    plural: 'Pelis',
    singular: 'peli',
    seen: 'vistas',
    seenFem: 'vista',
    stamp: '¡VISTA!',
    actionPast: 'Vista',
    pronoun: 'la',
    pronounCap: 'La',
    verbPast: 'vio',
    seenPastPart: 'visto',
    verbPerfSingular: 'la ha visto',
    verbPerfPlural: 'la han visto',
    pendingSingular: 'la tiene pendiente',
    pendingPlural: 'la tienen pendiente',
  },
  series: {
    plural: 'Series',
    singular: 'serie',
    seen: 'vistas',
    seenFem: 'vista',
    stamp: '¡VISTA!',
    actionPast: 'Vista',
    pronoun: 'la',
    pronounCap: 'La',
    verbPast: 'vio',
    seenPastPart: 'visto',
    verbPerfSingular: 'la ha visto',
    verbPerfPlural: 'la han visto',
    pendingSingular: 'la tiene pendiente',
    pendingPlural: 'la tienen pendiente',
  },
  book: {
    plural: 'Libros',
    singular: 'libro',
    seen: 'leídos',
    seenFem: 'leído',
    stamp: '¡LEÍDO!',
    actionPast: 'Leído',
    pronoun: 'lo',
    pronounCap: 'Lo',
    verbPast: 'leyó',
    seenPastPart: 'leído',
    verbPerfSingular: 'lo ha leído',
    verbPerfPlural: 'lo han leído',
    pendingSingular: 'lo tiene pendiente',
    pendingPlural: 'lo tienen pendiente',
  },
  artist: {
    plural: 'Artistas',
    singular: 'artista',
    seen: 'escuchados',
    seenFem: 'escuchado',
    stamp: '¡ESCUCHADO!',
    actionPast: 'Escuchado',
    pronoun: 'lo',
    pronounCap: 'Lo',
    verbPast: 'escuchó',
    seenPastPart: 'escuchado',
    verbPerfSingular: 'lo ha escuchado',
    verbPerfPlural: 'lo han escuchado',
    pendingSingular: 'lo tiene pendiente',
    pendingPlural: 'lo tienen pendiente',
  },
  boardgame: {
    plural: 'Juegos de mesa',
    singular: 'juego',
    seen: 'jugados',
    seenFem: 'jugado',
    stamp: '¡JUGADO!',
    actionPast: 'Jugado',
    pronoun: 'lo',
    pronounCap: 'Lo',
    verbPast: 'jugó',
    seenPastPart: 'jugado',
    verbPerfSingular: 'lo ha jugado',
    verbPerfPlural: 'lo han jugado',
    pendingSingular: 'lo tiene pendiente',
    pendingPlural: 'lo tienen pendiente',
  },
}

export interface DeckLearnStats {
  shown: number
  seen: number
  up: number
  left: number
}

export interface DeckLearnShelf {
  byMacro: Record<string, DeckLearnStats>
  byDecade: Record<string, DeckLearnStats>
}

export type DeckLearn = Record<ShelfType, DeckLearnShelf>

