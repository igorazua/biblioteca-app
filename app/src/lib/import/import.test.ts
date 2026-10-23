import { describe, it, expect } from 'vitest'
import { parseLetterboxd } from './letterboxd'
import { parseImdb } from './imdb'
import { parseGoodreads } from './goodreads'
import { parseNetflix } from './netflix'
import { parseSpotifyHistory } from './spotify-history'
import { parseYouTubeMusic } from './youtube-music'
import { parseAppleMusic } from './apple-music'
import { parsePrimeVideo } from './prime-video'
import { parseKindle } from './kindle'
import { applyImportRows } from './apply'
import { buildLocalIndex, matchLocal } from './match'
import { items as seedItems } from '../../data/catalog'
import { strToU8, zipSync } from 'fflate'
import type { Item, ShelfType, UserEntry } from '../../types'

import letterboxdRatingsCsv from './__fixtures__/letterboxd_ratings.csv?raw'
import letterboxdWatchedCsv from './__fixtures__/letterboxd_watched.csv?raw'
import letterboxdWatchlistCsv from './__fixtures__/letterboxd_watchlist.csv?raw'
import imdbRatingsCsv from './__fixtures__/imdb_ratings.csv?raw'
import goodreadsCsv from './__fixtures__/goodreads.csv?raw'
import netflixCsv from './__fixtures__/netflix.csv?raw'
import spotifyJson from './__fixtures__/spotify_history.json?raw'
import ytMusicJson from './__fixtures__/youtube_music.json?raw'
import appleMusicCsv from './__fixtures__/apple_music.csv?raw'
import primeVideoCsv from './__fixtures__/prime_video.csv?raw'
import kindleCsv from './__fixtures__/kindle.csv?raw'

describe('Analizador Letterboxd', () => {
  it('procesa ratings, watched y watchlist correctamente', () => {
    const rows = parseLetterboxd({
      ratingsCsv: letterboxdRatingsCsv,
      watchedCsv: letterboxdWatchedCsv,
      watchlistCsv: letterboxdWatchlistCsv,
    })

    // El Padrino (en ratings y watched) debe tener estrellas 5 y status 'seen'
    const padrino = rows.find((r) => r.title === 'El Padrino')
    expect(padrino).toBeDefined()
    expect(padrino?.year).toBe(1972)
    expect(padrino?.status).toBe('seen')
    expect(padrino?.stars).toBe(5)

    // "Todo sobre mi madre, de Almodóvar" con comas dentro de comillas y rating 4.5 redondeado a 5
    const almodovar = rows.find((r) => r.title.includes('Almodóvar'))
    expect(almodovar).toBeDefined()
    expect(almodovar?.stars).toBe(5)

    // Dune (solo en watched) -> vista sin estrellas
    const dune = rows.find((r) => r.title === 'Dune')
    expect(dune).toBeDefined()
    expect(dune?.status).toBe('seen')
    expect(dune?.stars).toBeUndefined()

    // Challengers (en watchlist) -> pendiente sin estrellas
    const challengers = rows.find((r) => r.title === 'Challengers')
    expect(challengers).toBeDefined()
    expect(challengers?.status).toBe('pending')
    expect(challengers?.stars).toBeUndefined()
  })
})

describe('Analizador IMDb', () => {
  it('diferencia películas y series, extrae imdbId y calcula estrellas con ceil(nota/2)', () => {
    const rows = parseImdb(imdbRatingsCsv)

    // The Shawshank Redemption -> movie, imdbId tt0111161, nota 10 -> 5 estrellas
    const movie = rows.find((r) => r.imdbId === 'tt0111161')
    expect(movie).toBeDefined()
    expect(movie?.type).toBe('movie')
    expect(movie?.stars).toBe(5)

    // Breaking Bad -> tvSeries -> type 'series', nota 9 -> ceil(9/2) = 5 estrellas
    const series = rows.find((r) => r.imdbId === 'tt0903747')
    expect(series).toBeDefined()
    expect(series?.type).toBe('series')
    expect(series?.stars).toBe(5)

    // Movie, With Comma -> nota vacía -> sin estrellas
    const withComma = rows.find((r) => r.imdbId === 'tt1234567')
    expect(withComma).toBeDefined()
    expect(withComma?.title).toBe('Movie, With Comma')
    expect(withComma?.stars).toBeUndefined()
  })
})

