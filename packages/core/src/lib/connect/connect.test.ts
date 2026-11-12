import { describe, it, expect, vi, afterEach } from 'vitest'
import { ConnectorUnavailable, ConnectorUserError } from './types'
import { anilistUsername } from './anilist'
import { olUsername } from './openlibrary'
import { goodreadsId, goodreads, letterboxd, letterboxdUsername, setConnectClient } from './server'
import { b64url, configureSpotify, finishSpotifyAuth, spotifyEnabled, startSpotifyAuth, type SpotifyEnv } from './spotify'
import { SERVICES, serviceById } from './services'

afterEach(() => {
  setConnectClient(null)
  configureSpotify(null)
})

describe('usuarios y direcciones de perfil', () => {
  it('acepta el usuario, la @ o la URL del perfil', () => {
    expect(anilistUsername(' @pepe ')).toBe('pepe')
    expect(anilistUsername('https://anilist.co/user/pepe/')).toBe('pepe')
    expect(olUsername('openlibrary.org/people/mekBot/')).toBe('mekBot')
    expect(letterboxdUsername('https://letterboxd.com/davidehrlich/films')).toBe('davidehrlich')
    expect(goodreadsId('https://www.goodreads.com/user/show/12345-nombre')).toBe('12345')
    expect(goodreadsId('12345')).toBe('12345')
    expect(goodreadsId('nombre')).toBeNull()
  })

  it('cada servicio con conector tiene la hoja de usuario o de archivo que su fila necesita', () => {
    for (const s of SERVICES) {
      if (s.method === 'username') expect(s.username && s.connector).toBeTruthy()
      if (s.method === 'file') expect(s.file).toBeTruthy()
    }
    expect(serviceById('spotify')?.file?.kind).toBe('spotify')
  })
})

describe('conectores de servidor', () => {
  it('sin cliente de Supabase dicen «muy pronto»', async () => {
    await expect(letterboxd.fetchRows({ service: 'letterboxd', handle: 'pepe' })).rejects.toBeInstanceOf(ConnectorUnavailable)
  })

  it('piden el usuario o la dirección antes de llamar', async () => {
    const invoke = vi.fn()
    setConnectClient({ functions: { invoke } })
    await expect((async () => letterboxd.fetchRows({ service: 'letterboxd', handle: '  ' }))()).rejects.toBeInstanceOf(ConnectorUserError)
    await expect((async () => goodreads.fetchRows({ service: 'goodreads', handle: 'sin-numero' }))()).rejects.toBeInstanceOf(ConnectorUserError)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('devuelve las filas del servidor y traduce un 4xx con mensaje propio', async () => {
    const rows = [{ type: 'movie', title: 'Alien', status: 'seen' }]
    const invoke = vi.fn().mockResolvedValueOnce({ data: { rows }, error: null })
    setConnectClient({ functions: { invoke } })
    expect(await letterboxd.fetchRows({ service: 'letterboxd', handle: 'pepe' })).toEqual(rows)
    expect(invoke).toHaveBeenCalledWith('biblio-connect', { body: { service: 'letterboxd', user: 'pepe' } })

    const ctx = { status: 422, json: async () => ({ error: 'Usuario inexistente' }) }
    setConnectClient({ functions: { invoke: async () => ({ data: null, error: { context: ctx } }) } })
    await expect(letterboxd.fetchRows({ service: 'letterboxd', handle: 'pepe' })).rejects.toThrow('Usuario inexistente')

    setConnectClient({ functions: { invoke: async () => ({ data: null, error: { context: { status: 404 } } }) } })
    await expect(letterboxd.fetchRows({ service: 'letterboxd', handle: 'pepe' })).rejects.toBeInstanceOf(ConnectorUnavailable)
  })
})

describe('Spotify (PKCE sin navegador)', () => {
  function makeEnv(over: Partial<SpotifyEnv> = {}) {
    const mem = new Map<string, string>()
    const opened: string[] = []
    const env: SpotifyEnv = {
      clientId: 'cid',
      redirectUri: () => 'biblioteca://conectar/spotify',
      tokens: { load: async () => null, save: async () => {}, clear: async () => {} },
      session: { set: (k, v) => void mem.set(k, v), take: (k) => { const v = mem.get(k) ?? null; mem.delete(k); return v } },
      randomBytes: (n) => new Uint8Array(n).map((_, i) => (i * 7 + 3) % 256),
      sha256: async () => new Uint8Array([251, 255, 0, 1]),
      openAuth: async (u) => void opened.push(u),
      ...over,
    }
    return { env, mem, opened }
  }

  it('b64url no usa + / ni relleno', () => {
    expect(b64url(new Uint8Array([251, 255]))).toBe('-_8')
    expect(b64url(new Uint8Array([0]))).toBe('AA')
    expect(b64url(new Uint8Array([102, 111, 111]))).toBe('Zm9v')
  })

  it('sin clientId queda apagado y no empieza', async () => {
    expect(spotifyEnabled()).toBe(false)
    configureSpotify(makeEnv({ clientId: '' }).env)
    expect(spotifyEnabled()).toBe(false)
    await expect(startSpotifyAuth()).rejects.toBeInstanceOf(ConnectorUnavailable)
  })

  it('arranca con S256, guarda verificador y estado, y rechaza un estado distinto', async () => {
    const { env, mem, opened } = makeEnv()
    configureSpotify(env)
    expect(spotifyEnabled()).toBe(true)
    await startSpotifyAuth()
    const url = opened[0]
    expect(url.startsWith('https://accounts.spotify.com/authorize?')).toBe(true)
    expect(url).toContain('code_challenge_method=S256')
    expect(url).toContain('code_challenge=-_8AAQ')
    expect(url).toContain('redirect_uri=biblioteca%3A%2F%2Fconectar%2Fspotify')
    expect(mem.size).toBe(2)
    expect(await finishSpotifyAuth('code', 'otro-estado')).toBe(false)
    expect(mem.size).toBe(0) // se consumen aunque falle
  })

  it('el estado del intento no se puede usar dos veces', async () => {
    const { env } = makeEnv()
    configureSpotify(env)
    await startSpotifyAuth()
    expect(await finishSpotifyAuth('code', null)).toBe(false)
    expect(await finishSpotifyAuth('code', null)).toBe(false)
  })
})
