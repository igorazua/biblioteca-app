import Svg, { Path } from 'react-native-svg'

// Mismos trazados que app/src/components/Icon.tsx (viewBox 24). Trazo 1,75 (SISTEMA_DISENO §5.6; la PWA usa 1,9).
const P = {
  library: 'M4 19V6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v13M9 19V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v10M14 19l3-12 3.2.8-3 11.2M3 19h18',
  cards: 'M8 5h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 8v9M21 8v9',
  scale: 'M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  bookmark: 'M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z',
  rotateCcw: 'M3 12a9 9 0 1 0 2.64-6.36L3 8M3 3v5h5',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
} as const

export type IconName = keyof typeof P

export function Icon({ name, size = 22, color = '#f4efe6', strokeWidth = 1.75, fill = 'none' }: { name: IconName; size?: number; color?: string; strokeWidth?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={P[name]} fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
