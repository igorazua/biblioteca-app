// Catálogo de servicios de «Conectar» (docs/CONECTAR.md §2), agrupados por estantería.
import type { ConnectMethod, Connector } from './types'
import { anilist } from './anilist'
import { openLibrary } from './openlibrary'
import { goodreads, letterboxd } from './server'
import { spotify } from './spotify'

export type ServiceGroup = 'screen' | 'books' | 'music' | 'games' | 'anime'

export const GROUPS: { id: ServiceGroup; title: string }[] = [
  { id: 'screen', title: 'Pelis y series' },
  { id: 'books', title: 'Libros' },
  { id: 'music', title: 'Música' },
  { id: 'games', title: 'Juegos' },
  { id: 'anime', title: 'Anime' },
]

export const METHOD_LABEL: Record<ConnectMethod, string> = {
  oauth: 'Con tu cuenta',
  username: 'Con tu usuario',
  file: 'Con un archivo',
  soon: 'Próximamente',
}

/** Cómo se lee un archivo de este servicio (ver Connect.tsx / lib/import). */
export type FileKind = 'letterboxd' | 'imdb' | 'goodreads' | 'storygraph' | 'netflix'

export interface FileHelp {
  kind: FileKind
  extensions: string
  url?: string
  urlLabel?: string
  steps: string[]
}

export interface Service {
  id: string
  name: string
  /** subtítulo corto para la lista (editorial, sin etiquetas) */
  subtitle?: string
  /** color de marca del servicio */
  color: string
  group: ServiceGroup
  /** etiquetas de lo que trae */
  brings: string[]
  /** forma principal con la que se muestra la fila */
  method: ConnectMethod
  /** frase de la hoja: qué traemos */
  blurb: string
  connector?: Connector
  /** hoja «Con tu usuario» */
  username?: { label: string; placeholder: string; hint: string; cta?: string }
  /** servicios con usuario que además admiten archivo (el histórico completo) */
  file?: FileHelp
}

const NETFLIX_FILE: FileHelp = {
  kind: 'netflix',
  extensions: '.csv',
  url: 'https://www.netflix.com/viewingactivity',
  urlLabel: 'Abrir tu actividad en Netflix',
  steps: [
    'Entra en netflix.com/youraccount e inicia sesión.',
    'Elige tu perfil y abre «Actividad de visionado».',
    'Al final de la lista pulsa «Descargar todo» y sube NetflixViewingHistory.csv.',
  ],
}

