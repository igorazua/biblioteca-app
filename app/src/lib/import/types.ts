import type { ShelfType, Stars } from '../../types'

export interface ImportRow {
  type: ShelfType
  title: string
  /** título original si el export lo trae aparte (IMDb «Original Title») */
  originalTitle?: string
  year?: number
  creator?: string
  imdbId?: string
  isbn13?: string
  status: 'seen' | 'pending'
  stars?: Stars
  at?: number
}
