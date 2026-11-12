import {
  parseAppleMusic,
  parseGoodreads,
  parseImdb,
  parseKindle,
  parseLetterboxd,
  parseNetflix,
  parsePrimeVideo,
  parseSpotifyHistory,
  parseStoryGraph,
  parseYouTubeMusic,
  type FileKind,
  type ImportRow,
} from '@biblioteca/core'

/** `true` si el archivo es un ZIP (se lee como bytes); el resto, como texto. Es lo que decide `rowsFromFile` de la PWA. */
export const isZipName = (name: string): boolean => name.toLowerCase().endsWith('.zip')

/**
 * rowsFromFile de Connect.tsx de la PWA, sin `File`: la app lee el archivo y entrega el contenido
 * (bytes para un ZIP, texto para el resto).
 */
export function rowsFromContent(kind: FileKind, name: string, content: string | Uint8Array): ImportRow[] {
  if (isZipName(name)) return parseLetterboxd(content as Uint8Array)
  const text = content as string
  switch (kind) {
    case 'letterboxd': return parseLetterboxd(text, name)
    case 'imdb': return parseImdb(text)
    case 'goodreads': return parseGoodreads(text)
    case 'storygraph': return parseStoryGraph(text)
    case 'netflix': return parseNetflix(text)
    case 'spotify': return parseSpotifyHistory(text)
    case 'ytmusic': return parseYouTubeMusic(text)
    case 'applemusic': return parseAppleMusic(text)
    case 'prime': return parsePrimeVideo(text)
    case 'kindle': return parseKindle(text)
  }
}
