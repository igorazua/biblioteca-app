import { useRef, useState } from 'react'
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { getItem, SHELF_LABEL, type Stars } from '@biblioteca/core'
import { posterRadius } from '@biblioteca/core/src/lib/posterShape'
import { useStore } from '../../store'
import { haptic } from '../../lib/haptics'
import { posterAspect, titleOf } from '../../lib/item'
import { colors, tx } from '../../theme'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Poster } from '../Poster'
import { Press } from '../Press'
import { Button, Sheet, StarRating } from '../ui'

// RatingFlow.tsx de la PWA: hoja de valoración tras marcar una obra como vista, y hoja de comentario de ¡Duelos!.
// Cerrarla de cualquier forma guarda lo que haya. Las estrellas solo existen aquí, la primera vez (`withStars`).

/** Casilla de «No preguntar más»: `w-5 h-5` con `accent-[#F5B544]`, dentro de una fila de al menos `minH` de alto. */
function CheckRow({ checked, onChange, label, minH }: { checked: boolean; onChange: (v: boolean) => void; label: string; minH: number }) {
  return (
    <Press
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: minH }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: checked ? '#F5B544' : colors.mute,
          backgroundColor: checked ? '#F5B544' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Icon name="check" size={14} color={colors.accentInk} strokeWidth={3} />}
      </View>
      <AppText style={[tx('meta'), { flex: 1 }]}>{label}</AppText>
    </Press>
  )
}

/** Campo de comentario de dos líneas (`rows={2}`, `bg-surface2 border-line rounded-2xl px-4 py-3`). */
function CommentInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [focus, setFocus] = useState(false)
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline
      numberOfLines={2}
      textAlignVertical="top"
      placeholder={placeholder}
      placeholderTextColor="rgba(163,157,146,0.7)"
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      maxFontSizeMultiplier={1.2}
      style={{
        marginTop: 12,
        minHeight: 2 * 21.75 + 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: focus ? colors.accent : colors.line,
        backgroundColor: colors.surface2,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: colors.ink,
        fontFamily: 'Inter-400',
        fontSize: 15,
        lineHeight: 21.75,
      }}
    />
  )
}

/**
 * Hoja de valoración tras marcar una obra como vista. Cerrarla de cualquier forma guarda lo que haya.
 * Las estrellas solo existen aquí, la primera vez (`withStars`); después solo se ve la nota 0-10.
 * Sin comparaciones: con estrellas queda colocada de forma provisional y ¡Duelos! afina el orden (§12.3).
 * Al añadir a mano, AddFlow encadena después los duelos de colocación (PlaceFlow, §13.1).
 */
export function RatingFlow({ itemId, onDone, withStars }: { itemId: string; onDone: (msg?: string) => void; withStars?: boolean }) {
  const item = getItem(itemId)!
  const entry = useStore((s) => s.entries[itemId])
  const rate = useStore((s) => s.rate)
  const placeProvisional = useStore((s) => s.placeProvisional)
  const setSettings = useStore((s) => s.setSettings)
  const [never, setNever] = useState(false)
  const stars0 = withStars ?? !entry?.stars
  const [stars, setStars] = useState<number>(entry?.stars ?? 0)
  const [comment, setComment] = useState(entry?.comment ?? '')
  const saved = useRef(false)
  const label = SHELF_LABEL[item.type]

  const finish = () => {
    if (saved.current) return
    saved.current = true
    if (never) setSettings({ rateOnSwipe: false })
    if (stars0) {
      rate(itemId, { stars: (stars || null) as Stars | null, comment })
      if (stars && !entry?.ranked) placeProvisional(itemId)
    } else rate(itemId, { comment })
    if (stars || comment) haptic('success')
    onDone('Guardada ✓')
  }

  return (
    <Sheet label="Valorar" onClose={finish} height={stars0 ? '46%' : '36%'}>
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 56, aspectRatio: posterAspect(item), borderRadius: posterRadius(item.type, 8) as number, overflow: 'hidden', flexShrink: 0 }}>
            <Poster item={item} showTitle={false} style={StyleSheet.absoluteFill} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={tx('label')}>{label.actionPast}</AppText>
            <AppText numberOfLines={2} style={[tx('title'), { fontFamily: 'Fraunces72-500', color: colors.ink, marginTop: 2, lineHeight: 25.3 }]}>
              {titleOf(item)}
            </AppText>
          </View>
        </View>
        {stars0 && (
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <StarRating value={stars} onChange={setStars} />
          </View>
        )}
        <CommentInput value={comment} onChange={setComment} placeholder="¿Qué significó para ti? (opcional)" />
        {stars0 && <CheckRow checked={never} onChange={setNever} label="No preguntar más al guardar (se reactiva en Perfil)" minH={40} />}
        <Button variant="primary" onPress={finish} style={{ marginTop: 12, alignSelf: 'stretch' }}>
          Guardar
        </Button>
        <AppText style={[tx('meta'), { textAlign: 'center', marginTop: 8 }]}>Desliza hacia abajo para cerrar: se guarda lo que haya</AppText>
      </Pressable>
    </Sheet>
  )
}

/** Hoja de comentario de ¡Duelos!: como la de valoración pero sin estrellas, con «No preguntar más». */
export function CommentSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const item = getItem(itemId)!
  const addComment = useStore((s) => s.addComment)
  const setSettings = useStore((s) => s.setSettings)
  const [comment, setComment] = useState(useStore.getState().entries[itemId]?.comment ?? '')
  const [never, setNever] = useState(false)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    if (comment.trim()) addComment(itemId, comment)
    if (never) setSettings({ commentBoxInPairs: false })
    onClose()
  }
  return (
    <Sheet label="Comentario" onClose={finish} height="34%">
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        <AppText style={[tx('title'), { color: colors.ink }]}>
          ¿Algo que decir de <AppText style={{ fontFamily: 'Fraunces72-500', fontStyle: 'italic' }}>{titleOf(item)}</AppText>?
        </AppText>
        <CommentInput value={comment} onChange={setComment} placeholder="Tu comentario (opcional)" />
        <View style={{ marginTop: 12 }}>
          <CheckRow checked={never} onChange={setNever} label="No preguntar más" minH={44} />
        </View>
        <Button variant="primary" onPress={finish} style={{ marginTop: 8, alignSelf: 'stretch' }}>
          Guardar
        </Button>
      </Pressable>
    </Sheet>
  )
}
