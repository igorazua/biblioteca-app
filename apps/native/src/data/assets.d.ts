// Los datos se copian con extensión .data (scripts/copy-data.mjs) y Metro los trata como assets (metro.config.js).
declare module '*.data' {
  const moduleId: number
  export default moduleId
}
