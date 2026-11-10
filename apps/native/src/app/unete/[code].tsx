import { useLocalSearchParams } from 'expo-router'
import { JoinInvite } from '../../components/public/JoinInvite'

/** Invitación por link (`/unete/…`). */
export default function Unete() {
  const { code } = useLocalSearchParams<{ code: string | string[] }>()
  return <JoinInvite code={Array.isArray(code) ? code[0] ?? '' : code ?? ''} />
}
