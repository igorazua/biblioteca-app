import type { CSSProperties } from 'react'

export interface BrandLogoProps {
  id: string
  size?: number
  className?: string
  style?: CSSProperties
}

/**
 * Logos reales vectoriales de las plataformas para Conectar e Importar.
 * Sin iniciales genéricas en cuadrados ni insignias cutres: cada marca con su identidad real.
 */
export function BrandLogo({ id, size = 32, className = '', style }: BrandLogoProps) {
  switch (id) {
    case 'letterboxd':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#14181C] border border-white/10 ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none">
            {/* Círculo izquierdo naranja */}
            <circle cx="6.5" cy="12" r="4.5" fill="#FF8000" />
            {/* Círculo centro verde */}
            <circle cx="12" cy="12" r="4.5" fill="#00E054" />
            {/* Círculo derecho azul */}
            <circle cx="17.5" cy="12" r="4.5" fill="#40BCF4" />
            {/* Intersecciones oscuras auténticas de Letterboxd */}
            <path
              d="M8.224 14.352a4.447 4.447 0 0 1-3.775 2.092C1.992 16.444 0 14.454 0 12s1.992-4.444 4.45-4.444c1.592 0 2.988.836 3.774 2.092-.427.682-.673 1.488-.673 2.352s.246 1.67.673 2.352z"
              fill="#FF8000"
            />
            <path
              d="M15.101 12c0-.864.247-1.67.674-2.352-.786-1.256-2.183-2.092-3.775-2.092s-2.989.836-3.775 2.092c.427.682.674 1.488.674 2.352s-.247 1.67-.674 2.352c.786 1.256 2.183 2.092 3.775 2.092s2.989-.836 3.775-2.092A4.42 4.42 0 0 1 15.1 12z"
              fill="#00E054"
            />
            <path
              d="M19.55 7.556a4.447 4.447 0 0 0-3.775 2.092c.427.682.673 1.488.673 2.352s-.246 1.67-.673 2.352a4.447 4.447 0 0 0 3.775 2.092C22.008 16.444 24 14.454 24 12s-1.992-4.444-4.45-4.444z"
              fill="#40BCF4"
            />
          </svg>
        </span>
      )

    case 'spotify':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#121212] border border-white/10 ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.72} height={size * 0.72} fill="#1ED760">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </span>
      )

    case 'imdb':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#F5C518] shadow-sm ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <span className="text-black font-black tracking-tighter text-[13px] font-sans leading-none select-none">
            IMDb
          </span>
        </span>
      )

    case 'goodreads':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#F4F1EA] border border-[#D8D2C2] ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#382110">
            <path d="M17.346.026c.422-.083.859.037 1.179.325.346.284.55.705.557 1.153-.023.457-.247.88-.612 1.156l-2.182 1.748a.601.601 0 0 0-.255.43.52.52 0 0 0 .11.424 5.886 5.886 0 0 1 .832 6.58c-1.394 2.79-4.503 3.99-7.501 2.927a.792.792 0 0 0-.499-.01c-.224.07-.303.18-.453.383l-.014.02-.941 1.254s-.792.985.457.935c3.027-.119 3.817-.119 5.439-.01 2.641.18 3.806 1.903 3.806 3.275 0 1.623-1.036 3.383-3.809 3.383a117.46 117.46 0 0 0-5.517-.03c-.31.005-.597.013-.835.02-.228.006-.41.011-.52.011-.712 0-1.648-.186-1.66-1.068-.008-.729.624-1.12 1.11-1.172.43-.045.815.007 1.24.064.252.034.518.07.815.088.185.011.366.025.552.038.53.038 1.102.08 1.926.087.427.005.759.01 1.025.015.695.012.941.016 1.28-.015 1.248-.112 1.832-.61 1.832-1.376 0-.805-.584-1.264-1.698-1.414-1.564-.213-2.33-.163-3.72-.074a87.66 87.66 0 0 1-1.669.095c-.608.029-2.449.026-2.682-1.492-.053-.416-.073-1.116.807-2.325l.75-1.003c.36-.49.582-.898.053-1.559 0 0-.39-.468-.52-.638-1.215-1.587-1.512-4.08-.448-6.114 1.577-3.011 5.4-4.26 8.37-2.581.253.143.438.203.655.163.201-.032.27-.167.363-.344.02-.04.042-.082.067-.126.004-.01.241-.465.535-1.028l.734-1.41a1.493 1.493 0 0 1 1.041-.785ZM9.193 13.243c1.854.903 3.912.208 5.254-2.47 1.352-2.699.827-5.11-1.041-6.023C10.918 3.537 8.81 5.831 8.017 7.41c-1.355 2.698-.717 4.886 1.147 5.818Z" />
          </svg>
        </span>
      )

    case 'storygraph':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#204043] border border-white/10 ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#46B4A3">
            <path d="M18.1722.6246a.6788.6788 0 0 0-.1314.0252L14.095 1.818c-.3504.1039-.545.4673-.4413.8178l5.1137 17.3544c.104.3505.4673.5452.8178.4414l3.9455-1.1553c.3504-.1038.5451-.4673.4413-.8178L18.8584 1.0911a.6522.6522 0 0 0-.6862-.4665zM.662 1.0522c-.3634 0-.6619.2986-.6619.662v18.0944c0 .3634.2985.6619.662.6619h4.1143c.3634 0 .6619-.2985.6619-.662V1.7143c0-.3634-.2985-.662-.6619-.662zm6.9438 0c-.3634 0-.662.2986-.662.662v18.0944c0 .3634.2986.6619.662.6619H11.72c.3634 0 .649-.2985.662-.662V1.7143c0-.3634-.2986-.662-.662-.662zM.3634 21.431c-.1947 0-.3634.1558-.3634.3634v1.2202c0 .1948.1558.3635.3634.3635h23.2712c.1947 0 .3635-.1558.3635-.3635v-1.2202c0-.1947-.1557-.3634-.3635-.3634z" />
          </svg>
        </span>
      )

    case 'netflix':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#141414] border border-white/10 ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="#E50914">
            <path d="m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z" />
          </svg>
        </span>
      )

    case 'openlibrary':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#EFE9DA] border border-[#D8D2C2] ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#4B779A">
            <path d="M4 4v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1zm2 1h5v14H6V5zm7 0h5v14h-5V5z" opacity="0.4" />
            <path d="M2 20h20v2H2zm2-17h16v2H4zm8 3v12m-5-12v12m10-12v12" stroke="#4B779A" strokeWidth="1.5" />
          </svg>
        </span>
      )

    case 'anilist':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#0B1622] border border-white/10 ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#02A9FF">
            <path d="M24 17.53v2.421c0 .71-.391 1.101-1.1 1.101h-5l-.057-.165L11.84 3.736c.106-.502.46-.788 1.053-.788h2.422c.71 0 1.1.391 1.1 1.1v12.38H22.9c.71 0 1.1.392 1.1 1.101zM11.034 2.947l6.337 18.104h-4.918l-1.052-3.131H6.019l-1.077 3.131H0L6.361 2.948h4.673zm-.66 10.96-1.69-5.014-1.541 5.015h3.23z" />
          </svg>
        </span>
      )

    case 'trakt':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#181818] border border-white/10 ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="#ED1C24">
            <path d="m15.082 15.107-.73-.73 9.578-9.583a4.499 4.499 0 0 0-.115-.575L13.662 14.382l1.08 1.08-.73.73-1.81-1.81L23.422 3.144c-.075-.15-.155-.3-.25-.44L11.508 14.377l2.154 2.155-.73.73-7.193-7.199.73-.73 4.309 4.31L22.546 1.86A5.618 5.618 0 0 0 18.362 0H5.635A5.637 5.637 0 0 0 0 5.634V18.37A5.632 5.632 0 0 0 5.635 24h12.732C21.477 24 24 21.48 24 18.37V6.19l-8.913 8.918zm-4.314-2.155L6.814 8.988l.73-.73 3.954 3.96zm1.075-1.084-3.954-3.96.73-.73 3.959 3.96zm9.853 5.688a4.141 4.141 0 0 1-4.14 4.14H6.438a4.144 4.144 0 0 1-4.139-4.14V6.438A4.141 4.141 0 0 1 6.44 2.3h10.387v1.04H6.438c-1.71 0-3.099 1.39-3.099 3.1V17.55c0 1.71 1.39 3.105 3.1 3.105h11.117c1.71 0 3.1-1.395 3.1-3.105v-1.754h1.04v1.754z" />
          </svg>
        </span>
      )

    case 'bgg':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#2E282A] border border-white/10 ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#FF5100">
            <path d="m19.7 4.44-2.38.64L19.65 0 4.53 5.56l.83 6.67-1.4 1.34L8.12 24l8.85-3.26 3.07-7.22-1.32-1.27.98-7.81Z" />
          </svg>
        </span>
      )

    case 'applemusic':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#FA243C] shadow-sm ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#FFFFFF">
            <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z" />
          </svg>
        </span>
      )

    case 'lastfm':
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-[#1C1C1C] border border-white/10 ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#D51007">
            <path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z" />
          </svg>
        </span>
      )

    default:
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-surface2 border border-line text-ink font-semibold text-sm ${className}`}
          style={{ width: size, height: size, ...style }}
          aria-hidden
        >
          {id.slice(0, 2).toUpperCase()}
        </span>
      )
  }
}
