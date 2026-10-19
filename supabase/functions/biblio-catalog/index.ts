// supabase/functions/biblio-catalog/index.ts
// Función Edge del catálogo vivo sin TMDB
// Acciones: 'search' | 'resolve' | 'match'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const USER_AGENT = 'Biblioteca/0.1 ( contact@biblioteca-social.vercel.app )'

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

const GENRE_MAP_EN_ES: Record<string, string> = {
  'drama': 'Drama',
  'comedy': 'Comedia',
  'sci-fi': 'Ciencia ficción',
  'science-fiction': 'Ciencia ficción',
  'science fiction': 'Ciencia ficción',
  'crime': 'Crimen',
  'adventure': 'Aventura',
  'action': 'Acción',
  'animation': 'Animación',
  'biography': 'Biografía',
  'film-noir': 'Cine negro',
  'war': 'Bélica',
  'romance': 'Romance',
  'thriller': 'Thriller',
  'mystery': 'Misterio',
  'horror': 'Terror',
  'fantasy': 'Fantasía',
  'western': 'Western',
  'family': 'Familiar',
  'musical': 'Musical',
  'music': 'Música',
  'history': 'Historia',
  'documentary': 'Documental',
  'sport': 'Deporte',
}

function normalizeGenres(genres: string[] = []): string[] {
  const seen = new Set<string>()
  const res: string[] = []
  for (const g of genres) {
    const raw = (g || '').trim().toLowerCase()
    const mapped = GENRE_MAP_EN_ES[raw] || g
    if (mapped && !seen.has(mapped.toLowerCase())) {
      seen.add(mapped.toLowerCase())
      res.push(mapped)
    }
  }
  return res.length > 0 ? res : ['General']
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
    const supabase = getSupabaseAdmin()

    if (action === 'search') {
      const { type, q, lang = 'es' } = body
      if (!type || !q || typeof q !== 'string') {
        return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (type === 'boardgame') {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const results: Array<{
        ref: { source: 'wikidata' | 'openlibrary' | 'musicbrainz' | 'tvmaze'; id: string }
        title: string
        year: number | null
        creator: string | null
        posterUrl: string | null
        catalogId: string | null
      }> = []

      if (type === 'series') {
        // Para series: TVmaze prioritario (datos y pósteres CC BY-SA) + Wikidata de respaldo
        const tvUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`
        try {
          const tvRes = await fetch(tvUrl, { headers: { 'User-Agent': USER_AGENT } })
          if (tvRes.ok) {
            const hits = await tvRes.json()
            for (const hit of (hits || []).slice(0, 15)) {
              const show = hit.show
              if (!show) continue
              const year = show.premiered ? parseInt(show.premiered.slice(0, 4), 10) || null : null
              const poster = show.image?.medium || show.image?.original || null
              results.push({
                ref: { source: 'tvmaze', id: String(show.id) },
                title: show.name || 'Sin título',
                year,
                creator: show.network?.name || show.webChannel?.name || null,
                posterUrl: poster,
                catalogId: null,
              })
            }
          }
        } catch {
          // fallback si TVmaze falla
        }
      }

      if ((type === 'movie' || (type === 'series' && results.length < 5))) {
        // Búsqueda en Wikidata con wbsearchentities
        const wikiSearchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
          q
        )}&language=${lang}&uselang=${lang}&type=item&format=json&limit=15`

        try {
          const wikiRes = await fetch(wikiSearchUrl, { headers: { 'User-Agent': USER_AGENT } })
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json()
            const hits = (wikiData.search || []).filter((h: any) => {
              const desc = (h.description || '').toLowerCase()
              if (type === 'movie') {
                return desc.includes('film') || desc.includes('película') || desc.includes('movie') || desc.includes('cine')
              }
              if (type === 'series') {
                return desc.includes('series') || desc.includes('serie') || desc.includes('television') || desc.includes('televisión')
              }
              return true
            })

            for (const hit of hits.slice(0, 12)) {
              let year: number | null = null
              const m = (hit.description || '').match(/\b(19\d\d|20\d\d)\b/)
              if (m) year = parseInt(m[1], 10)

              results.push({
                ref: { source: 'wikidata', id: hit.id },
                title: hit.label || hit.id,
                year,
                creator: hit.description || null,
                posterUrl: null,
                catalogId: null,
              })
            }
          }
        } catch {
          // Si falla Wikidata
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
          headers: { 'User-Agent': USER_AGENT },
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
          const wikiIds = results.filter((r) => r.ref.source === 'wikidata').map((r) => r.ref.id)
          if (wikiIds.length > 0) {
            const { data: existing } = await supabase
              .from('biblio_catalog')
              .select('id, wikidata_id')
              .eq('type', type)
              .in('wikidata_id', wikiIds)
            if (existing && existing.length > 0) {
              const map = new Map(existing.map((e: any) => [e.wikidata_id, e.id]))
              for (const r of results) {
                if (map.has(r.ref.id)) {
                  r.catalogId = map.get(r.ref.id) || null
                }
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

        // 1. Buscar en biblio_catalog
        let existingItem: any = null
        if (source === 'wikidata') {
          const { data } = await supabase
            .from('biblio_catalog')
            .select('data')
            .eq('type', type)
            .eq('wikidata_id', refId)
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
        let wikidataId: string | null = null
        let imdbId: string | null = null
        let olWork: string | null = null
        let mbid: string | null = null

        if (source === 'wikidata') {
          wikidataId = refId
          const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${refId}.json`
          const res = await fetch(entityUrl, { headers: { 'User-Agent': USER_AGENT } })
          if (!res.ok) continue
          const d = await res.json()
          const entity = d.entities?.[refId]
          if (!entity) continue

          const title = entity.labels?.es?.value || entity.labels?.en?.value || Object.values(entity.labels || {})[0]?.value || 'Sin título'
          const synopsis = entity.descriptions?.es?.value || entity.descriptions?.en?.value || ''

          // P577 fecha de publicación
          let year = new Date().getFullYear()
          const p577 = entity.claims?.P577?.[0]?.mainsnak?.datavalue?.value?.time
          if (p577) {
            const m = p577.match(/([+-]?\d{4})/)
            if (m) year = parseInt(m[1], 10)
          }

          // P345 IMDb ID
          const p345 = entity.claims?.P345?.[0]?.mainsnak?.datavalue?.value
          if (p345) imdbId = p345

          // P2047 duración
          let durationMin: number | undefined = undefined
          const p2047 = entity.claims?.P2047?.[0]?.mainsnak?.datavalue?.value?.amount
          if (p2047) durationMin = parseInt(p2047, 10) || undefined

          // P3383 póster de película (Wikimedia Commons)
          let posterUrl: string | null = null
          const p3383 = entity.claims?.P3383?.[0]?.mainsnak?.datavalue?.value
          if (p3383) {
            posterUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p3383)}?width=400`
          }

          // Si es serie y no tiene póster, probar TVmaze por título
          if (type === 'series' && !posterUrl) {
            try {
              const tvSearch = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`, { headers: { 'User-Agent': USER_AGENT } })
              if (tvSearch.ok) {
                const tvData = await tvSearch.json()
                if (tvData.image?.medium) posterUrl = tvData.image.medium
              }
            } catch {
              // ignore
            }
          }

          newItem = {
            id: '',
            type,
            title,
            year,
            creator: entity.descriptions?.es?.value || 'Desconocido',
            durationMin,
            genres: ['General'],
            synopsis,
            posterUrl,
            popularity: 50,
            wikidataId,
            ...(imdbId ? { imdbId } : {}),
          }
        } else if (source === 'tvmaze') {
          const showUrl = `https://api.tvmaze.com/shows/${refId}`
          const res = await fetch(showUrl, { headers: { 'User-Agent': USER_AGENT } })
          if (!res.ok) continue
          const show = await res.json()

          const title = show.name || 'Sin título'
          let year = new Date().getFullYear()
          if (show.premiered) {
            year = parseInt(show.premiered.slice(0, 4), 10) || year
          }

          const rawSummary = show.summary ? show.summary.replace(/<[^>]*>?/gm, '') : ''
          const posterUrl = show.image?.medium || show.image?.original || null
          const genres = normalizeGenres(show.genres || [])
          imdbId = show.externals?.imdb || null

          newItem = {
            id: '',
            type: 'series',
            title,
            year,
            creator: show.network?.name || show.webChannel?.name || 'TV',
            durationMin: show.runtime || undefined,
            genres,
            synopsis: rawSummary,
            posterUrl,
            popularity: Math.min(100, Math.round((show.rating?.average || 5) * 10)),
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
            { headers: { 'User-Agent': USER_AGENT } }
          )
          if (!mbRes.ok) continue
          const mbData = await mbRes.json()

          const title = mbData.name || 'Sin nombre'
          const year = mbData['life-span']?.begin
            ? parseInt(mbData['life-span'].begin.slice(0, 4), 10) || 2000
            : 2000
          const genres = normalizeGenres(
            (mbData.genres || mbData.tags || []).slice(0, 3).map((g: any) => g.name)
          )

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

        // 3. Anti-duplicado con semilla
        const { data: candidates } = await supabase
          .from('biblio_catalog')
          .select('id, data, wikidata_id, ol_work, mbid')
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
          const updatedData = { ...matchedSeed.data, ...newItem, id: matchedSeed.id }
          await supabase
            .from('biblio_catalog')
            .update({
              wikidata_id: wikidataId ?? matchedSeed.wikidata_id,
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

        await supabase.from('biblio_catalog').insert({
          id: newItem.id,
          type,
          wikidata_id: wikidataId,
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
        // 1. imdbId -> SPARQL Wikidata por P345
        if (row.imdbId) {
          const cleanImdb = row.imdbId.trim()
          try {
            const sparql = `SELECT ?item ?itemLabel WHERE { ?item wdt:P345 "${cleanImdb}". SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". } } LIMIT 1`
            const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`
            const sparqlRes = await fetch(sparqlUrl, { headers: { 'User-Agent': USER_AGENT } })
            if (sparqlRes.ok) {
              const sparqlData = await sparqlRes.json()
              const binding = sparqlData.results?.bindings?.[0]
              if (binding?.item?.value) {
                const qid = binding.item.value.split('/').pop()
                if (qid) {
                  const resolveSub = await fetch(req.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: req.headers.get('Authorization') || '' },
                    body: JSON.stringify({
                      action: 'resolve',
                      refs: [{ type, source: 'wikidata', id: qid }],
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
          } catch {
            // SPARQL fallback
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

        // 3. Título normalizado y año
        const rowNorm = normTitle(row.title || '')
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

        // Candidatos externos con search
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
