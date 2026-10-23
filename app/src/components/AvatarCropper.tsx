// app/src/components/AvatarCropper.tsx
// Encuadre de la foto de perfil: círculo fijo, la foto se mueve con el dedo (o el ratón) y se acerca o aleja
// con la barra, con dos dedos o con la rueda. Devuelve un WebP cuadrado de 512 px con lo que se ve en el círculo.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Portal } from './ui'
import { Button } from './Button'

const VIEW = 260 // diámetro del círculo en pantalla
const OUT = 512 // lado del WebP resultante
const MAX_ZOOM = 4

interface Props {
  file: File
  onCancel: () => void
  onDone: (blob: Blob) => void
}

export function AvatarCropper({ file, onCancel, onDone }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 }) // centro de la foto respecto al centro del círculo, en px de pantalla
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const im = new Image()
    im.onload = () => setImg(im)
    im.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const w = img?.naturalWidth ?? 1
  const h = img?.naturalHeight ?? 1
  const scale = (VIEW / Math.min(w, h)) * zoom // px de pantalla por px de la foto

  // la foto siempre cubre el círculo entero
  const clamp = (o: { x: number; y: number }, z = zoom) => {
    const s = (VIEW / Math.min(w, h)) * z
    const mx = Math.max(0, (w * s - VIEW) / 2)
    const my = Math.max(0, (h * s - VIEW) / 2)
    return { x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) }
  }
  const setZoomClamped = (z: number) => {
    const nz = Math.max(1, Math.min(MAX_ZOOM, z))
    setZoom(nz)
    setOff((o) => clamp(o, nz))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()]
      setZoomClamped(pinchStart.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.current.dist))
    } else if (pointers.current.size === 1) {
      setOff((o) => clamp({ x: o.x + e.clientX - prev.x, y: o.y + e.clientY - prev.y }))
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchStart.current = null
  }

  const confirm = () => {
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = VIEW / scale
    const sx = w / 2 - (VIEW / 2 + off.x) / scale
    const sy = h / 2 - (VIEW / 2 + off.y) / scale
    ctx.drawImage(img, sx, sy, size, size, 0, 0, OUT, OUT)
    canvas.toBlob((blob) => blob && onDone(blob), 'image/webp', 0.88)
  }

  return (
    <Portal>
      <motion.div
        className="absolute inset-0 z-50 bg-bg flex flex-col items-center justify-center px-6 gap-6"
        role="dialog"
        aria-modal="true"
        aria-label="Encuadrar foto de perfil"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <h2 className="text-title text-ink">Encuadra tu foto</h2>
          <p className="text-meta mt-1">Muévela y acércala hasta que te guste</p>
        </div>

        <div
          className="relative overflow-hidden rounded-[20px] bg-black touch-none-all cursor-grab active:cursor-grabbing"
          style={{ width: VIEW + 60, height: VIEW + 60, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => setZoomClamped(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          {img && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="absolute max-w-none pointer-events-none select-none"
              style={{
                width: w * scale,
                height: h * scale,
                left: (VIEW + 60) / 2 - (w * scale) / 2 + off.x,
                top: (VIEW + 60) / 2 - (h * scale) / 2 + off.y,
              }}
            />
          )}
          {/* fuera del círculo, oscurecido: así se ve exactamente lo que quedará */}
          <div
            className="absolute rounded-full pointer-events-none border-2 border-white/85"
            style={{ left: 30, top: 30, width: VIEW, height: VIEW, boxShadow: '0 0 0 400px rgb(0 0 0 / 0.6)' }}
          />
        </div>

        <label className="w-full max-w-[300px] flex items-center gap-3 text-mute">
          <span aria-hidden className="text-lg leading-none">−</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(parseFloat(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-[var(--color-accent)]"
          />
          <span aria-hidden className="text-lg leading-none">+</span>
        </label>

        <div className="w-full max-w-[300px] flex gap-2.5">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirm} disabled={!img} className="flex-1">
            Usar foto
          </Button>
        </div>
      </motion.div>
    </Portal>
  )
}