export const SERVICES: Service[] = [
  // Pelis y series
  {
    id: 'letterboxd', name: 'Letterboxd', subtitle: 'Diario, películas vistas y notas', color: '#00A878', group: 'screen', brings: ['PELIS'], method: 'username',
    blurb: 'Traemos tu diario reciente con notas y fechas. Para todo el histórico, sube el archivo de exportación.',
    connector: letterboxd,
    username: { label: 'Tu usuario de Letterboxd', placeholder: 'usuario', hint: 'Lo ves en la dirección de tu perfil: letterboxd.com/usuario' },
    file: {
      kind: 'letterboxd', extensions: '.zip,.csv', url: 'https://letterboxd.com/settings/data/', urlLabel: 'Abrir Ajustes de Letterboxd',
      steps: [
        'Entra en letterboxd.com e inicia sesión.',
        'Ve a Ajustes → pestaña «Data» → «Export your data».',
        'Descarga el ZIP y súbelo aquí.',
      ],
    },
  },
  {
    id: 'imdb', name: 'IMDb', subtitle: 'Tus valoraciones y lista de pendientes', color: '#C99A06', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'file',
    blurb: 'Traemos tus valoraciones y tu lista de pendientes.',
    file: {
      kind: 'imdb', extensions: '.csv', url: 'https://www.imdb.com/list/ratings', urlLabel: 'Abrir tus valoraciones en IMDb',
      steps: [
        'Entra en imdb.com y abre «Your Ratings» o tu «Watchlist».',
        'Pulsa el menú de tres puntos o el botón «Export».',
        'Sube aquí el ratings.csv o watchlist.csv.',
      ],
    },
  },
  { id: 'netflix', name: 'Netflix', subtitle: 'Historial completo de visionado', color: '#B3202A', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'file', blurb: 'Traemos tu historial completo de visionado.', file: NETFLIX_FILE },
  { id: 'trakt', name: 'Trakt', subtitle: 'Historial y seguimiento de series y cine', color: '#C0392B', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'soon', blurb: 'Vistas con fecha, valoraciones y pendientes.' },
  { id: 'prime', name: 'Prime Video', subtitle: 'Historial de visionado en Prime', color: '#1F6FB2', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'soon', blurb: 'Solo con la solicitud de datos de Amazon.' },
  { id: 'disney', name: 'Disney+', subtitle: 'Historial de visionado en Disney', color: '#1F3D7A', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'soon', blurb: 'No ofrece forma de sacar el historial.' },
  { id: 'max', name: 'Max', subtitle: 'Historial de series y cine en Max', color: '#5B3FD1', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'soon', blurb: 'No ofrece forma de sacar el historial.' },
  { id: 'movistar', name: 'Movistar Plus+', subtitle: 'Historial de visionado en Movistar', color: '#1E88B8', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'soon', blurb: 'No ofrece forma de sacar el historial.' },
  { id: 'filmin', name: 'Filmin', subtitle: 'Cine y series vistas en Filmin', color: '#D64545', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'soon', blurb: 'No ofrece forma de sacar el historial.' },
  { id: 'skyshowtime', name: 'SkyShowtime', subtitle: 'Historial de visionado en SkyShowtime', color: '#4A5568', group: 'screen', brings: ['PELIS', 'SERIES'], method: 'soon', blurb: 'No ofrece forma de sacar el historial.' },
  // Libros
  {
    id: 'goodreads', name: 'Goodreads', subtitle: 'Libros leídos, notas y por leer', color: '#8A6A3B', group: 'books', brings: ['LIBROS'], method: 'username',
    blurb: 'Traemos tus estanterías «leídos» y «quiero leer». Para el histórico completo, sube el CSV.',
    connector: goodreads,
    username: { label: 'Dirección de tu perfil', placeholder: 'goodreads.com/user/show/12345-nombre', hint: 'Abre tu perfil en Goodreads y copia la dirección: lleva un número que necesitamos.' },
    file: {
      kind: 'goodreads', extensions: '.csv', url: 'https://www.goodreads.com/review/import', urlLabel: 'Abrir la exportación de Goodreads',
      steps: [
        'Entra en goodreads.com e inicia sesión.',
        'Ve a «My Books» → «Import and export».',
        'Pulsa «Export Library» y sube el CSV.',
      ],
    },
  },
  {
    id: 'storygraph', name: 'StoryGraph', subtitle: 'Libros leídos, pendientes y estrellas', color: '#2F6F73', group: 'books', brings: ['LIBROS'], method: 'file',
    blurb: 'Traemos tus libros leídos, pendientes y tus estrellas.',
    file: {
      kind: 'storygraph', extensions: '.csv', url: 'https://app.thestorygraph.com/user-export', urlLabel: 'Abrir la exportación de StoryGraph',
      steps: [
        'Entra en thestorygraph.com e inicia sesión.',
        'Abre tu perfil → «Manage Account» → «Export StoryGraph Library».',
        'Pulsa «Generate export», descarga el CSV y súbelo aquí.',
      ],
    },
  },
  {
    id: 'openlibrary', name: 'Open Library', subtitle: 'Registro público de lecturas', color: '#B5651D', group: 'books', brings: ['LIBROS'], method: 'username',
    blurb: 'Traemos tu registro de lectura público: leídos y quiero leer.', connector: openLibrary,
    username: { label: 'Tu usuario de Open Library', placeholder: 'usuario', hint: 'Lo ves en la dirección de tu perfil: openlibrary.org/people/usuario' },
  },
  { id: 'kindle', name: 'Kindle', subtitle: 'Historial de libros leídos en Amazon Kindle', color: '#2D3748', group: 'books', brings: ['LIBROS'], method: 'soon', blurb: 'Solo con la solicitud de datos de Amazon.' },
  // Música
  {
    id: 'spotify', name: 'Spotify', subtitle: 'Tus artistas más escuchados y biblioteca', color: '#1DB954', group: 'music', brings: ['ARTISTAS'], method: 'oauth',
    blurb: 'Traemos tus artistas más escuchados, los que sigues y los de tus álbumes guardados.', connector: spotify,
  },
  { id: 'lastfm', name: 'Last.fm', subtitle: 'Scrobbles y artistas más reproducidos', color: '#C3262E', group: 'music', brings: ['ARTISTAS'], method: 'soon', blurb: 'Tus artistas más escuchados por periodos.' },
  { id: 'ytmusic', name: 'YouTube Music', subtitle: 'Artistas escuchados en tu cuenta de Google', color: '#D43D3D', group: 'music', brings: ['ARTISTAS'], method: 'soon', blurb: 'Solo con Google Takeout.' },
  { id: 'applemusic', name: 'Apple Music', subtitle: 'Artistas guardados en tu biblioteca de Apple', color: '#E0475B', group: 'music', brings: ['ARTISTAS'], method: 'soon', blurb: 'Pide una cuenta de desarrollador de pago.' },
  // Juegos
  { id: 'bgg', name: 'BoardGameGeek', subtitle: 'Colección de juegos de mesa y partidas', color: '#7B4B94', group: 'games', brings: ['JUEGOS'], method: 'soon', blurb: 'Tu colección: lo tienes, lo jugaste, lo quieres.' },
  // Anime
  {
    id: 'anilist', name: 'AniList', subtitle: 'Tu lista de anime visto y pendiente', color: '#3B82C4', group: 'anime', brings: ['SERIES'], method: 'username',
    blurb: 'Traemos tu lista de anime: visto y pendiente.', connector: anilist,
    username: { label: 'Tu usuario de AniList', placeholder: 'usuario', hint: 'Lo ves en la dirección de tu perfil: anilist.co/user/usuario. Tu lista tiene que ser pública.' },
  },
  { id: 'mal', name: 'MyAnimeList', subtitle: 'Historial y seguimiento de anime', color: '#2E51A2', group: 'anime', brings: ['SERIES'], method: 'soon', blurb: 'Tu lista de anime: visto y pendiente.' },
]

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id)