describe('Analizador Goodreads', () => {
  it('limpia ISBN13 con ="...", detecta estanterías read/to-read y maneja notas', () => {
    const rows = parseGoodreads(goodreadsCsv)

    // Cien años de soledad: read -> seen, rating 5 -> 5 estrellas, ISBN13 limpio
    const book1 = rows.find((r) => r.title.includes('Cien años de soledad'))
    expect(book1).toBeDefined()
    expect(book1?.type).toBe('book')
    expect(book1?.creator).toBe('Gabriel García Márquez')
    expect(book1?.isbn13).toBe('9780307350411')
    expect(book1?.status).toBe('seen')
    expect(book1?.stars).toBe(5)

    // 1984: to-read -> pending, rating 0 -> sin estrellas
    const book2 = rows.find((r) => r.title === '1984')
    expect(book2).toBeDefined()
    expect(book2?.isbn13).toBe('9780451524935')
    expect(book2?.status).toBe('pending')
    expect(book2?.stars).toBeUndefined()
  })
})

describe('Analizador Netflix', () => {
  it('agrupa episodios en series (inglés y español) y clasifica películas', () => {
    const rows = parseNetflix(netflixCsv)

    // Stranger Things (2 episodios) debe dar UNA sola fila de tipo 'series'
    const stranger = rows.find((r) => r.title === 'Stranger Things')
    expect(stranger).toBeDefined()
    expect(stranger?.type).toBe('series')
    expect(stranger?.status).toBe('seen')
    expect(stranger?.stars).toBeUndefined()

    // La casa de papel (Parte 1: Episodio 1) -> series
    const lcdp = rows.find((r) => r.title === 'La casa de papel')
    expect(lcdp).toBeDefined()
    expect(lcdp?.type).toBe('series')

    // Chernobyl (Miniserie: Episodio 1) -> series
    const chernobyl = rows.find((r) => r.title === 'Chernobyl')
    expect(chernobyl).toBeDefined()
    expect(chernobyl?.type).toBe('series')

    // The Queen's Gambit (Miniseries: End Game) -> series
    const gambit = rows.find((r) => r.title === "The Queen's Gambit")
    expect(gambit).toBeDefined()
    expect(gambit?.type).toBe('series')

    // Roma y El irlandés -> películas
    const roma = rows.find((r) => r.title === 'Roma')
    expect(roma).toBeDefined()
    expect(roma?.type).toBe('movie')

    const irlandes = rows.find((r) => r.title.toLowerCase().includes('irland'))
    expect(irlandes).toBeDefined()
    expect(irlandes?.type).toBe('movie')
  })
})

describe('Reglas al crear entradas (regla «no pisar»)', () => {
  const emptyRankings: Record<ShelfType, string[]> = {
    movie: [],
    series: [],
    book: [],
    artist: [],
    boardgame: [],
  }

  it('no pisa una entrada que ya tenga estrellas', () => {
    const existing: Record<string, UserEntry> = {
      'movie:el-padrino-1972': {
        itemId: 'movie:el-padrino-1972',
        shelf: 'movie',
        status: 'seen',
        stars: 5,
        ranked: true,
        updatedAt: 1000,
      },
    }

    const matched = [
      {
        itemId: 'movie:el-padrino-1972',
        row: {
          type: 'movie' as const,
          title: 'El Padrino',
          year: 1972,
          status: 'seen' as const,
          stars: 4 as const, // import trae 4, pero local ya tenía 5
        },
      },
    ]

    const result = applyImportRows(existing, emptyRankings, matched, 'letterboxd')
    expect(result.skippedCount).toBe(1)
    expect(result.updatedCount).toBe(0)
    expect(result.createdCount).toBe(0)
    expect(result.entries['movie:el-padrino-1972'].stars).toBe(5)
  })

  it('actualiza una entrada existente si no tenía estrellas y el import sí', () => {
    const existing: Record<string, UserEntry> = {
      'movie:el-padrino-1972': {
        itemId: 'movie:el-padrino-1972',
        shelf: 'movie',
        status: 'seen',
        stars: undefined,
        ranked: false,
        updatedAt: 1000,
      },
    }

    const matched = [
      {
        itemId: 'movie:el-padrino-1972',
        row: {
          type: 'movie' as const,
          title: 'El Padrino',
          year: 1972,
          status: 'seen' as const,
          stars: 5 as const,
        },
      },
    ]

    const result = applyImportRows(existing, emptyRankings, matched, 'letterboxd')
    expect(result.updatedCount).toBe(1)
    expect(result.entries['movie:el-padrino-1972'].stars).toBe(5)
    expect(result.entries['movie:el-padrino-1972'].ranked).toBe(true)
    expect(result.entries['movie:el-padrino-1972'].provisional).toBe(true)
    expect(result.rankings.movie).toContain('movie:el-padrino-1972')
  })

  it('crea entradas nuevas con origin import:<source>', () => {
    const matched = [
      {
        itemId: 'book:cien-anos-de-soledad',
        row: {
          type: 'book' as const,
          title: 'Cien años de soledad',
          status: 'seen' as const,
          stars: 5 as const,
        },
      },
    ]

    const result = applyImportRows({}, emptyRankings, matched, 'goodreads')
    expect(result.createdCount).toBe(1)
    const entry = result.entries['book:cien-anos-de-soledad']
    expect(entry).toBeDefined()
    expect(entry.origin).toBe('import:goodreads')
    expect(entry.stars).toBe(5)
    expect(entry.ranked).toBe(true)
    expect(entry.provisional).toBe(true)
    expect(result.rankings.book).toContain('book:cien-anos-de-soledad')
  })
})

