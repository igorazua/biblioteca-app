// Importaciones `?raw` de vitest en los tests (fixtures de importación).
declare module '*?raw' {
  const content: string
  export default content
}
