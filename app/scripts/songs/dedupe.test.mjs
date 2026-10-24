/**
 * dedupe.test.mjs — Test de riesgo de datos para deduplicación de canciones (T28 §28.3)
 *
 * 15 casos reales difíciles con el resultado esperado escrito a mano.
 */

import { describe, it, expect } from 'vitest'
import {
  deduplicateRecordings,
  pickCanonicalSong,
} from './dedupe.mjs'

describe('T28 §28.3 · Deduplicación y normalización de canciones', () => {
  it('1. Bohemian Rhapsody: original vs remaster 2011 de Queen → 1 canción', () => {
    const input = [
      {
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        artistMbid: '0383dadf-2a4e-4d10-a46a-e6e041da9180',
        workId: 'a1b2c3d4-queen-bohemian',
        firstReleaseDate: '1975-10-31',
        totalListenCount: 5000000,
      },
      {
        title: 'Bohemian Rhapsody - Remastered 2011',
        artist: 'Queen',
        artistMbid: '0383dadf-2a4e-4d10-a46a-e6e041da9180',
        workId: 'a1b2c3d4-queen-bohemian',
        firstReleaseDate: '2011-01-01',
        totalListenCount: 3000000,
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
    const canonical = pickCanonicalSong(groups[0])
    expect(canonical.year).toBe(1975)
    expect(canonical.id).toBe('song:bohemian-rhapsody-queen-1975')
  })

  it('2. Hurt: Nine Inch Nails vs Johnny Cash → 2 canciones distintas', () => {
    const input = [
      {
        title: 'Hurt',
        artist: 'Nine Inch Nails',
        artistMbid: 'b7ffd2af-418f-4be2-bdd1-22f8b48613da',
        workId: 'work-hurt-reznor',
        firstReleaseDate: '1994-03-08',
      },
      {
        title: 'Hurt',
        artist: 'Johnny Cash',
        artistMbid: '18d70a1a-7b2b-424f-b3a9-e0921a41852b',
        workId: 'work-hurt-reznor', // misma obra de composición, diferente intérprete!
        firstReleaseDate: '2002-11-05',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(2)
    const songs = groups.map(pickCanonicalSong)
    const nin = songs.find((s) => s.creator === 'Nine Inch Nails')
    const cash = songs.find((s) => s.creator === 'Johnny Cash')
    expect(nin && cash).toBeTruthy()
    expect(nin.year).toBe(1994)
    expect(cash.year).toBe(2002)
  })

  it('3. Hotel California: estudio 1976 vs directo Live on MTV 1994 (Eagles) → 1 canción', () => {
    const input = [
      {
        title: 'Hotel California',
        artist: 'Eagles',
        artistMbid: 'f46bd570-5768-4622-b862-ab5179743477',
        firstReleaseDate: '1976-12-08',
        totalListenCount: 4000000,
      },
      {
        title: 'Hotel California - Live On MTV, 1994',
        artist: 'Eagles',
        artistMbid: 'f46bd570-5768-4622-b862-ab5179743477',
        firstReleaseDate: '1994-11-08',
        totalListenCount: 800000,
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
    const canonical = pickCanonicalSong(groups[0])
    expect(canonical.year).toBe(1976)
    expect(canonical.title).toBe('Hotel California')
  })

  it('4. Yesterday: The Beatles vs Boyz II Men → 2 canciones distintas', () => {
    const input = [
      {
        title: 'Yesterday',
        artist: 'The Beatles',
        artistMbid: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d',
        firstReleaseDate: '1965-08-06',
      },
      {
        title: 'Yesterday',
        artist: 'Boyz II Men',
        artistMbid: 'boyz-ii-men-mbid',
        firstReleaseDate: '1994-08-30',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(2)
  })

  it('5. Creep: Radiohead vs TLC (mismo título, canciones completamente distintas) → 2 canciones', () => {
    const input = [
      {
        title: 'Creep',
        artist: 'Radiohead',
        artistMbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
        firstReleaseDate: '1992-09-21',
      },
      {
        title: 'Creep',
        artist: 'TLC',
        artistMbid: 'tlc-mbid',
        firstReleaseDate: '1994-10-31',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(2)
  })

  it('6. Despacito: Luis Fonsi feat. Daddy Yankee vs Remix con Justin Bieber → 1 canción', () => {
    const input = [
      {
        title: 'Despacito (feat. Daddy Yankee)',
        artist: 'Luis Fonsi',
        artistMbid: 'luis-fonsi-mbid',
        firstReleaseDate: '2017-01-13',
      },
      {
        title: 'Despacito - Remix',
        artist: 'Luis Fonsi feat. Daddy Yankee & Justin Bieber',
        artistMbid: 'luis-fonsi-mbid',
        firstReleaseDate: '2017-04-17',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
    const canonical = pickCanonicalSong(groups[0])
    expect(canonical.year).toBe(2017)
  })

  it('7. Corazón Partío: estudio vs en directo de Alejandro Sanz → 1 canción', () => {
    const input = [
      {
        title: 'Corazón Partío',
        artist: 'Alejandro Sanz',
        artistMbid: 'alejandro-sanz-mbid',
        firstReleaseDate: '1997-09-02',
      },
      {
        title: 'Corazón Partío (En Directo)',
        artist: 'Alejandro Sanz',
        artistMbid: 'alejandro-sanz-mbid',
        firstReleaseDate: '2001-11-20',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
    const canonical = pickCanonicalSong(groups[0])
    expect(canonical.year).toBe(1997)
  })

  it('8. Heroes: David Bowie 1977 vs 2017 Remaster → 1 canción', () => {
    const input = [
      {
        title: 'Heroes',
        artist: 'David Bowie',
        artistMbid: 'bowie-mbid',
        firstReleaseDate: '1977-09-23',
      },
      {
        title: 'Heroes - 2017 Remaster',
        artist: 'David Bowie',
        artistMbid: 'bowie-mbid',
        firstReleaseDate: '2017-09-29',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
    const canonical = pickCanonicalSong(groups[0])
    expect(canonical.year).toBe(1977)
  })

  it('9. All Along the Watchtower: Bob Dylan vs Jimi Hendrix → 2 canciones', () => {
    const input = [
      {
        title: 'All Along the Watchtower',
        artist: 'Bob Dylan',
        artistMbid: 'dylan-mbid',
        firstReleaseDate: '1967-12-27',
      },
      {
        title: 'All Along the Watchtower',
        artist: 'The Jimi Hendrix Experience',
        artistMbid: 'hendrix-mbid',
        firstReleaseDate: '1968-09-21',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(2)
  })

  it('10. Smells Like Teen Spirit: Nirvana 1991 vs 30th Anniversary Super Deluxe → 1 canción', () => {
    const input = [
      {
        title: 'Smells Like Teen Spirit',
        artist: 'Nirvana',
        artistMbid: 'nirvana-mbid',
        firstReleaseDate: '1991-09-10',
      },
      {
        title: 'Smells Like Teen Spirit (Nevermind 30th Anniversary Super Deluxe)',
        artist: 'Nirvana',
        artistMbid: 'nirvana-mbid',
        firstReleaseDate: '2021-11-12',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
    const canonical = pickCanonicalSong(groups[0])
    expect(canonical.year).toBe(1991)
  })

  it('11. Like a Prayer: Madonna original vs 12" Club Version → 1 canción', () => {
    const input = [
      {
        title: 'Like a Prayer',
        artist: 'Madonna',
        artistMbid: 'madonna-mbid',
        firstReleaseDate: '1989-03-03',
      },
      {
        title: 'Like a Prayer (12" Club Version)',
        artist: 'Madonna',
        artistMbid: 'madonna-mbid',
        firstReleaseDate: '1989-03-03',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
  })

  it('12. El Talismán: tildes y mayúsculas (El Talismán vs El talisman de Rosana) → 1 canción', () => {
    const input = [
      {
        title: 'El Talismán',
        artist: 'Rosana',
        artistMbid: 'rosana-mbid',
        firstReleaseDate: '1996-06-01',
      },
      {
        title: 'El talisman',
        artist: 'Rosana',
        artistMbid: 'rosana-mbid',
        firstReleaseDate: '1996-06-01',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
  })

  it('13. Hallelujah: Leonard Cohen vs Jeff Buckley → 2 canciones', () => {
    const input = [
      {
        title: 'Hallelujah',
        artist: 'Leonard Cohen',
        artistMbid: 'cohen-mbid',
        firstReleaseDate: '1984-12-01',
      },
      {
        title: 'Hallelujah',
        artist: 'Jeff Buckley',
        artistMbid: 'buckley-mbid',
        firstReleaseDate: '1994-08-23',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(2)
  })

  it('14. Billie Jean: Michael Jackson álbum vs Single Version → 1 canción', () => {
    const input = [
      {
        title: 'Billie Jean',
        artist: 'Michael Jackson',
        artistMbid: 'mj-mbid',
        firstReleaseDate: '1982-11-30',
      },
      {
        title: 'Billie Jean - Single Version',
        artist: 'Michael Jackson',
        artistMbid: 'mj-mbid',
        firstReleaseDate: '1983-01-02',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(1)
    const canonical = pickCanonicalSong(groups[0])
    expect(canonical.year).toBe(1982)
  })

  it('15. A tu vera: Lola Flores vs Rosalía → 2 canciones', () => {
    const input = [
      {
        title: 'A Tu Vera',
        artist: 'Lola Flores',
        artistMbid: 'lola-flores-mbid',
        firstReleaseDate: '1962-01-01',
      },
      {
        title: 'A tu vera',
        artist: 'Rosalía',
        artistMbid: 'rosalia-mbid',
        firstReleaseDate: '2019-03-22',
      },
    ]
    const groups = deduplicateRecordings(input)
    expect(groups.length).toBe(2)
  })
})
