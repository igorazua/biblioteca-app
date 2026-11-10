import { useLocalSearchParams } from 'expo-router'
import { PublicList } from '../../components/public/PublicList'

/** Lista compartida por link (`/l/…`). El payload va entero en la URL (share de core). */
export default function ListaCompartida() {
  const { payload } = useLocalSearchParams<{ payload: string | string[] }>()
  return <PublicList payload={Array.isArray(payload) ? payload[0] ?? '' : payload ?? ''} />
}
