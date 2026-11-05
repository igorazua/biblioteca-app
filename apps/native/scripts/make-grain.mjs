// Genera assets/grain.png: 160x160 px de ruido blanco/negro con alfa variable, para el grano de D10.
// Sin dependencias: PNG RGBA escrito a mano con node:zlib. Determinista (PRNG con semilla).
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const N = 160
let s = 0x9e3779b9
const rnd = () => {
  s ^= s << 13; s >>>= 0
  s ^= s >>> 17
  s ^= s << 5; s >>>= 0
  return s / 4294967296
}

const raw = Buffer.alloc((N * 4 + 1) * N)
for (let y = 0; y < N; y++) {
  const row = y * (N * 4 + 1)
  raw[row] = 0 // filtro: ninguno
  for (let x = 0; x < N; x++) {
    const i = row + 1 + x * 4
    const v = rnd() < 0.5 ? 0 : 255
    const a = Math.round(rnd() ** 2 * 200) // sesgado a alfa bajo: grano fino, sin aclarar el fondo
    raw[i] = v; raw[i + 1] = v; raw[i + 2] = v; raw[i + 3] = a
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'grain.png')
writeFileSync(out, png)
console.log(`make-grain: ${out} (${png.length} bytes)`)
