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

export const SHELF_LABEL: Record<ShelfType, { plural: string; singular: string; seen: string; seenFem: string; stamp: string }> = {
  movie: { plural: 'Pelis', singular: 'peli', seen: 'vistas', seenFem: 'vista', stamp: '¡VISTA!' },
  series: { plural: 'Series', singular: 'serie', seen: 'vistas', seenFem: 'vista', stamp: '¡VISTA!' },
  book: { plural: 'Libros', singular: 'libro', seen: 'leídos', seenFem: 'leído', stamp: '¡LEÍDO!' },
  artist: { plural: 'Artistas', singular: 'artista', seen: 'escuchados', seenFem: 'escuchado', stamp: '¡ESCUCHADO!' },
  boardgame: { plural: 'Juegos de mesa', singular: 'juego', seen: 'jugados', seenFem: 'jugado', stamp: '¡JUGADO!' },
}
