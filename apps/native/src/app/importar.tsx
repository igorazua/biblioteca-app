import { Redirect } from 'expo-router'

// Import.tsx de la PWA: «Importar» pasó a ser «Conectar» (docs/CONECTAR.md). Se mantiene la ruta antigua para que los enlaces sigan funcionando.
export default function Importar() {
  return <Redirect href="/conectar" />
}
