import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { ScrollView as SheetScroll } from 'react-native-gesture-handler'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { AVATAR_COLORS, PLATFORMS } from '@biblioteca/core'
import { COUNTRIES } from '@biblioteca/core/src/lib/countries'
import { supabase } from '../../lib/supabase'
import { checkHandleAvailability, useAuth } from '../../store/useAuth'
import { useStore } from '../../store'
import { AppText } from '../../components/AppText'
import { Icon } from '../../components/Icon'
import { Press } from '../../components/Press'
import { DuelHeader } from '../../components/duel/DuelHeader'
import { AvatarCropper, type CroppedAvatar } from '../../components/profile/AvatarCropper'
import { toDataUri, uploadAvatarToCloud } from '../../components/profile/avatarUpload'
import { Avatar, Group, PlatformPicker, Sheet, Toast } from '../../components/ui'
import { haptic } from '../../lib/haptics'
import { colors, tx } from '../../theme'

/**
 * Editar perfil (EditProfile.tsx): foto, nombre, @usuario, país, año y plataformas. Lo que es de la app (cuenta, avisos, ayuda) vive en
 * Ajustes. Es un borrador: no se aplica nada hasta «Guardar», salvo la foto, que se sube al elegirla.
 */
export default function EditarPerfil() {
  const router = useRouter()
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const user = useAuth((s) => s.user)
  const authProfile = useAuth((s) => s.profile)

  const [name, setName] = useState(profile.name === 'Tú' ? '' : profile.name)
  const [handle, setHandle] = useState(authProfile?.handle ?? '')
  const [country, setCountry] = useState(profile.country ?? 'ES')
  const [birthYear, setBirthYear] = useState(profile.birthYear ? String(profile.birthYear) : '')
  const [platforms, setPlatforms] = useState(profile.platforms)
  const [color, setColor] = useState(profile.avatarColor)
  const [handleError, setHandleError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [cropUri, setCropUri] = useState<string | null>(null)
  const [countryOpen, setCountryOpen] = useState(false)
  const [focus, setFocus] = useState<string | null>(null)

  const maxYear = new Date().getFullYear() - 6
  const yearNum = parseInt(birthYear, 10)
  const yearInvalid = birthYear !== '' && !(yearNum >= 1930 && yearNum <= maxYear)

  // elegir foto → encuadrar → subir lo que se ve en el círculo
  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false })
      if (!res.canceled && res.assets[0]?.uri) setCropUri(res.assets[0].uri)
    } catch {
      setToast('No se pudo abrir tus fotos')
    }
  }

  const uploadAvatar = async (img: CroppedAvatar) => {
    setCropUri(null)
    setUploadingAvatar(true)
    try {
      if (user && supabase) {
        const avatarUrl = await uploadAvatarToCloud(user.id, img)
        useAuth.setState((s) => ({ profile: s.profile ? { ...s.profile, avatarUrl } : null }))
        setProfile({ avatarUrl })
      } else {
        // sin cuenta se queda en este móvil
        setProfile({ avatarUrl: toDataUri(img) })
      }
      setToast('Foto actualizada')
    } catch {
      setToast('No se pudo subir la foto. Reintentar.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const removeAvatar = async () => {
    setProfile({ avatarUrl: null })
    if (user && supabase) {
      await supabase.from('biblio_profiles').update({ avatar_url: null }).eq('id', user.id)
      useAuth.setState((s) => ({ profile: s.profile ? { ...s.profile, avatarUrl: null } : null }))
    }
  }

  const back = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/perfil')
  }

  const save = async () => {
    if (yearInvalid || saving) return
    setSaving(true)
    setHandleError(null)
    try {
      const cleanName = name.trim() || 'Tú'
      const cleanHandle = handle.trim().toLowerCase()
      if (user && supabase) {
        const update: Record<string, unknown> = { display_name: cleanName, country }
        if (cleanHandle && cleanHandle !== authProfile?.handle) {
          const res = await checkHandleAvailability(cleanHandle, user.id)
          if (!res.available) {
            setHandleError(res.error ?? 'Ese @usuario no está disponible')
            return
          }
          update.handle = cleanHandle
        }
        const { error } = await supabase.from('biblio_profiles').update(update).eq('id', user.id)
        if (error) throw error
        useAuth.setState((s) => ({
          profile: s.profile ? { ...s.profile, displayName: cleanName, country, handle: (update.handle as string) ?? s.profile.handle } : null,
        }))
      }
      setProfile({
        name: cleanName,
        country,
        birthYear: birthYear === '' ? undefined : yearNum,
        platforms,
        avatarColor: color,
      })
      haptic('success')
      back()
    } catch {
      setToast('No se pudo guardar. Revisa la conexión y reintenta.')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = (id: string, invalid = false) => [styles.field, focus === id && styles.fieldFocus, invalid && styles.fieldInvalid]
  const canSave = !saving && !yearInvalid

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <DuelHeader
            label="PERFIL"
            title="Editar perfil"
            onBack={back}
            action={
              <Press accessibilityRole="button" accessibilityLabel="Guardar" disabled={!canSave} dim={canSave ? 1 : 0.4} hitSlop={8} onPress={save}>
                <AppText style={styles.save}>{saving ? 'Guardando…' : 'Guardar'}</AppText>
              </Press>
            }
          />

          <View style={{ paddingHorizontal: 20, gap: 24 }}>
            {/* Foto y color */}
            <View style={{ alignItems: 'center', gap: 12, paddingTop: 4 }}>
              <Avatar name={name || profile.name} color={color} url={profile.avatarUrl} size={96} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Press accessibilityRole="button" accessibilityLabel={profile.avatarUrl ? 'Cambiar foto' : 'Poner foto'} disabled={uploadingAvatar} onPress={pickPhoto} style={styles.photoBtn}>
                  <Icon name="camera" size={15} color={colors.accent} />
                  <AppText style={styles.photoText}>{uploadingAvatar ? 'Subiendo…' : profile.avatarUrl ? 'Cambiar foto' : 'Poner foto'}</AppText>
                </Press>
                {profile.avatarUrl ? (
                  <Press accessibilityRole="button" accessibilityLabel="Quitar foto" onPress={removeAvatar} style={{ minHeight: 40, justifyContent: 'center' }}>
                    <AppText style={[styles.photoText, { color: colors.mute }]}>Quitar</AppText>
                  </Press>
                ) : null}
              </View>
              {!profile.avatarUrl && (
                <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Color del avatar">
                  {AVATAR_COLORS.map((c) => (
                    <Press
                      key={c}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: c === color }}
                      accessibilityLabel={`Color ${c}`}
                      onPress={() => setColor(c)}
                      style={[styles.swatch, { backgroundColor: c, borderColor: c === color ? '#ffffff' : 'transparent', transform: [{ scale: c === color ? 1.1 : 1 }] }]}
                    />
                  ))}
                </View>
              )}
            </View>

            <Group title="Sobre ti">
              <View style={styles.block}>
                <AppText style={styles.label}>Nombre</AppText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocus('name')}
                  onBlur={() => setFocus(null)}
                  placeholder="Cómo te verán tus amigos"
                  placeholderTextColor={colors.mute}
                  maxLength={40}
                  autoCapitalize="words"
                  accessibilityLabel="Nombre"
                  style={fieldStyle('name')}
                />
              </View>
              {user ? (
                <View style={styles.block}>
                  <AppText style={styles.label}>@usuario</AppText>
                  <View>
                    <AppText style={styles.at}>@</AppText>
                    <TextInput
                      value={handle}
                      onChangeText={(v) => {
                        setHandle(v.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                        setHandleError(null)
                      }}
                      onFocus={() => setFocus('handle')}
                      onBlur={() => setFocus(null)}
                      placeholder="tu_usuario"
                      placeholderTextColor={colors.mute}
                      maxLength={20}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Usuario"
                      style={[...fieldStyle('handle', !!handleError), { paddingLeft: 32 }]}
                    />
                  </View>
                  <AppText style={[styles.hint, handleError ? { color: colors.stampRed } : null]}>
                    {handleError ?? 'Con él te encuentran tus amigos y se forma el enlace de tu perfil.'}
                  </AppText>
                </View>
              ) : null}
              <View style={styles.block}>
                <AppText style={styles.label}>País</AppText>
                <Press accessibilityRole="button" accessibilityLabel="País" onPress={() => setCountryOpen(true)} style={[styles.field, styles.select]}>
                  <AppText style={styles.selectText}>{COUNTRIES.find((c) => c.code === country)?.name ?? country}</AppText>
                  <View style={{ transform: [{ rotate: '90deg' }] }}>
                    <Icon name="chevron" size={14} color={colors.mute} />
                  </View>
                </Press>
                <AppText style={styles.hint}>Para enseñarte primero lo que se conoce en tu país, con sus títulos.</AppText>
              </View>
              <View style={styles.block}>
                <AppText style={styles.label}>Año de nacimiento (opcional)</AppText>
                <TextInput
                  value={birthYear}
                  onChangeText={(v) => setBirthYear(v.replace(/\D/g, '').slice(0, 4))}
                  onFocus={() => setFocus('year')}
                  onBlur={() => setFocus(null)}
                  keyboardType="number-pad"
                  placeholder="1995"
                  placeholderTextColor={colors.mute}
                  accessibilityLabel="Año de nacimiento"
                  style={fieldStyle('year', yearInvalid)}
                />
                <AppText style={[styles.hint, yearInvalid ? { color: colors.stampRed } : null]}>
                  {yearInvalid ? `Pon un año entre 1930 y ${maxYear}.` : 'No lo ve nadie. Si no lo pones, lo deducimos de lo que vas marcando.'}
                </AppText>
              </View>
            </Group>

            <Group title="Tus plataformas" footer="Decidir solo te propone lo que puedes ver; en Descubrir no se filtra nada.">
              <View style={{ padding: 16 }}>
                <PlatformPicker value={platforms} onChange={setPlatforms} options={PLATFORMS} />
              </View>
            </Group>

            {!user && (
              <AppText style={styles.noAccount}>Sin cuenta, tu perfil se guarda solo en este móvil. Entra desde Ajustes para elegir tu @usuario y conectar con amigos.</AppText>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {countryOpen && (
        <Sheet label="País" height="60%" onClose={() => setCountryOpen(false)}>
          <AppText style={styles.sheetTitle}>País</AppText>
          <SheetScroll style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            {COUNTRIES.map((c) => {
              const on = c.code === country
              return (
                <Press
                  key={c.code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    setCountry(c.code)
                    setCountryOpen(false)
                  }}
                  style={styles.countryRow}
                >
                  <AppText style={[styles.countryText, { color: on ? colors.accent : colors.ink, fontFamily: on ? 'Inter-600' : 'Inter-400' }]}>{c.name}</AppText>
                  {on ? <Icon name="check" size={18} color={colors.accent} /> : null}
                </Press>
              )
            })}
          </SheetScroll>
        </Sheet>
      )}

      {cropUri && <AvatarCropper uri={cropUri} onCancel={() => setCropUri(null)} onDone={uploadAvatar} />}
      {toast ? <Toast key={toast} message={toast} onDone={() => setToast(null)} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  save: { fontFamily: 'Inter-500', fontSize: 13, lineHeight: 18.2, color: colors.accent },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40 },
  photoText: { fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.accent },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  block: { paddingHorizontal: 16, paddingVertical: 12 },
  label: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.mute },
  field: {
    width: '100%',
    minHeight: 44,
    marginTop: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    fontFamily: 'Inter-400',
    fontSize: 14,
    color: colors.ink,
  },
  fieldFocus: { borderColor: colors.accent },
  fieldInvalid: { borderColor: colors.stampRed },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { fontFamily: 'Inter-400', fontSize: 14, lineHeight: 20, color: colors.ink },
  at: { position: 'absolute', left: 14, zIndex: 1, top: 18, fontFamily: 'Inter-400', fontSize: 14, lineHeight: 20, color: colors.mute },
  hint: { fontFamily: 'Inter-400', fontSize: 11, lineHeight: 14, color: colors.mute, marginTop: 6 },
  noAccount: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 19.5, color: colors.mute, textAlign: 'center', paddingHorizontal: 16 },
  sheetTitle: { ...tx('title'), color: colors.ink, marginBottom: 8 },
  countryRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countryText: { fontSize: 15, lineHeight: 21.75 },
})
