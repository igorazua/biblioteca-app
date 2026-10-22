// «Importar» pasó a ser «Conectar» (docs/CONECTAR.md). Se mantiene la ruta antigua para que los enlaces sigan funcionando.
import { Navigate } from 'react-router-dom'

export function Import() {
  return <Navigate to="/conectar" replace />
}
