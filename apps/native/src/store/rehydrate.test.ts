// La rehidratación (skipHydration + `persist.rehydrate()`, que lanza `hydrateAll`) devuelve lo guardado con el mismo formato de la PWA.
import { describe, expect, it } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { isHydrated } from './hydrationFlags'
import { useStore } from './useStore'
import { useEvents } from './useEvents'

describe('rehidratación desde AsyncStorage', () => {
  it('lee entradas y rankings guardados con la clave y la versión de la PWA, y marca el store como hidratado', async () => {
    const id = 'movie:el-padrino-1972'
    const rankings = { movie: [id], series: [], book: [], artist: [], boardgame: [], song: [] }
    const entries = { [id]: { itemId: id, shelf: 'movie', status: 'seen', ranked: true, updatedAt: 1 } }
    await AsyncStorage.setItem('biblioteca-v1', JSON.stringify({ state: { entries, rankings, onboarded: true }, version: 5 }))
    await AsyncStorage.setItem('biblioteca-events-v1', JSON.stringify({ state: { events: [{ t: 1, v: 'x', sid: 's', type: 'nudge_shown', shelf: 'movie' }] }, version: 0 }))
    expect(isHydrated('store')).toBe(false)
    await useStore.persist.rehydrate()
    await useEvents.persist.rehydrate()
    expect(isHydrated('store')).toBe(true)
    expect(isHydrated('events')).toBe(true)
    expect(useStore.getState().onboarded).toBe(true)
    expect(useStore.getState().entries[id]?.ranked).toBe(true)
    expect(useStore.getState().rankings.movie).toEqual([id])
    expect(useStore.getState().rankings.song).toEqual([])
    expect(useEvents.getState().events).toHaveLength(1)
  })

  it('lo que se escribe después se guarda con la misma clave', async () => {
    useStore.getState().setProfile({ name: 'Igor' })
    await new Promise((r) => setTimeout(r, 20))
    const raw = JSON.parse((await AsyncStorage.getItem('biblioteca-v1')) as string)
    expect(raw.version).toBe(5)
    expect(raw.state.profile.name).toBe('Igor')
  })
})
