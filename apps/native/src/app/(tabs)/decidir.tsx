import { useRef, type ComponentRef } from 'react'
import { ScrollView } from 'react-native'
import { useScrollToTop } from 'expo-router'
import { ScreenTitle } from '../../components/ScreenTitle'

// Sin construir (fase 1): solo el título. WIZARD_NAME = «Decidir».
export default function Decidir() {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null)
  useScrollToTop(ref)
  return (
    <ScrollView ref={ref} contentInsetAdjustmentBehavior="never">
      <ScreenTitle label="DECIDIR" title="Decidir" />
    </ScrollView>
  )
}
