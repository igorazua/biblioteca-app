import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { fetchSpotifyArtists, finishSpotifyAuth, spotifyEnabled } from '@biblioteca/core'
import { AppText } from '../../components/AppText'
import { Press } from '../../components/Press'
import { ScreenHeader } from '../../components/ui'
import { BigSpinner, ImportFlowView } from '../../components/import/ImportFlowView'
import { setupConnect } from '../../lib/connect/setup'
import { useImportFlow } from '../../lib/import/useImportFlow'
import { track } from '../../store/useEvents'
import { colors } from '../../theme'

setupConnect()

// /conectar/spotify (ConnectSpotify.tsx): Spotify vuelve aquí con ?code=… tras dar permiso. Cambia el código por el token y trae los artistas.
// En la app nativa la vuelta la recoge la sesión del navegador (lib/connect/setup.ts) y reenvía aquí los mismos parámetros.
const first = (v: string | string[] | undefined): string | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

export default function ConectarSpotify() {
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>()
  const flow = useImportFlow()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const toConnect = () => router.replace('/conectar')

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = first(params.code)
    if (!spotifyEnabled()) return setError('Spotify estará disponible muy pronto.')
    if (first(params.error) || !code) return setError('No has dado permiso a Spotify, así que no hemos traído nada.')
    ;(async () => {
      try {
        if (!(await finishSpotifyAuth(code, first(params.state)))) return setError('La conexión con Spotify ha caducado. Vuelve a intentarlo.')
        const rows = await fetchSpotifyArtists()
        if (rows.length === 0) return setError('No hemos encontrado artistas en tu cuenta de Spotify.')
        track('import_started', { data: { source: 'spotify' } })
        await flow.run(rows, 'spotify')
      } catch {
        setError('No hemos podido leer tu cuenta de Spotify. Inténtalo de nuevo más tarde.')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Spotify" onBack={toConnect} />
      {error ? (
        <View style={styles.center}>
          <AppText style={styles.msg}>{error}</AppText>
          <Press accessibilityRole="button" onPress={toConnect} style={styles.back}>
            <AppText style={styles.backText}>Volver a Conectar</AppText>
          </Press>
        </View>
      ) : flow.step === 'idle' ? (
        <View style={styles.center}>
          <BigSpinner />
          <AppText style={styles.wait}>Trayendo tus artistas de Spotify…</AppText>
        </View>
      ) : (
        <ImportFlowView flow={flow} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // flex-1 flex flex-col items-center justify-center text-center p-8 gap-4
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  // text-sm text-mute max-w-xs leading-relaxed
  msg: { fontFamily: 'Inter-400', fontSize: 14, lineHeight: 22.75, color: colors.mute, textAlign: 'center', maxWidth: 320 },
  wait: { fontFamily: 'Inter-400', fontSize: 14, lineHeight: 20, color: colors.mute, textAlign: 'center' },
  // px-6 min-h-[48px] rounded-2xl bg-surface2 border border-line font-semibold
  back: { paddingHorizontal: 24, minHeight: 48, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backText: { fontFamily: 'Inter-600', fontSize: 16, lineHeight: 24, color: colors.ink },
})
