import { userLang } from './userLang'
import type { Item } from '@biblioteca/core'
import { displayTitle, displayPoster } from '@biblioteca/core/src/lib/locale'

export interface ShareCardOptions {
  title: string
  subtitle?: string
  author: string
  items: Item[]
  accentColor?: string
  shareUrl?: string
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

const SANS = "'Archivo Variable', system-ui, sans-serif"
const DISPLAY = "'Archivo Variable', system-ui, sans-serif"

/** El canvas no espera a las fuentes web: se cargan antes de pintar (si falla, cae a system-ui). */
async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`800 extra-condensed 40px ${DISPLAY}`),
      document.fonts.load(`400 20px ${SANS}`),
      document.fonts.load(`600 20px ${SANS}`),
    ])
  } catch { /* sin fuentes: system-ui */ }
}

export async function generateShareCard({
  title,
  subtitle = 'Lo que más me marcó',
  author,
  items,
  accentColor = '#FF5A3C',
  shareUrl,
}: ShareCardOptions): Promise<Blob> {
  await ensureFonts()
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  // 1. Fondo oscuro cálido con degradado sutil
  const bgGrad = ctx.createRadialGradient(540, 400, 100, 540, 960, 1200)
  bgGrad.addColorStop(0, '#2A2620')
  bgGrad.addColorStop(0.6, '#1E1B17')
  bgGrad.addColorStop(1, '#0A0908')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, 1080, 1920)

  // Resplandor del color de acento
  const glow = ctx.createRadialGradient(200, 250, 0, 200, 250, 500)
  glow.addColorStop(0, `${accentColor}25`)
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 1080, 800)

  // 2. Cabecera
  // Pastilla de marca
  ctx.fillStyle = `${accentColor}33`
  ctx.beginPath()
  ctx.roundRect(80, 100, 240, 56, 28)
  ctx.fill()

  ctx.fillStyle = accentColor
  ctx.font = `800 extra-condensed 30px ${DISPLAY}`
  ctx.letterSpacing = '3px'
  ctx.fillText('BIBLIOTECA', 120, 136)

  // Subtítulo
  ctx.fillStyle = '#A39D92'
  ctx.font = `500 32px ${SANS}`
  ctx.letterSpacing = '0px'
  ctx.fillText(subtitle.toUpperCase(), 80, 220)

  // Título principal
  ctx.fillStyle = '#F4F3F1'
  ctx.font = `800 extra-condensed 96px ${DISPLAY}`
  ctx.fillText(title.toUpperCase(), 80, 300)

  // Autor
  ctx.fillStyle = accentColor
  ctx.font = `600 36px ${SANS}`
  ctx.fillText(`por ${author}`, 80, 360)

  // Línea divisoria
  ctx.strokeStyle = 'rgba(244, 243, 241, 0.12)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, 410)
  ctx.lineTo(1000, 410)
  ctx.stroke()

  // 3. Render de hasta 5 obras
  const listItems = items.slice(0, 5)
  const itemHeight = 230
  const startY = 460

  for (let i = 0; i < listItems.length; i++) {
    const it = listItems[i]
    const y = startY + i * itemHeight

    // Fondo sutil para cada elemento
    ctx.fillStyle = 'rgba(26, 24, 22, 0.7)'
    ctx.beginPath()
    ctx.roundRect(80, y, 920, 190, 24)
    ctx.fill()
    ctx.strokeStyle = 'rgba(244, 243, 241, 0.08)'
    ctx.stroke()

    // Número de ranking
    ctx.fillStyle = accentColor
    ctx.beginPath()
    ctx.arc(140, y + 95, 36, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#120F0A'
    ctx.font = `800 extra-condensed 52px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${i + 1}`, 140, y + 95)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    // Póster
    const posterX = 200
    const posterY = y + 20
    const posterW = 100
    const posterH = 150

    let drewPoster = false
    if (displayPoster(it, userLang())) {
      const img = await loadImage(displayPoster(it, userLang())!)
      if (img) {
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(posterX, posterY, posterW, posterH, 14)
        ctx.clip()
        ctx.drawImage(img, posterX, posterY, posterW, posterH)
        ctx.restore()
        drewPoster = true
      }
    }

    if (!drewPoster) {
      ctx.fillStyle = '#36312A'
      ctx.beginPath()
      ctx.roundRect(posterX, posterY, posterW, posterH, 14)
      ctx.fill()
      ctx.fillStyle = '#A39D92'
      ctx.font = `800 extra-condensed 48px ${DISPLAY}`
      ctx.fillText(displayTitle(it, userLang()).slice(0, 1), posterX + 38, posterY + 85)
    }

    // Título de la obra
    ctx.fillStyle = '#F4F3F1'
    ctx.font = `600 38px ${SANS}`
    const shown = displayTitle(it, userLang())
    const titleText = shown.length > 28 ? `${shown.slice(0, 27)}…` : shown
    ctx.fillText(titleText, 330, y + 80)

    // Creador y año
    ctx.fillStyle = '#A39D92'
    ctx.font = `400 28px ${SANS}`
    const meta = [it.creator, it.year].filter(Boolean).join(' · ')
    ctx.fillText(meta.length > 36 ? `${meta.slice(0, 35)}…` : meta, 330, y + 125)

    // Géneros
    if (it.genres?.length) {
      ctx.fillStyle = `${accentColor}CC`
      ctx.font = `500 22px ${SANS}`
      ctx.fillText(it.genres.slice(0, 3).join(' / '), 330, y + 160)
    }
  }

  // 4. Pie de página
  ctx.strokeStyle = 'rgba(244, 243, 241, 0.12)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, 1720)
  ctx.lineTo(1000, 1720)
  ctx.stroke()

  ctx.fillStyle = '#F4F3F1'
  ctx.font = `600 30px ${SANS}`
  ctx.fillText('«Todo lo que te ha formado, en tus estanterías»', 80, 1780)

  if (shareUrl) {
    ctx.fillStyle = accentColor
    ctx.font = `500 26px ${SANS}`
    ctx.fillText(shareUrl.replace(/^https?:\/\//, ''), 80, 1830)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png')
  })
}

export async function shareOrDownloadCard(blob: Blob, fileName = 'mi-biblioteca.png'): Promise<boolean> {
  const file = new File([blob], fileName, { type: 'image/png' })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Mi Biblioteca',
      })
      return true
    } catch {
      // Si el usuario cancela, no descargar
      return false
    }
  }

  // Descarga en navegador
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return true
}
