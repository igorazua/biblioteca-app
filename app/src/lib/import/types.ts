import type { ShelfType, Stars } from '../../types'

export interface ImportRow {
  type: ShelfType
  title: string
  year?: number
  creator?: string
  imdbId?: string
  isbn13?: string
  status: 'seen' | 'pending'
  stars?: Stars
  at?: number
}