describe('Importador: exports reales de IMDb y Letterboxd', () => {
  it('IMDb: «TV Movie» es película, «TV Mini Series» es serie y los episodios y videojuegos no se importan', () => {
    const csv = [
      'Const,Your Rating,Date Rated,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors',
      'tt0000001,8,2024-01-02,A TV Movie,A TV Movie,,TV Movie,7,90,2001,Drama,10,2001-01-01,Jane Doe',
      'tt0000002,9,2024-01-02,Chernobyl,Chernobyl,,TV Mini Series,9.3,330,2019,Drama,10,2019-05-06,',
      'tt0000003,7,2024-01-02,Pilot,Pilot,,TV Episode,8,50,2008,Drama,10,2008-01-20,',
      'tt0000004,10,2024-01-02,Zelda,Zelda,,Video Game,9,0,2017,Adventure,10,2017-03-03,',
      'tt0000005,9,2024-01-02,Parasite,Gisaengchung,,Movie,8.5,132,2019,Drama,10,2019-05-30,"Bong Joon Ho"',
    ].join('\n')
    const rows = parseImdb(csv)
    expect(rows.map((r) => [r.title, r.type])).toEqual([
      ['A TV Movie', 'movie'],
      ['Chernobyl', 'series'],
      ['Parasite', 'movie'],
    ])
    expect(rows[2].originalTitle).toBe('Gisaengchung')
    expect(rows[2].creator).toBe('Bong Joon Ho')
  })

  it('IMDb: la watchlist (columna Position, sin notas) entra como pendiente', () => {
    const csv = [
      'Position,Const,Created,Modified,Description,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors',
      '1,tt15239678,2024-03-01,2024-03-01,,Dune: Part Two,Dune: Part Two,,Movie,8.5,166,2024,Sci-Fi,10,2024-03-01,Denis Villeneuve',
    ].join('\n')
    const [row] = parseImdb(csv)
    expect(row.status).toBe('pending')
    expect(row.stars).toBeUndefined()
  })

  it('Letterboxd: un watchlist.csv suelto entra como pendiente aunque no se parezca a ratings', () => {
    const rows = parseLetterboxd(letterboxdWatchlistCsv, 'watchlist.csv')
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    // sin nombre de archivo, por columnas: sin «Rating» → vistas
    expect(parseLetterboxd(letterboxdWatchedCsv)[0].status).toBe('seen')
    expect(parseLetterboxd(letterboxdRatingsCsv)[0].stars).toBe(5)
  })

  it('Letterboxd ZIP: ignora los CSV de las carpetas deleted/ y orphaned/', () => {
    const enc = (s: string) => strToU8(s)
    const zip = zipSync({
      'letterboxd-igor-2026/ratings.csv': enc(letterboxdRatingsCsv),
      'letterboxd-igor-2026/watchlist.csv': enc(letterboxdWatchlistCsv),
      'letterboxd-igor-2026/deleted/ratings.csv': enc('Date,Name,Year,Letterboxd URI,Rating\n2020-01-01,Borrada,2000,x,1'),
      'letterboxd-igor-2026/orphaned/watched.csv': enc('Date,Name,Year,Letterboxd URI\n2020-01-01,Huérfana,2000,x'),
    })
    const titles = parseLetterboxd(zip).map((r) => r.title)
    expect(titles).toContain('El Padrino')
    expect(titles).toContain('Challengers')
    expect(titles).not.toContain('Borrada')
    expect(titles).not.toContain('Huérfana')
  })

  it('casado local: el IMDb ID va por Wikidata a la obra en español aunque el título venga en inglés', () => {
    const it = (id: string, title: string, year: number, wikidataId?: string) =>
      ({ id, type: 'movie', title, year, creator: '', genres: [], synopsis: '', posterUrl: null, popularity: 50, wikidataId }) as Item
    const index = buildLocalIndex([
      it('movie:cadena-perpetua-1994', 'Cadena perpetua', 1994, 'Q172241'),
      it('movie:the-shawshank-redemption-1994', 'The Shawshank Redemption', 1994, 'Q172241'),
      it('movie:dune-2021', 'Dune', 2021, 'Q60834962'),
      it('movie:dune-1984', 'Dune', 1984, 'Q114819'),
    ])
    const row = (title: string, year?: number) => ({ type: 'movie' as const, title, year, status: 'seen' as const })
    expect(matchLocal(row('The Shawshank Redemption', 1994), index, 'Q172241')?.id).toBe('movie:cadena-perpetua-1994')
    // por título también gana la gemela en español
    expect(matchLocal(row('The Shawshank Redemption', 1994), index)?.id).toBe('movie:cadena-perpetua-1994')
    expect(matchLocal(row('Dune', 2021), index)?.id).toBe('movie:dune-2021')
    // mismo título sin año que desempate: no se adivina
    expect(matchLocal(row('Dune'), index)).toBeUndefined()
  })
})

