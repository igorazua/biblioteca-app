import { useCallback, useEffect, useState } from 'react'
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GROUPS, SERVICES, disconnectSpotify, loadSpotifyTokens, spotifyEnabled, type ImportRow, type Service } from '@biblioteca/core'
import { AppText } from '../../components/AppText'
import { Press } from '../../components/Press'
import { DuelHeader } from '../../components/duel/DuelHeader'
import { Group, Toast } from '../../components/ui'
import { BrandLogo } from '../../components/connect/BrandLogo'
import { FileSheet, OAuthSheet, UsernameSheet } from '../../components/connect/ConnectSheets'
import { ImportFlowView } from '../../components/import/ImportFlowView'
import { setupConnect } from '../../lib/connect/setup'
import { useImportFlow } from '../../lib/import/useImportFlow'
import { track } from '../../store/useEvents'
import { alpha, colors } from '../../theme'

setupConnect()

// Conectar (Connect.tsx): traer tu historial desde otras plataformas. Cada servicio acaba devolviendo ImportRow[];
// el emparejado, la revisión y la aplicación son los del flujo compartido (useImportFlow).
type SheetState = { kind: 'username' | 'file' | 'oauth'; service: Service } | null

export default function Conectar() {

  const insets = useSafeAreaInsets()
  const flow = useImportFlow()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [asked, setAsked] = useState<Set<string>>(new Set())
  const [spotifyConnected, setSpotifyConnected] = useState(false)

  // La PWA lo leía en el estado inicial (localStorage es síncrono); aquí los tokens están en AsyncStorage. Se relee al volver a la pantalla.
  useFocusEffect(
    useCallback(() => {
      let alive = true
      void loadSpotifyTokens().then((t) => alive && setSpotifyConnected(Boolean(t) && spotifyEnabled()))
      return () => {
        alive = false
      }
    }, []),
  )

  const inFlow = flow.step !== 'idle'

  // D17: el atrás de Android, con un flujo en marcha, lo cierra (como el botón de volver de la cabecera) antes de salir de la pantalla.
  useEffect(() => {
    if (!inFlow) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      flow.reset()
      return true
    })
    return () => sub.remove()
  }, [inFlow, flow])

  const startRows = async (rows: ImportRow[], serviceId: string) => {
    setSheet(null)
    try {
      track('import_started', { data: { source: serviceId } })
      await flow.run(rows, serviceId)
    } catch {
      setToast('No hemos podido leer esa lista. Inténtalo de nuevo.')
    }
  }

  const tapService = (s: Service) => {
    if (s.method === 'soon') {
      track('connect_interest', { data: { service: s.id } })
      setAsked((prev) => new Set(prev).add(s.id))
      setToast('Anotado. Te avisaremos cuando esté listo.')
    } else if (s.method === 'file') setSheet({ kind: 'file', service: s })
    else if (s.method === 'username') setSheet({ kind: 'username', service: s })
    else if (spotifyEnabled()) setSheet({ kind: 'oauth', service: s })
    // sin conexión configurada (o para quien la tenga en modo desarrollo): siempre queda subir el historial descargado
    else if (s.file) setSheet({ kind: 'file', service: s })
  }

  const handleDisconnectSpotify = async () => {
    await disconnectSpotify()
    setSpotifyConnected(false)
    setToast('Desconectado de Spotify.')
  }

  const back = () => {
    if (inFlow) flow.reset()
    else if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <DuelHeader label="CONECTAR" title="Conectar" onBack={back} />

      {inFlow ? (
        <ImportFlowView flow={flow} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 64 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppText style={styles.intro}>
            Trae lo que ya has visto, leído o escuchado desde tus plataformas de siempre. Sin notas numéricas vacías y sin pedirte nunca tu contraseña.
          </AppText>

          <Group title="Tus conexiones">
            {spotifyConnected ? (
              <View style={styles.connRow}>
                <View style={styles.rowLeft}>
                  <BrandLogo id="spotify" size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText style={styles.name}>Spotify</AppText>
                    <View style={styles.statusLine}>
                      <View style={styles.dot} />
                      <AppText style={styles.sub}>Conectada con tu cuenta</AppText>
                    </View>
                  </View>
                </View>
                <Press accessibilityRole="button" accessibilityLabel="Desconectar Spotify" onPress={() => void handleDisconnectSpotify()} scaleTo={0.95} style={styles.disconnect}>
                  <AppText style={styles.disconnectText}>Desconectar</AppText>
                </Press>
              </View>
            ) : (
              <View style={styles.emptyConn}>
                <AppText style={styles.emptyConnText}>Aún no has conectado ninguna cuenta. Elige tu plataforma habitual para empezar.</AppText>
              </View>
            )}
          </Group>

          {GROUPS.map((g) => {
            const list = SERVICES.filter((s) => s.group === g.id)
            if (list.length === 0) return null
            return (
              <Group key={g.id} title={g.title}>
                {list.map((s) => {
                  const soon = s.method === 'soon'
                  const offSpotify = s.method === 'oauth' && !spotifyEnabled() && !s.file
                  const isAsked = asked.has(s.id)
                  const actionLabel = offSpotify
                    ? 'Pronto'
                    : soon
                      ? isAsked
                        ? 'Anotado'
                        : 'Avísame'
                      : s.method === 'file' || (s.method === 'oauth' && !spotifyEnabled())
                        ? 'Importar'
                        : 'Conectar'
                  const quiet = soon || offSpotify
                  const disabled = offSpotify || (soon && isAsked)
                  return (
                    <View key={s.id} style={styles.row}>
                      <View style={styles.rowLeft}>
                        <BrandLogo id={s.id} size={40} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText numberOfLines={1} style={styles.name}>
                            {s.name}
                          </AppText>
                          <AppText numberOfLines={1} style={styles.sub}>
                            {s.subtitle || s.blurb}
                          </AppText>
                        </View>
                      </View>
                      <Press
                        accessibilityRole="button"
                        accessibilityLabel={`${actionLabel}: ${s.name}`}
                        accessibilityState={{ disabled }}
                        disabled={disabled}
                        onPress={() => tapService(s)}
                        scaleTo={0.95}
                        style={[
                          styles.action,
                          quiet
                            ? isAsked
                              ? { borderColor: alpha(colors.accent, 0.4) }
                              : { borderColor: alpha(colors.line, 0.6) }
                            : { backgroundColor: colors.surface2, borderColor: colors.line, ...styles.actionShadow },
                        ]}
                      >
                        <AppText
                          style={[
                            styles.actionText,
                            quiet ? (isAsked ? { fontFamily: 'Archivo-Regular', color: colors.accent } : { color: colors.mute }) : { color: colors.ink },
                          ]}
                        >
                          {actionLabel}
                        </AppText>
                      </Press>
                    </View>
                  )
                })}
              </Group>
            )
          })}
        </ScrollView>
      )}

      {sheet?.kind === 'username' ? (
        <UsernameSheet
          service={sheet.service}
          onClose={() => setSheet(null)}
          onRows={(rows) => void startRows(rows, sheet.service.id)}
          onFile={() => setSheet({ kind: 'file', service: sheet.service })}
        />
      ) : null}
      {sheet?.kind === 'file' ? (
        <FileSheet service={sheet.service} onClose={() => setSheet(null)} onRows={(rows) => void startRows(rows, sheet.service.id)} />
      ) : null}
      {sheet?.kind === 'oauth' ? (
        <OAuthSheet
          service={sheet.service}
          onClose={() => setSheet(null)}
          onFailed={() => router.push({ pathname: '/conectar/spotify', params: { error: 'start_failed' } })}
        />
      ) : null}

      {toast ? <Toast key={toast} message={toast} onDone={() => setToast(null)} ms={2600} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  // px-5 pb-16 pt-2 w-full max-w-md mx-auto space-y-7
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 28, width: '100%', maxWidth: 448, alignSelf: 'center' },
  // text-sm text-mute leading-relaxed
  intro: { fontFamily: 'Archivo-Regular', fontSize: 14, lineHeight: 22.75, color: colors.mute },
  // min-h-[64px] px-4 py-3 flex items-center justify-between gap-3
  connRow: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  // min-h-[68px] px-4 py-3 flex items-center justify-between gap-3
  row: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  // flex items-center gap-3.5 min-w-0 flex-1
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 },
  // text-[15px] font-semibold leading-tight
  name: { fontFamily: 'Archivo-SemiBold', fontSize: 15, lineHeight: 18.75, color: colors.ink },
  // text-xs text-mute mt-0.5 leading-snug
  sub: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16.5, color: colors.mute, marginTop: 2 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399', flexShrink: 0, marginTop: 2 },
  // px-3 py-1.5 rounded-full text-xs font-medium text-mute
  disconnect: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  disconnectText: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16, color: colors.mute },
  // px-4 py-4 text-xs text-mute leading-relaxed
  emptyConn: { paddingHorizontal: 16, paddingVertical: 16 },
  emptyConnText: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 19.5, color: colors.mute },
  // min-h-[34px] px-3.5 rounded-full text-xs font-semibold shrink-0
  action: { minHeight: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'transparent' },
  actionText: { fontFamily: 'Archivo-SemiBold', fontSize: 12, lineHeight: 16 },
  // shadow-sm
  actionShadow: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 },
})
