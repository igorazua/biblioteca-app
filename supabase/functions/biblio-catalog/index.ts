// supabase/functions/biblio-catalog/index.ts
// Función Edge del catálogo vivo (F-B1)
// Acciones: 'search' | 'resolve' | 'match'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// In-memory rate limiting: 60 req/min por IP
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimits.get(ip)
  if (!record || now > record.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (record.count >= 60) {
    return false
  }
  record.count++
  return true
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const normTitle = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const PLATFORM_MAP: Record<string, string> = {
  'netflix': 'Netflix',
  'amazon prime video': 'Prime Video',
  'prime video': 'Prime Video',
  'hbo max': 'HBO Max',
  'max': 'HBO Max',
  'disney plus': 'Disney+',
  'disney+': 'Disney+',
  'movistar plus+': 'Movistar+',
  'movistar+': 'Movistar+',
  'movistar': 'Movistar+',
  'filmin': 'Filmin',
  'filmin plus': 'Filmin',
  'apple tv plus': 'Apple TV+',
  'apple tv+': 'Apple TV+',
  'apple tv': 'Apple TV+',
}

function mapPlatforms(flat: Array<{ provider_name: string }> = []): string[] {
  const seen = new Set<string>()
  for (const p of flat) {
    const raw = (p.provider_name || '').toLowerCase().trim()
    const mapped = PLATFORM_MAP[raw]
    if (mapped) seen.add(mapped)
  }
  return Array.from(seen)
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  return createClient(supabaseUrl, serviceRoleKey)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('cf-connecting-ip') ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { action } = body
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY') || ''
    const MB_USER_AGENT =
      Deno.env.get('MB_USER_AGENT') ||
      'Biblioteca/0.1 ( contact@biblioteca-social.vercel.app )'

    const supabase = getSupabaseAdmin()

    if (action === 'search') {
      const { type, q, lang = 'es' } = body
      if (!type || !q || typeof q !== 'string') {
        return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // boardgame -> no disponible en vivo
      if (type === 'boardgame') {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const results: Array<{
        ref: { source: 'tmdb' | 'openlibrary' | 'musicbrainz'; id: string }
        title: string
        year: number | null
        creator: string | null
        posterUrl: string | null
        catalogId: string | null
      }> = []

      if (type === 'movie' || type === 'series') {
        if (!TMDB_API_KEY) {
          throw new Error('Falta TMDB_API_KEY en secrets')
        }
        const endpoint = type === 'movie' ? 'movie' : 'tv'
        const tmdbUrl = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          q
        )}&language=${lang === 'es' ? 'es-ES' : 'en-US'}&page=1`
        const tmdbRes = await fetch(tmdbUrl)
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json()
          const hits = (tmdbData.results || []).slice(0, 20)
          for (const hit of hits) {
            const title = type === 'movie' ? hit.title : hit.name
            const rawDate = type === 'movie' ? hit.release_date : hit.first_air_date
            const year = rawDate ? parseInt(rawDate.slice(0, 4), 10) || null : null
            const posterUrl = hit.poster_path
              ? `https://image.tmdb.org/t/p/w342${hit.poster_path}`
              : null

            results.push({
              ref: { source: 'tmdb', id: String(hit.id) },
              title: title || 'Sin título',
              year,
              creator: null,
              posterUrl,
              catalogId: null,
            })
          }
        }
      } else if (type === 'book') {
        const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
          q
        )}&limit=20&fields=key,title,author_name,first_publish_year,cover_i`
        const olRes = await fetch(olUrl)
        if (olRes.ok) {
          const olData = await olRes.json()
          for (const doc of olData.docs || []) {
            const workKey = doc.key?.replace('/works/', '') || doc.key
            const posterUrl = doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
              : null
            results.push({
              ref: { source: 'openlibrary', id: workKey },
              title: doc.title || 'Sin título',
              year: doc.first_publish_year || null,
              creator: doc.author_name?.[0] || null,
              posterUrl,
              catalogId: null,
            })
          }
        }
      } else if (type === 'artist') {
        const mbUrl = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(
          q
        )}&fmt=json&limit=20`
        const mbRes = await fetch(mbUrl, {
          headers: { 'User-Agent': MB_USER_AGENT },
        })
        if (mbRes.ok) {
          const mbData = await mbRes.json()
          for (const artist of mbData.artists || []) {
            results.push({
              ref: { source: 'musicbrainz', id: artist.id },
              title: artist.name || 'Sin nombre',
              year: artist['life-span']?.begin
                ? parseInt(artist['life-span'].begin.slice(0, 4), 10) || null
                : null,
              creator: artist.disambiguation || null,
              posterUrl: null,
              catalogId: null,
            })
          }
        }
      }

      // Comprobar si alguna ya existe en biblio_catalog
      if (results.length > 0) {
        if (type === 'movie' || type === 'series') {
          const tmdbIds = results.map((r) => parseInt(r.ref.id, 10)).filter(Boolean)
          const { data: existing } = await supabase
            .from('biblio_catalog')
            .select('id, tmdb_id')
            .eq('type', type)
            .in('tmdb_id', tmdbIds)
          if (existing && existing.length > 0) {
            const map = new Map(existing.map((e: any) => [String(e.tmdb_id), e.id]))
            for (const r of results) {
              if (map.has(r.ref.id)) {
                r.catalogId = map.get(r.ref.id) || null
              }
            }
          }
        } else if (type === 'book') {
          const olWorks = results.map((r) => r.ref.id)
          const { data: existing } = await supabase
            .from('biblio_catalog')
            .select('id, ol_work')
            .eq('type', 'book')
            .in('ol_work', olWorks)
          if (existing && existing.length > 0) {
            const map = new Map(existing.map((e: any) => [e.ol_work, e.id]))
            for (const r of results) {
              if (map.has(r.ref.id)) {
                r.catalogId = map.get(r.ref.id) || null
              }
            }
          }
        } else if (type === 'artist') {
          const mbids = results.map((r) => r.ref.id)
          const { data: existing } = await supabase
            .from('biblio_catalog')
            .select('id, mbid')
            .eq('type', 'artist')
            .in('mbid', mbids)
          if (existing && existing.length > 0) {
            const map = new Map(existing.map((e: any) => [e.mbid, e.id]))
            for (const r of results) {
              if (map.has(r.ref.id)) {
                r.catalogId = map.get(r.ref.id) || null
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ results: results.slice(0, 20) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'resolve') {
      const { refs } = body
      if (!Array.isArray(refs)) {
        return new Response(JSON.stringify({ error: 'refs debe ser array' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const items: any[] = []

      for (const ref of refs.slice(0, 50)) {
        const { type, source, id: refId } = ref

        // 1. Buscar en biblio_catalog por identificador externo
        let existingItem: any = null
        if (source === 'tmdb') {
          const tmdbId = parseInt(refId, 10)
          const { data } = await supabase
            .from('biblio_catalog')
            .select('data')
            .eq('type', type)
            .eq('tmdb_id', tmdbId)
            .maybeSingle()
          if (data) existingItem = data.data
        } else if (source === 'openlibrary') {
          const { data } = await supabase
            .from('biblio_catalog')
            .select('data')
            .eq('type', 'book')
            .eq('ol_work', refId)
            .maybeSingle()
          if (data) existingItem = data.data
        } else if (source === 'musicbrainz') {
          const { data } = await supabase
            .from('biblio_catalog')
            .select('data')
            .eq('type', 'artist')
            .eq('mbid', refId)
            .maybeSingle()
          if (data) existingItem = data.data
        }

        if (existingItem) {
          items.push(existingItem)
          continue
        }

        // 2. Pedir detalle a la fuente
        let newItem: any = null
        let tmdbId: number | null = null
        let imdbId: string | null = null
        let olWork: string | null = null
        let mbid: string | null = null

        if (source === 'tmdb') {
          const endpoint = type === 'movie' ? 'movie' : 'tv'
          const detailUrl = `https://api.themoviedb.org/3/${endpoint}/${refId}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=watch/providers,external_ids,credits`
          const res = await fetch(detailUrl)
          if (!res.ok) continue
          const d = await res.json()

          tmdbId = d.id
          imdbId = d.external_ids?.imdb_id || null
          const title = (type === 'movie' ? d.title : d.name) || 'Sin título'
          const rawDate = type === 'movie' ? d.release_date : d.first_air_date
          const year = rawDate ? parseInt(rawDate.slice(0, 4), 10) || new Date().getFullYear() : new Date().getFullYear()

          let creator = ''
          if (type === 'movie') {
            const director = d.credits?.crew?.find((c: any) => c.job === 'Director')
            creator = director?.name || (d.credits?.cast?.[0]?.name ?? '')
          } else {
            creator = d.created_by?.[0]?.name || (d.credits?.cast?.[0]?.name ?? '')
          }

          const genres = (d.genres || []).map((g: any) => g.name)
          const platforms = mapPlatforms(d['watch/providers']?.results?.ES?.flatrate)
          const posterUrl = d.poster_path ? `https://image.tmdb.org/t/p/w342${d.poster_path}` : null
          const popularity = Math.min(100, Math.round(d.popularity ? Math.min(100, d.popularity) : 50))

          newItem = {
            id: '',
            type,
            title,
            year,
            creator: creator || 'Desconocido',
            durationMin: type === 'movie' ? d.runtime || undefined : d.episode_run_time?.[0] || undefined,
            ...(type === 'series' && d.number_of_seasons ? { seasons: d.number_of_seasons } : {}),
            genres: genres.length > 0 ? genres : ['General'],
            synopsis: d.overview || '',
            posterUrl,
            platforms: platforms.length > 0 ? platforms : undefined,
            popularity,
            tmdbId,
            ...(imdbId ? { imdbId } : {}),
          }
        } else if (source === 'openlibrary') {
          olWork = refId.replace('/works/', '')
          const workRes = await fetch(`https://openlibrary.org/works/${olWork}.json`)
          if (!workRes.ok) continue
          const work = await workRes.json()

          let authorName = 'Desconocido'
          const authorKey = work.authors?.[0]?.author?.key
          if (authorKey) {
            const authorRes = await fetch(`https://openlibrary.org${authorKey}.json`)
            if (authorRes.ok) {
              const authorData = await authorRes.json()
              authorName = authorData.name || authorName
            }
          }

          let coverUrl: string | null = null
          if (work.covers?.[0]) {
            coverUrl = `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg`
          }

          const title = work.title || 'Sin título'
          let year = new Date().getFullYear()
          if (work.first_publish_date) {
            const m = work.first_publish_date.match(/\d{4}/)
            if (m) year = parseInt(m[0], 10)
          }

          const description =
            typeof work.description === 'string'
              ? work.description
              : work.description?.value || ''

          newItem = {
            id: '',
            type: 'book',
            title,
            year,
            creator: authorName,
            genres: ['Literatura'],
            synopsis: description,
            posterUrl: coverUrl,
            popularity: 50,
            olid: olWork,
          }
        } else if (source === 'musicbrainz') {
          mbid = refId
          const mbRes = await fetch(
            `https://musicbrainz.org/ws/2/artist/${mbid}?fmt=json&inc=genres+tags`,
            { headers: { 'User-Agent': MB_USER_AGENT } }
          )
          if (!mbRes.ok) continue
          const mbData = await mbRes.json()

          const title = mbData.name || 'Sin nombre'
          const year = mbData['life-span']?.begin
            ? parseInt(mbData['life-span'].begin.slice(0, 4), 10) || 2000
            : 2000
          const genres = (mbData.genres || mbData.tags || [])
            .slice(0, 3)
            .map((g: any) => g.name)

          newItem = {
            id: '',
            type: 'artist',
            title,
            year,
            creator: mbData.disambiguation || 'Música',
            genres: genres.length > 0 ? genres : ['Música'],
            synopsis: mbData.disambiguation || '',
            posterUrl: null,
            popularity: 50,
            mbid,
          }
        }

        if (!newItem) continue

        // 3. Anti-duplicado con semilla: buscar obra del mismo tipo sin id externo y título+año iguales
        const { data: candidates } = await supabase
          .from('biblio_catalog')
          .select('id, data, tmdb_id, ol_work, mbid')
          .eq('type', type)

        const normNew = normTitle(newItem.title)
        const matchedSeed = (candidates || []).find((c: any) => {
          const itemTitleNorm = normTitle(c.data?.title || '')
          const itemYear = c.data?.year
          const yearDiff = Math.abs((itemYear || 0) - newItem.year)
          const yearMatch = type === 'series' ? yearDiff <= 1 : yearDiff === 0
          return itemTitleNorm === normNew && yearMatch
        })

        if (matchedSeed) {
          // Completarle identificador en vez de crear otra
          const updatedData = { ...matchedSeed.data, ...newItem, id: matchedSeed.id }
          await supabase
            .from('biblio_catalog')
            .update({
              tmdb_id: tmdbId ?? matchedSeed.tmdb_id,
              imdb_id: imdbId ?? matchedSeed.imdb_id,
              ol_work: olWork ?? matchedSeed.ol_work,
              mbid: mbid ?? matchedSeed.mbid,
              data: updatedData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', matchedSeed.id)

          items.push(updatedData)
          continue
        }

        // 4. Crear ID: tipo:slug(título)-año
        let candidateSlug = `${type}:${slugify(newItem.title)}-${newItem.year}`
        const { data: collision } = await supabase
          .from('biblio_catalog')
          .select('id')
          .eq('id', candidateSlug)
          .maybeSingle()

        if (collision) {
          candidateSlug = `${candidateSlug}-${source[0]}${refId.replace(/[^a-zA-Z0-9]/g, '')}`
        }

        newItem.id = candidateSlug

        // Insertar en biblio_catalog
        await supabase.from('biblio_catalog').insert({
          id: newItem.id,
          type,
          tmdb_id: tmdbId,
          imdb_id: imdbId,
          ol_work: olWork,
          mbid: mbid,
          data: newItem,
          source,
          enriched_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        items.push(newItem)
      }

      return new Response(JSON.stringify({ items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'match') {
      const { type, rows } = body
      if (!Array.isArray(rows)) {
        return new Response(JSON.stringify({ error: 'rows debe ser array' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const matches: Array<{
        status: 'sure' | 'doubt' | 'none'
        item?: any
        candidates?: any[]
      }> = []

      for (const row of rows.slice(0, 50)) {
        // Reglas de 'sure':
        // 1. imdbId -> find en TMDB
        if (row.imdbId && TMDB_API_KEY) {
          const findUrl = `https://api.themoviedb.org/3/find/${row.imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
          const findRes = await fetch(findUrl)
          if (findRes.ok) {
            const findData = await findRes.json()
            const hit =
              type === 'movie'
                ? findData.movie_results?.[0]
                : findData.tv_results?.[0]
            if (hit) {
              // Resolver a item
              const resolveSub = await fetch(req.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: req.headers.get('Authorization') || '' },
                body: JSON.stringify({
                  action: 'resolve',
                  refs: [{ type, source: 'tmdb', id: String(hit.id) }],
                }),
              })
              if (resolveSub.ok) {
                const { items } = await resolveSub.json()
                if (items?.[0]) {
                  matches.push({ status: 'sure', item: items[0] })
                  continue
                }
              }
            }
          }
        }

        // 2. isbn13 -> Open Library /isbn/{isbn}.json
        if (row.isbn13) {
          const cleanIsbn = row.isbn13.replace(/[^0-9X]/gi, '')
          const isbnRes = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`)
          if (isbnRes.ok) {
            const isbnData = await isbnRes.json()
            const workKey = isbnData.works?.[0]?.key?.replace('/works/', '')
            if (workKey) {
              const resolveSub = await fetch(req.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: req.headers.get('Authorization') || '' },
                body: JSON.stringify({
                  action: 'resolve',
                  refs: [{ type: 'book', source: 'openlibrary', id: workKey }],
                }),
              })
              if (resolveSub.ok) {
                const { items } = await resolveSub.json()
                if (items?.[0]) {
                  matches.push({ status: 'sure', item: items[0] })
                  continue
                }
              }
            }
          }
        }

        // 3. Título normalizado igual y año igual (±1)
        const rowNorm = normTitle(row.title || '')
        // Buscar en biblio_catalog
        const { data: catMatches } = await supabase
          .from('biblio_catalog')
          .select('data')
          .eq('type', type)

        const sureMatches = (catMatches || []).filter((c: any) => {
          const tNorm = normTitle(c.data?.title || '')
          if (tNorm !== rowNorm) return false
          if (row.year && c.data?.year) {
            return Math.abs(c.data.year - row.year) <= (type === 'series' ? 1 : 0)
          }
          return true
        })

        if (sureMatches.length === 1) {
          matches.push({ status: 'sure', item: sureMatches[0].data })
          continue
        }

        // Si no está seguro en local, buscar candidatos externos
        const searchSub = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: req.headers.get('Authorization') || '' },
          body: JSON.stringify({ action: 'search', type, q: row.title }),
        })

        if (searchSub.ok) {
          const { results } = await searchSub.json()
          const exact = (results || []).filter((r: any) => {
            const rNorm = normTitle(r.title)
            const yearMatch =
              !row.year || !r.year || Math.abs(r.year - row.year) <= (type === 'series' ? 1 : 0)
            return rNorm === rowNorm && yearMatch
          })

          if (exact.length === 1) {
            // Unico candidato exacto -> resolve y seguro
            const resolveSub = await fetch(req.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: req.headers.get('Authorization') || '' },
              body: JSON.stringify({
                action: 'resolve',
                refs: [{ type, source: exact[0].ref.source, id: exact[0].ref.id }],
              }),
            })
            if (resolveSub.ok) {
              const { items } = await resolveSub.json()
              if (items?.[0]) {
                matches.push({ status: 'sure', item: items[0] })
                continue
              }
            }
          } else if (results && results.length > 0) {
            matches.push({
              status: 'doubt',
              candidates: results.slice(0, 3),
            })
            continue
          }
        }

        matches.push({ status: 'none' })
      }

      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Acción desconocida: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
