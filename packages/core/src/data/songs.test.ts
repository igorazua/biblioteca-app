import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SHELVES, ACTIVE_SHELVES, type Item } from '../types'
import { SHELF_ENABLED } from '../config'
import { getItem, itemsOfType } from './catalog'
import { setSongs } from './songs'

describe('T28.0 — Interruptor de la estantería de canciones', () => {
  it('SHELVES incluye "song", pero ACTIVE_SHELVES respeta SHELF_ENABLED.song', () => {
    expect(SHELVES).toContain('song')
    if (SHELF_ENABLED.song) {
      expect(ACTIVE_SHELVES).toContain('song')
    } else {
      expect(ACTIVE_SHELVES).not.toContain('song')
    }
  })

  // «con el interruptor apagado, una entrada de canción sigue en su estado» prueba el store de la app y sigue en app/src/data/songs.test.ts

  it('T28.4: carga dinámica de songs.json sólo si el interruptor está encendido y registro en catalog', () => {
    const original = SHELF_ENABLED.song
    try {
      SHELF_ENABLED.song = true
      const songsFile = resolve(__dirname, '../../../../app/public/data/songs.json')
      const loaded = setSongs(JSON.parse(readFileSync(songsFile, 'utf8')) as Item[])
      expect(loaded.length).toBeGreaterThan(4000)
      expect(itemsOfType('song').length).toBeGreaterThan(4000)
      const sample = loaded[0]
      expect(getItem(sample.id)).toBeDefined()
      expect(getItem(sample.id)?.title).toBe(sample.title)
    } finally {
      SHELF_ENABLED.song = original
    }
  })
})
