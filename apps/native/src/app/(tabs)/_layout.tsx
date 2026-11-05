import { Tabs } from 'expo-router/js-tabs'
import { TabBar } from '../../components/TabBar'
import { colors } from '../../theme'

/**
 * Las cinco pestañas de TabBar.tsx. D19: se quedan montadas (conservan scroll, mazo y duelo en curso).
 * D17: atrás de Android vuelve a la pestaña inicial y desde ella sale de la app.
 */
export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="initialRoute"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Biblioteca' }} />
      <Tabs.Screen name="descubrir" options={{ title: 'Descubrir' }} />
      <Tabs.Screen name="decidir" options={{ title: 'Decidir' }} />
      <Tabs.Screen name="comparar" options={{ title: '¡Duelos!' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  )
}
