import { useEffect, useRef, useState } from 'react'
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { GestureDetector, GestureHandlerRootView, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler'
import { Button } from '../ui'
import { AppText } from '../AppText'
import { alpha, colors, tx } from '../../theme'

// Encuadre de la foto de perfil (components/AvatarCropper.tsx de la PWA): círculo fijo, la foto se mueve con el dedo y se acerca
// con la barra o con dos dedos. Devuelve un WebP cuadrado de 512 con lo que se ve en el círculo.
const VIEW = 260 // diámetro del círculo en pantalla
const FRAME = VIEW + 60 // el marco deja 30 a cada lado
const OUT = 512 // lado de la imagen resultante
const QUALITY = 0.88
const MAX_ZOOM = 4
const PREP = 2048 // lado máximo de la foto de trabajo: más no hace falta para sacar 512 y evita agotar la memoria con fotos de cámara

export interface CroppedAvatar {
  /** Imagen en base64, sin prefijo. */
  base64: string
  mime: 'image/webp' | 'image/jpeg'
}

interface Props {
  /** `uri` local de la foto elegida (la que devuelve el selector de imágenes). */
  uri: string
  onCancel: () => void
  onDone: (img: CroppedAvatar) => void
}

interface Prepared {
  uri: string
  w: number
  h: number
}

export function AvatarCropper({ uri, onCancel, onDone }: Props) {
  const reduce = useReducedMotion()
  const { width: screenW } = useWindowDimensions()
  const sliderW = Math.min(300, screenW - 48) - 36 // max-w-[300] menos «−», «+» y los huecos de 12
  const [img, setImg] = useState<Prepared | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => void (alive.current = false), [])

  // Foto de trabajo: con la orientación EXIF ya aplicada y sin pasar de PREP px. Así las medidas que ve el recorte son las del archivo.
  useEffect(() => {
    let cancelled = false
    ImageManipulator.manipulate(uri, { maxWidth: PREP, maxHeight: PREP })
      .renderAsync()
      .then((ref) => ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 }))
      .then((r) => {
        if (!cancelled) setImg({ uri: r.uri, w: r.width, h: r.height })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [uri])

  const w = img?.w ?? 1
  const h = img?.h ?? 1
  const base = VIEW / Math.min(w, h) // px de pantalla por px de la foto a zoom 1

  // Medidas en valores compartidos: los gestos son worklets y no deben depender de lo capturado en un render anterior (w y h valen 1 hasta que carga la foto)
  const photoW = useSharedValue(1)
  const photoH = useSharedValue(1)
  const barW = useSharedValue(sliderW)
  useEffect(() => {
    photoW.value = w * base
    photoH.value = h * base
  }, [w, h, base, photoW, photoH])
  useEffect(() => {
    barW.value = sliderW
  }, [sliderW, barW])

  const zoom = useSharedValue(1)
  const ox = useSharedValue(0) // centro de la foto respecto al centro del círculo, en px de pantalla
  const oy = useSharedValue(0)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const startZoom = useSharedValue(1)
  const pinching = useSharedValue(false)

  // la foto siempre cubre el círculo entero (clamp, AvatarCropper.tsx:39)
  const limitX = (z: number) => {
    'worklet'
    return Math.max(0, (photoW.value * z - VIEW) / 2)
  }
  const limitY = (z: number) => {
    'worklet'
    return Math.max(0, (photoH.value * z - VIEW) / 2)
  }
  const clampTo = (v: number, m: number) => {
    'worklet'
    return Math.max(-m, Math.min(m, v))
  }
  const setZoomClamped = (z: number) => {
    'worklet'
    const nz = Math.max(1, Math.min(MAX_ZOOM, z))
    zoom.value = nz
    ox.value = clampTo(ox.value, limitX(nz))
    oy.value = clampTo(oy.value, limitY(nz))
  }

  const pan = usePanGesture({
    minDistance: 2,
    onBegin: () => {
      'worklet'
      startX.value = ox.value
      startY.value = oy.value
    },
    onUpdate: (e) => {
      'worklet'
      if (pinching.value) return
      ox.value = clampTo(startX.value + e.translationX, limitX(zoom.value))
      oy.value = clampTo(startY.value + e.translationY, limitY(zoom.value))
    },
  })
  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet'
      startZoom.value = zoom.value
      pinching.value = true
    },
    onUpdate: (e) => {
      'worklet'
      setZoomClamped(startZoom.value * e.scale)
    },
    onFinalize: () => {
      'worklet'
      pinching.value = false
      // al soltar los dos dedos, el arrastre de un dedo sigue desde donde quedó
      startX.value = ox.value
      startY.value = oy.value
    },
  })
  const gesture = useSimultaneousGestures(pan, pinch)

  // Barra de zoom: la posición del dedo en la barra fija el zoom (de 1 a 4, paso 0,01)
  const slide = (x: number) => {
    'worklet'
    const f = Math.max(0, Math.min(1, x / barW.value))
    setZoomClamped(Math.round((1 + f * (MAX_ZOOM - 1)) * 100) / 100)
  }
  const sliderPan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      'worklet'
      slide(e.x)
    },
    onUpdate: (e) => {
      'worklet'
      slide(e.x)
    },
  })

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ox.value }, { translateY: oy.value }, { scale: zoom.value }],
  }))
  const thumbStyle = useAnimatedStyle(() => ({ left: ((zoom.value - 1) / (MAX_ZOOM - 1)) * sliderW - 10 }))
  const fillStyle = useAnimatedStyle(() => ({ width: ((zoom.value - 1) / (MAX_ZOOM - 1)) * sliderW }))

  const confirm = async () => {
    if (!img || busy) return
    setBusy(true)
    try {
      const scale = base * zoom.value
      const size = VIEW / scale // lado del recorte en px de la foto
      const sx = w / 2 - (VIEW / 2 + ox.value) / scale
      const sy = h / 2 - (VIEW / 2 + oy.value) / scale
      const side = Math.max(1, Math.min(Math.round(size), w, h))
      const crop = {
        originX: Math.max(0, Math.min(Math.round(sx), w - side)),
        originY: Math.max(0, Math.min(Math.round(sy), h - side)),
        width: side,
        height: side,
      }
      const rendered = await ImageManipulator.manipulate(img.uri).crop(crop).resize({ width: OUT, height: OUT }).renderAsync()
      let out: CroppedAvatar
      try {
        const r = await rendered.saveAsync({ format: SaveFormat.WEBP, compress: QUALITY, base64: true })
        if (!r.base64) throw new Error('sin datos')
        out = { base64: r.base64, mime: 'image/webp' }
      } catch {
        const r = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY, base64: true })
        if (!r.base64) throw new Error('sin datos')
        out = { base64: r.base64, mime: 'image/jpeg' }
      }
      if (alive.current) onDone(out)
    } catch {
      if (alive.current) setFailed(true)
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const fade = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (!reduce) fade.value = withTiming(1, { duration: 300 })
  }, [fade, reduce])
  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }))

  return (
    <Modal visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onCancel} supportedOrientations={['portrait']}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Animated.View accessibilityViewIsModal aria-label="Encuadrar foto de perfil" style={[styles.root, rootStyle]}>
          <View style={{ alignItems: 'center' }}>
            <AppText style={[tx('title'), { color: colors.ink }]}>Encuadra tu foto</AppText>
            <AppText style={[tx('meta'), { marginTop: 4, textAlign: 'center' }]}>
              {failed ? 'No se pudo abrir esa foto. Prueba con otra.' : 'Muévela y acércala hasta que te guste'}
            </AppText>
          </View>

          <GestureDetector gesture={gesture}>
            <View style={styles.frame}>
              {img && (
                <Animated.View style={[styles.photo, { width: w * base, height: h * base }, photoStyle]}>
                  <Image source={{ uri: img.uri }} contentFit="fill" style={StyleSheet.absoluteFill} />
                </Animated.View>
              )}
              {/* fuera del círculo, oscurecido: así se ve exactamente lo que quedará */}
              <View pointerEvents="none" style={styles.dim}>
                <View style={styles.hole} />
                <View style={styles.ring} />
              </View>
            </View>
          </GestureDetector>

          <View style={[styles.sliderRow, { width: Math.min(300, screenW - 48) }]}>
            <AppText fixed style={styles.sign}>
              −
            </AppText>
            <GestureDetector gesture={sliderPan}>
              <View style={[styles.sliderHit, { width: sliderW }]} accessibilityRole="adjustable" accessibilityLabel="Zoom">
                <View style={styles.track} />
                <Animated.View style={[styles.fill, fillStyle]} />
                <Animated.View style={[styles.thumb, thumbStyle]} />
              </View>
            </GestureDetector>
            <AppText fixed style={styles.sign}>
              +
            </AppText>
          </View>

          <View style={[styles.buttons, { width: Math.min(300, screenW - 48) }]}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={onCancel}>
              Cancelar
            </Button>
            <Button variant="primary" style={{ flex: 1 }} disabled={!img} loading={busy} onPress={confirm}>
              Usar foto
            </Button>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 24, backgroundColor: colors.bg },
  frame: { width: FRAME, height: FRAME, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  photo: { position: 'absolute' },
  // `box-shadow: 0 0 0 400px` del círculo: un recuadro con el borde grueso alrededor del hueco
  dim: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hole: { width: VIEW + 800, height: VIEW + 800, borderRadius: (VIEW + 800) / 2, borderWidth: 400, borderColor: 'rgba(0,0,0,0.6)' },
  ring: { position: 'absolute', width: VIEW, height: VIEW, borderRadius: VIEW / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sign: { fontFamily: 'Inter-400', fontSize: 18, lineHeight: 18, color: colors.mute, width: 12, textAlign: 'center' },
  sliderHit: { height: 40, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line },
  fill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  thumb: { position: 'absolute', top: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 2, borderColor: alpha('#000000', 0.2) },
  buttons: { flexDirection: 'row', gap: 10 },
})
