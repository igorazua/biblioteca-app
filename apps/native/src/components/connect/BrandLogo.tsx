import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import Svg, { Circle, Path } from 'react-native-svg'
import { AppText } from '../AppText'
import { colors } from '../../theme'
import { VECTOR_LOGOS } from './brandLogoData'

// BrandLogo.tsx de la PWA: logos de las plataformas para Conectar. Los vectoriales salen de brandLogoData.ts (los trazados
// originales); los de `HOSTED_LOGOS` son PNG alojados por nosotros (scripts/fetch-brand-logos.mjs de la PWA), copiados a ./logos.
const HOSTED: Record<string, number> = {
  prime: require('./logos/prime.png'),
  disney: require('./logos/disney.png'),
  max: require('./logos/max.png'),
  movistar: require('./logos/movistar.png'),
  filmin: require('./logos/filmin.png'),
  skyshowtime: require('./logos/skyshowtime.png'),
  kindle: require('./logos/kindle.png'),
  ytmusic: require('./logos/ytmusic.png'),
  mal: require('./logos/mal.png'),
}

const WHITE_10 = 'rgba(255,255,255,0.1)'

export function BrandLogo({ id, size = 32 }: { id: string; size?: number }) {
  const v = VECTOR_LOGOS[id]
  if (v) {
    const s = size * v.scale
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.box, { width: size, height: size, backgroundColor: v.bg }, v.border ? { borderWidth: 1, borderColor: v.border } : null]}
      >
        <Svg width={s} height={s} viewBox="0 0 24 24" fill={v.fill}>
          {v.items.map((it, i) =>
            it.t === 'circle' ? (
              <Circle key={i} cx={Number(it.cx)} cy={Number(it.cy)} r={Number(it.r)} fill={it.fill} />
            ) : (
              <Path
                key={i}
                d={it.d}
                fill={it.fill}
                opacity={it.opacity ? Number(it.opacity) : undefined}
                stroke={it.stroke}
                strokeWidth={it.strokeWidth ? Number(it.strokeWidth) : undefined}
              />
            ),
          )}
        </Svg>
      </View>
    )
  }
  if (id === 'imdb') {
    return (
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.box, { width: size, height: size, backgroundColor: '#F5C518' }]}>
        <AppText fixed style={styles.imdb}>
          IMDb
        </AppText>
      </View>
    )
  }
  const hosted = HOSTED[id]
  if (hosted) {
    return (
      <Image
        source={hosted}
        accessible={false}
        contentFit="cover"
        style={[styles.box, { width: size, height: size, borderWidth: 1, borderColor: WHITE_10 }]}
      />
    )
  }
  // sin logo: las dos primeras letras en un cuadrado (text-sm font-semibold)
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }]}
    >
      <AppText fixed style={styles.initials}>
        {id.slice(0, 2).toUpperCase()}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  // rounded-xl shrink-0, centrado
  box: { borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  // text-black font-black tracking-tighter text-[13px] leading-none
  imdb: { fontFamily: 'Inter-900', fontSize: 13, lineHeight: 13, letterSpacing: -0.65, color: '#000000' },
  initials: { fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.ink },
})
