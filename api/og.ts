import LZString from 'lz-string'

const BOT_UA_REGEX = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|applebot|bingbot|googlebot/i

export default async function handler(req: any, res: any) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'app-rho-lac-65.vercel.app'
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const url = new URL(req.url, `${proto}://${host}`)
  const userAgent = req.headers['user-agent'] || ''

  // Si no es un bot o crawler, dejamos que Vercel sirva el index.html normal
  // o redirigimos (302) a la SPA
  // La reescritura de vercel.json pasa la ruta original en ?path= (req.url puede llegar ya como /api/og)
  const path = url.searchParams.get('path') || url.pathname
  if (!BOT_UA_REGEX.test(userAgent)) {
    return res.redirect(302, path.startsWith('/api/') ? '/' : path)
  }

  let title = 'Biblioteca'
  let description = 'Guarda, valora y comparte todo lo que te ha formado.'
  const siteUrl = `${proto}://${host}${path}`
  const iconUrl = `${proto}://${host}/icon-512.png`

  try {
    if (path.startsWith('/l/')) {
      const payload = path.slice(3)
      const json = LZString.decompressFromEncodedURIComponent(payload)
      if (json) {
        const list = JSON.parse(json)
        const author = list.a || 'Alguien'
        const count = Array.isArray(list.i) ? list.i.length : 0
        title = `${list.t || 'Lista de obras'} · ${author}`
        description = list.d || `Lista de ${count} obra${count !== 1 ? 's' : ''} en Biblioteca compartida por ${author}.`
      }
    } else if (path.startsWith('/p/')) {
      const payload = path.slice(3)
      const json = LZString.decompressFromEncodedURIComponent(payload)
      if (json) {
        const profile = JSON.parse(json)
        const name = profile.n || 'Alguien'
        title = `Biblioteca de ${name}`
        description = `Descubre los favoritos y lo que ha formado a ${name} en Biblioteca.`
      }
    } else if (path.startsWith('/unete/')) {
      title = 'Únete a Biblioteca'
      description = 'Te han invitado a compartir lo que te ha formado en Biblioteca.'
    }
  } catch {
    // Si falla la descompresión, se usan los valores por defecto
  }

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(siteUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(iconUrl)}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(iconUrl)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <a href="${escapeHtml(siteUrl)}">Abrir en Biblioteca</a>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(html)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
