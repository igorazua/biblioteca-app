// supabase/functions/biblio-connect/index.ts
// Función Edge de «Conectar»: lee perfiles públicos que no se pueden pedir desde el navegador (RSS sin CORS)
// y los devuelve ya convertidos a filas de importación (ImportRow[]).
// Uso: GET/POST ?service=letterboxd|goodreads&user=…   (también acepta { service, user } en el cuerpo)
// Pendiente (docs/CONECTAR.md §4.4): lastfm | trakt | bgg | mal, con sus claves en los secretos de la función.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const USER_AGENT = 'Biblioteca/0.1 ( contact@biblioteca-social.vercel.app )'

interface ImportRow {
  type: 'movie' | 'series' | 'book' | 'artist' | 'boardgame'
  title: string
  originalTitle?: string
  year?: number
  creator?: string
  isbn13?: string
  status: 'seen' | 'pending'
  stars?: 1 | 2 | 3 | 4 | 5
  at?: number
}

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// Límite sencillo en memoria: 30 peticiones por minuto y IP
const rateLimits = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const r = rateLimits.get(ip)
  if (!r || now > r.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (r.count >= 30) return false
  r.count++
  return true
}

class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()

/** Texto de la primera etiqueta con ese nombre dentro de un bloque XML (admite prefijos como letterboxd:). */
function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name.replace(':', '\\:')}[^>]*>([\\s\\S]*?)</${name.replace(':', '\\:')}>`))
  const v = m ? decode(m[1]) : undefined
  return v ? v : undefined
}

const items = (xml: string) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1])

const toStars = (n: number): 1 | 2 | 3 | 4 | 5 | undefined =>
  n >= 0.5 ? (Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5) : undefined

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml' } })
  return { status: res.status, text: res.ok ? await res.text() : '' }
}

async function letterboxd(user: string): Promise<ImportRow[]> {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(user)) throw new UserError('Ese usuario de Letterboxd no es válido.')
  const { status, text } = await fetchText(`https://letterboxd.com/${user}/rss/`)
  if (status === 404) throw new UserError('No encontramos ese usuario en Letterboxd.', 404)
  if (!text) throw new Error(`Letterboxd ${status}`)
  const seen = new Set<string>()
  const rows: ImportRow[] = []
  for (const it of items(text)) {
    const title = tag(it, 'letterboxd:filmTitle') // las listas del RSS no lo traen: se saltan
    if (!title) continue
    const year = parseInt(tag(it, 'letterboxd:filmYear') ?? '', 10) || undefined
    const key = `${title}|${year ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    const watched = tag(it, 'letterboxd:watchedDate')
    const at = watched ? Date.parse(watched) : NaN
    rows.push({
      type: 'movie',
      title,
      year,
      status: 'seen',
      stars: toStars(parseFloat(tag(it, 'letterboxd:memberRating') ?? '0')),
      at: Number.isNaN(at) ? undefined : at,
    })
  }
  return rows
}

async function goodreadsShelf(id: string, shelf: 'read' | 'to-read', status: 'seen' | 'pending'): Promise<ImportRow[]> {
  const rows: ImportRow[] = []
  for (let page = 1; page <= 5; page++) {
    const { status: http, text } = await fetchText(
      `https://www.goodreads.com/review/list_rss/${id}?shelf=${shelf}&per_page=200&page=${page}`,
    )
    if (http === 404) throw new UserError('No encontramos ese perfil de Goodreads, o sus estanterías son privadas.', 404)
    if (!text) throw new Error(`Goodreads ${http}`)
    const list = items(text)
    for (const it of list) {
      const title = tag(it, 'title')
      if (!title) continue
      const isbn = (tag(it, 'isbn13') ?? tag(it, 'isbn') ?? '').replace(/[^0-9X]/gi, '')
      const when = tag(it, 'user_read_at') ?? tag(it, 'user_date_added')
      const at = when ? Date.parse(when) : NaN
      rows.push({
        type: 'book',
        title,
        creator: tag(it, 'author_name'),
        year: parseInt(tag(it, 'book_published') ?? '', 10) || undefined,
        isbn13: isbn.length === 13 ? isbn : undefined,
        status,
        stars: status === 'seen' ? toStars(parseInt(tag(it, 'user_rating') ?? '0', 10)) : undefined,
        at: Number.isNaN(at) ? undefined : at,
      })
    }
    if (list.length < 200) break
  }
  return rows
}

async function goodreads(id: string): Promise<ImportRow[]> {
  if (!/^\d{1,12}$/.test(id)) throw new UserError('Necesitamos el número de tu perfil de Goodreads.')
  const [read, want] = await Promise.all([goodreadsShelf(id, 'read', 'seen'), goodreadsShelf(id, 'to-read', 'pending')])
  return [...read, ...want]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous'
  if (!checkRateLimit(ip)) return json({ error: 'Demasiadas peticiones, espera un minuto.' }, 429)

  try {
    const url = new URL(req.url)
    let service = url.searchParams.get('service')
    let user = url.searchParams.get('user')
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      service = service ?? body.service
      user = user ?? body.user
    }
    if (!service || !user) return json({ error: 'Faltan service o user' }, 400)
    user = user.trim()

    if (service === 'letterboxd') return json({ rows: await letterboxd(user) })
    if (service === 'goodreads') return json({ rows: await goodreads(user) })
    return json({ error: 'Servicio no disponible todavía' }, 400)
  } catch (e) {
    if (e instanceof UserError) return json({ error: e.message }, e.status)
    console.error('biblio-connect:', e)
    return json({ error: 'No hemos podido leer ese perfil ahora mismo.' }, 502)
  }
})
