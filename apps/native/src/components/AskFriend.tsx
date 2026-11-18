import { useState } from 'react'
import { Linking, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import type { Friend } from '@biblioteca/core'
import { AppText } from './AppText'
import { Icon } from './Icon'
import { Press } from './Press'
import { colors } from '../theme'

const WA = { bg: '#1f3a2a', fg: '#7de0a5' }
const IG = { bg: '#3a1f33', fg: '#f08fd0' }

function Btn({ bg, fg, label, icon, onPress }: { bg: string; fg: string; label: string; icon?: 'share' | 'whatsapp'; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      style={{ alignSelf: 'flex-start', marginTop: 10, minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      {icon ? <Icon name={icon} size={17} color={fg} /> : null}
      <AppText style={{ fontFamily: 'Archivo-Regular', fontSize: 14, lineHeight: 20, color: fg }}>{label}</AppText>
    </Press>
  )
}

/** «Pregúntale» (§12.7): WhatsApp con el texto prellenado, o Instagram (copia el mensaje y abre el chat). */
export function AskFriend({ friend, message, onNotify }: { friend: Friend; message: string; onNotify: (m: string) => void }) {
  const [menu, setMenu] = useState(false)
  const c = friend.contact ?? {}
  const wa = `https://wa.me/${c.whatsapp ?? ''}?text=${encodeURIComponent(message)}`
  const ig = c.instagram ? `https://ig.me/m/${c.instagram}` : ''

  const open = (url: string) => {
    Linking.openURL(url).catch(() => onNotify('No he podido abrir el enlace'))
  }
  const openWa = () => {
    setMenu(false)
    open(wa)
  }
  const openIg = async () => {
    try {
      await Clipboard.setStringAsync(message)
      onNotify('Mensaje copiado, pégalo en el chat')
    } catch {
      onNotify('Copia el mensaje a mano y pégalo en el chat')
    }
    open(ig)
    setMenu(false)
  }

  if (c.whatsapp && c.instagram)
    return (
      <View>
        {!menu ? (
          <Btn bg={colors.surface2} fg={colors.ink} icon="share" label="Pregúntale" onPress={() => setMenu(true)} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Btn bg={WA.bg} fg={WA.fg} icon="whatsapp" label="WhatsApp" onPress={openWa} />
            <Btn bg={IG.bg} fg={IG.fg} label="Instagram" onPress={openIg} />
          </View>
        )}
      </View>
    )
  if (c.instagram) return <Btn bg={IG.bg} fg={IG.fg} label="Pregúntale por Instagram" onPress={openIg} />
  return <Btn bg={WA.bg} fg={WA.fg} icon="whatsapp" label="Pregúntale" onPress={openWa} />
}
