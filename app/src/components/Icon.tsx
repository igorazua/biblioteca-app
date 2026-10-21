import type { SVGProps } from 'react'

const P = {
  library: 'M4 19V6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v13M9 19V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v10M14 19l3-12 3.2.8-3 11.2M3 19h18',
  cards: 'M8 5h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 8v9M21 8v9',
  popcorn: 'M5.5 9.5h13l-1.6 10.5H7.1L5.5 9.5zM7 9.5a2.5 2.5 0 1 1 1.5-4.3A2.8 2.8 0 0 1 12 3.5a2.8 2.8 0 0 1 3.5 1.7A2.5 2.5 0 1 1 17 9.5M10 10l.3 9.5M14 10l-.3 9.5',
  scale: 'M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  bookmark: 'M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  share: 'M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6',
  heart: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  whatsapp: 'M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8L4 20zM9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-1.8-.9-.8.7a4 4 0 0 1-1.8-1.8l.7-.8-.9-1.8L9 9.5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  film: 'M4 5h16v14H4V5zM8 5v14M16 5v14M4 9h4M16 9h4M4 15h4M16 15h4',
  tv: 'M4 7h16v11H4V7zM9 3l3 4 3-4M8 21h8',
  bookOpen: 'M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  mail: 'M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2l8 6 8-6',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-2.8a1 1 0 0 0 .2-1.1l-.8-1.4a1 1 0 0 0-1.1-.5l-.9.4a6 6 0 0 0-1.6-1l-.1-1a1 1 0 0 0-.9-.9h-1.6a1 1 0 0 0-.9.9l-.1 1a6 6 0 0 0-1.6 1l-.9-.4a1 1 0 0 0-1.1.5l-.8 1.4a1 1 0 0 0 .2 1.1l.8.7a6 6 0 0 0 0 1.8l-.8.7a1 1 0 0 0-.2 1.1l.8 1.4a1 1 0 0 0 1.1.5l.9-.4a6 6 0 0 0 1.6 1l.1 1a1 1 0 0 0 .9.9h1.6a1 1 0 0 0 .9-.9l.1-1a6 6 0 0 0 1.6-1l.9.4a1 1 0 0 0 1.1-.5l.8-1.4a1 1 0 0 0-.2-1.1l-.8-.7a6 6 0 0 0 0-1.8l.8-.7z',
} as const

export type IconName = keyof typeof P

export function Icon({ name, size = 22, fill, ...rest }: { name: IconName; size?: number; fill?: string } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ?? 'none'} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[name]} />
    </svg>
  )
}
