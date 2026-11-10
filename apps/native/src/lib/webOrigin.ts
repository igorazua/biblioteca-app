/**
 * Dirección web de la PWA, para los enlaces que se comparten (`/unete/…`, `/l/…`, `/p/…`). Fuera de la app abren la web;
 * con la app instalada abrirán la app cuando haya Universal Links / App Links (dev build). Se puede cambiar con
 * `EXPO_PUBLIC_WEB_ORIGIN` en `.env.local`.
 */
export const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_ORIGIN || 'https://biblioteca-social.vercel.app').replace(/\/+$/, '')
