import { describe, it, expect, beforeEach } from 'vitest'
import { SHELVES, ACTIVE_SHELVES, type UserEntry } from '../types'
import { SHELF_ENABLED } from '../config'
import { useStore } from '../store/useStore'

describe('T28.0 — Interruptor de la estantería de canciones', () => {
  beforeEach(() => {
    useStore.getState().resetAll()
  })

  it('SHELVES incluye "song", pero ACTIVE_SHELVES respeta SHELF_ENABLED.song', () => {
    expect(SHELVES).toContain('song')
    if (SHELF_ENABLED.song) {
      expect(ACTIVE_SHELVES).toContain('song')
    } else {
      expect(ACTIVE_SHELVES).not.toContain('song')
    }
  })

  it('con el interruptor apagado, una entrada de canción del usuario sigue en su estado sin tocar', () => {
    const songId = 'song:bohemian-rhapsody-queen-1975'
    const songEntry: UserEntry = {
      itemId: songId,
      shelf: 'song',
      status: 'seen',
      stars: 5,
      comment: 'Una obra maestra',
      ranked: true,
      updatedAt: 1700000000,
    }

    // Guardar la entrada en el store
    useStore.setState((s) => ({
      entries: { ...s.entries, [songId]: songEntry },
      rankings: { ...s.rankings, song: [songId] },
    }))

    // Simular que el interruptor está apagado
    const originalSongEnabled = SHELF_ENABLED.song
    try {
      SHELF_ENABLED.song = false
      const activeShelvesWhenOff = SHELVES.filter((s) => SHELF_ENABLED[s])
      expect(activeShelvesWhenOff).not.toContain('song')

      // La entrada del usuario sigue exactamente intacta en el store
      const st = useStore.getState()
      expect(st.entries[songId]).toBeDefined()
      expect(st.entries[songId]?.status).toBe('seen')
      expect(st.entries[songId]?.stars).toBe(5)
      expect(st.entries[songId]?.comment).toBe('Una obra maestra')
      expect(st.entries[songId]?.ranked).toBe(true)
      expect(st.rankings.song).toContain(songId)
    } finally {
      SHELF_ENABLED.song = originalSongEnabled
    }
  })
})
