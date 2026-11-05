// Monorepo: expo/metro-config ya vigila la raíz del workspace y resuelve node_modules hoisted.
const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// D27: los datos del catálogo (JSON copiados con extensión .data) se cargan como assets, no dentro del JS.
config.resolver.assetExts = [...config.resolver.assetExts, 'data']

// La PWA de la raíz usa react 19.3.1 y esta app 19.3.0 (la que exige el renderizador de React Native 0.88). Para que todo el
// bundle use una sola copia, `react` se resuelve siempre desde apps/native, también para los paquetes de la raíz.
const origin = path.join(__dirname, 'package.json')
const upstream = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const ctx = moduleName === 'react' || moduleName.startsWith('react/') ? { ...context, originModulePath: origin } : context
  return upstream ? upstream(ctx, moduleName, platform) : ctx.resolveRequest(ctx, moduleName, platform)
}

module.exports = config
