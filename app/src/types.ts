export type ShelfType = 'movie' | 'series' | 'book' | 'artist' | 'boardgame'
export const SHELVES: ShelfType[] = ['movie', 'series', 'book', 'artist', 'boardgame']

export interface Item {
  id: string // slug estable: 'movie:el-hoyo-2019'
  type: ShelfType
  title: string
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
}

export type Depth = 'ligera' | 'media' | 'densa'
export type Status = 'seen' | 'pending' | 'dismissed'
export type Stars = 1 | 2 | 3 | 4 | 5

export interface UserEntry {
  itemId: string
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
}

export interface Friend {
  id: string
  name: string
  avatarColor: string
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
  birthYear?: number
  platforms: string[]
  reader?: ReaderProfile
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