describe('Casado local con el catálogo real', () => {
  it('un título en inglés de Letterboxd encuentra la obra que se muestra con el título de España', () => {
    const index = buildLocalIndex(seedItems)
    const hit = matchLocal({ type: 'movie', title: 'Back to the Future', year: 1985, status: 'seen' }, index)
    expect(hit?.title).toBe('Regreso al futuro')
    expect(hit?.originalTitle).toBe('Back to the Future')
  })
})

describe('Analizadores sin claves (T20.7)', () => {
  it('Spotify History procesa escuchas agrupadas por artista ponderando estrellas por minutos', () => {
    const rows = parseSpotifyHistory(spotifyJson)
    expect(rows.length).toBe(3)
    const rosalia = rows.find((r) => r.title === 'Rosalía')
    expect(rosalia).toBeDefined()
    expect(rosalia?.type).toBe('artist')
    expect(rosalia?.status).toBe('seen')
    expect(rosalia?.stars).toBe(5)

    const badBunny = rows.find((r) => r.title === 'Bad Bunny')
    expect(badBunny).toBeDefined()
    expect(badBunny?.type).toBe('artist')

    const ctangana = rows.find((r) => r.title === 'C. Tangana')
    expect(ctangana).toBeDefined()
  })

  it('YouTube Music Takeout extrae canales de artistas', () => {
    const rows = parseYouTubeMusic(ytMusicJson)
    expect(rows.length).toBe(2)
    const rosalia = rows.find((r) => r.title === 'Rosalía')
    expect(rosalia).toBeDefined()
    expect(rosalia?.type).toBe('artist')
    expect(rosalia?.status).toBe('seen')

    const queen = rows.find((r) => r.title === 'Queen')
    expect(queen).toBeDefined()
    expect(queen?.type).toBe('artist')
    expect(queen?.status).toBe('seen')
  })

  it('Apple Music CSV extrae artistas únicos con estado visto', () => {
    const rows = parseAppleMusic(appleMusicCsv)
    expect(rows.length).toBe(2)
    const beatles = rows.find((r) => r.title === 'The Beatles')
    expect(beatles).toBeDefined()
    expect(beatles?.type).toBe('artist')
    expect(beatles?.status).toBe('seen')
  })

  it('Prime Video CSV detecta series y películas', () => {
    const rows = parsePrimeVideo(primeVideoCsv)
    expect(rows.length).toBe(4)
    const theBoys = rows.find((r) => r.title === 'The Boys')
    expect(theBoys).toBeDefined()
    expect(theBoys?.type).toBe('series')
    expect(theBoys?.status).toBe('seen')

    const fallout = rows.find((r) => r.title === 'Fallout')
    expect(fallout).toBeDefined()
    expect(fallout?.type).toBe('series')

    const interstellar = rows.find((r) => r.title === 'Interstellar')
    expect(interstellar).toBeDefined()
    expect(interstellar?.type).toBe('movie')
    expect(interstellar?.status).toBe('seen')
  })

  it('Kindle CSV extrae libros leídos y autores', () => {
    const rows = parseKindle(kindleCsv)
    expect(rows.length).toBe(3)
    const cienAnos = rows.find((r) => r.title === 'Cien años de soledad')
    expect(cienAnos).toBeDefined()
    expect(cienAnos?.type).toBe('book')
    expect(cienAnos?.creator).toBe('Gabriel García Márquez')
    expect(cienAnos?.status).toBe('seen')

    const milNovecientos = rows.find((r) => r.title === '1984')
    expect(milNovecientos).toBeDefined()
    expect(milNovecientos?.creator).toBe('George Orwell')
  })
})
