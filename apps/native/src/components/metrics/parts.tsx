import { Children, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '../AppText'
import { alpha, colors } from '../../theme'

// Piezas de Metrics.tsx de la PWA (KpiCard y las cajas de sección). Medidas: MEDIDAS_NATIVA_2 «Metrics».

/** `KpiCard`: tarjeta con etiqueta, cifra en la serif y una línea de ayuda (se corta con «…», como `truncate`). */
export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.kpi}>
      <AppText style={styles.kpiLabel}>{label}</AppText>
      <AppText style={styles.kpiValue}>{value}</AppText>
      {sub ? (
        <AppText numberOfLines={1} style={styles.kpiSub}>
          {sub}
        </AppText>
      ) : null}
    </View>
  )
}

/** `grid grid-cols-N gap-2`: filas de N celdas iguales; la última fila incompleta deja el hueco, como una rejilla CSS. */
export function Grid({ cols, children }: { cols: number; children: ReactNode }) {
  const cells = Children.toArray(children)
  const rows: ReactNode[][] = []
  for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols))
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((c, i) => (
            <View key={i} style={{ flex: 1, minWidth: 0 }}>
              {c}
            </View>
          ))}
          {Array.from({ length: cols - row.length }, (_, i) => (
            <View key={`pad${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  )
}

/** Cabecera de sección: título en la serif con el acento y el contador a la derecha. */
export function SectionHead({ title, right }: { title: string; right: string }) {
  return (
    <View style={styles.sectionHead}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
      <AppText style={styles.sectionRight}>{right}</AppText>
    </View>
  )
}

/** Caja `rounded-2xl bg-surface border border-line p-3 space-y-2`. */
export function Box({ children, pad = 12, gap = 8 }: { children: ReactNode; pad?: number; gap?: number }) {
  return <View style={[styles.box, { padding: pad, gap }]}>{children}</View>
}

const styles = StyleSheet.create({
  kpi: { borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 12 },
  kpiLabel: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute },
  kpiValue: { fontFamily: 'Fraunces72-700', fontSize: 20, lineHeight: 28, color: '#ffffff', fontVariant: ['tabular-nums'], marginTop: 2 },
  kpiSub: { fontFamily: 'Inter-400', fontSize: 10, lineHeight: 15, color: alpha(colors.mute, 0.8), marginTop: 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Fraunces72-600', fontSize: 18, lineHeight: 28, color: colors.accent },
  sectionRight: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute },
  box: { borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
})
