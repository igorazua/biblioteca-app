// Genera los iconos PNG de la PWA sin dependencias (zlib + CRC a mano).
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x / size, y / size)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
const BG = [14, 14, 16], AMBER = [245, 181, 68], PAPER = [250, 232, 196]
// Tres lomos de libro sobre una balda. `scale` reduce el dibujo (zona segura del icono maskable).
const books = (scale) => (u, v) => {
  const x = (u - 0.5) / scale + 0.5, y = (v - 0.5) / scale + 0.5
  const shelf = x > 0.17 && x < 0.83 && y > 0.74 && y < 0.78
  const spines = [[0.22, 0.34, 0.3], [0.37, 0.49, 0.22], [0.52, 0.64, 0.3]]
  for (const [a, b, top] of spines) if (x > a && x < b && y > top && y < 0.74) return AMBER
  if (x > 0.68 && x < 0.78 && y > 0.36 && y < 0.74 && (y - 0.36) / 0.38 + (x - 0.68) / 0.1 * 0.2 > 0) return PAPER
  return shelf ? PAPER : BG
}
writeFileSync('public/icon-192.png', png(192, books(1)))
writeFileSync('public/icon-512.png', png(512, books(1)))
writeFileSync('public/icon-maskable-512.png', png(512, books(0.72)))
writeFileSync('public/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0E0E10"/><rect x="22" y="30" width="12" height="44" fill="#F5B544"/><rect x="37" y="22" width="12" height="52" fill="#F5B544"/><rect x="52" y="30" width="12" height="44" fill="#F5B544"/><rect x="68" y="36" width="10" height="38" fill="#FAE8C4" transform="rotate(8 73 74)"/><rect x="17" y="74" width="66" height="4" fill="#FAE8C4"/></svg>`)
console.log('iconos generados')
