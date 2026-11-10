import { useState } from 'react'
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { AppText } from '../AppText'

/** Iniciales de ui.tsx: primera letra de las dos primeras palabras, en mayúsculas; «?» si no hay nada. */
export function initialsOf(name: string): string {
  const s = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return s || '?'
}

export interface AvatarProps {
  name: string
  /** Color de fondo cuando no hay foto. */
  color: string
  url?: string | null
  /** 32 por defecto (ui.tsx). */
  size?: number
  style?: StyleProp<ViewStyle>
}

/** Cara circular: foto si hay y carga; si no, iniciales sobre el color. Si la foto falla, cae a las iniciales. */
export function Avatar({ name, color, url, size = 32, style }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const box = { width: size, height: size, borderRadius: size / 2 }

  if (url && failedUrl !== url) {
    return (
      <Image
        source={{ uri: url }}
        accessibilityLabel={name}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={url}
        onError={() => setFailedUrl(url)}
        style={[box, style as StyleProp<ImageStyle>]}
      />
    )
  }

  return (
    <View accessible accessibilityLabel={name} style={[styles.fallback, box, { backgroundColor: color }, style]}>
      {/* Tamaño fijo del círculo: tope 1,0× (D18) para que la letra no rompa la cara. */}
      <AppText fixed style={[styles.initials, { fontSize: size * 0.4 }]}>
        {initialsOf(name)}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Inter-600', color: 'rgba(0, 0, 0, 0.8)' },
})
