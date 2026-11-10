import { useLocalSearchParams } from 'expo-router'
import { PublicProfile } from '../../components/public/PublicProfile'

/** Perfil compartido por link (`/p/…`): el top 3 de cada estantería. */
export default function PerfilCompartido() {
  const { payload } = useLocalSearchParams<{ payload: string | string[] }>()
  return <PublicProfile payload={Array.isArray(payload) ? payload[0] ?? '' : payload ?? ''} />
}
