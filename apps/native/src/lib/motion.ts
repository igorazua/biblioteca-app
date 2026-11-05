import { Easing } from 'react-native-reanimated'

// Curvas de framer-motion con los nombres de la PWA (SwipeDeck.tsx usa 'easeIn', DuelVariants 'easeOut' y 'easeInOut').
export const easeIn = Easing.bezier(0.42, 0, 1, 1)
export const easeOut = Easing.bezier(0, 0, 0.58, 1)
export const easeInOut = Easing.bezier(0.42, 0, 0.58, 1)

// Muelles de la PWA. Framer: stiffness/damping con masa 1 salvo que se diga otra; en Reanimated 4 se usan los mismos números.
export const SPRING_SETTLE = { stiffness: 420, damping: 28, mass: 1 } as const // SwipeDeck.tsx:137
export const SPRING_FLIGHT = { stiffness: 420, damping: 40, mass: 0.9 } as const // Poster.tsx:28
export const SPRING_PICK = { stiffness: 300, damping: 30, mass: 1 } as const // DuelVariants.tsx:337
export const SPRING_FAN_BACK = { stiffness: 420, damping: 32, mass: 1 } as const // DuelVariants.tsx:359
