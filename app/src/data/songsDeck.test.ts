import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Item, Profile } from '../types'
import { registerLoadedSongs, itemsOfType } from './catalog'
import { nextCards, newDeckSessionState } from '../lib/engine/deck'

// Descubrir se caía al elegir Canciones (Igor, 26/10): songs.json no trae géneros ni sinopsis
describe('mazo de Descubrir con canciones', () => {
  it('las canciones cargadas tienen géneros y sinopsis, y el mazo se construye sin errores', () => {
    const raw = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/songs.json'), 'utf8')) as Item[]
    registerLoadedSongs(raw)
    const songs = itemsOfType('song')
    expect(songs.length).toBe(raw.length)
    expect(songs.every((s) => Array.isArray(s.genres) && typeof s.synopsis === 'string')).toBe(true)

    const profile = { name: 'Tú', avatarColor: '#F5B544', platforms: [], country: 'ES', lang: 'es' } as Profile
    const cards = nextCards({
      shelf: 'song',
      items: songs,
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] },
      profile,
      friends: [],
      affinity: () => null,
      friendPct: () => null,
      session: newDeckSessionState(),
    }, [], 20)
    expect(cards.length).toBe(20)
  })
})
