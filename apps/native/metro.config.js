// Monorepo: expo/metro-config ya vigila la raíz del workspace y resuelve node_modules hoisted.
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// D27: los datos del catálogo (JSON copiados con extensión .data) se cargan como assets, no dentro del JS.
config.resolver.assetExts = [...config.resolver.assetExts, 'data']

module.exports = config
