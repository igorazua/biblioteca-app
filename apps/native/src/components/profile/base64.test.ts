import { describe, expect, it } from 'vitest'
import { base64ToBytes } from './base64'

describe('base64ToBytes', () => {
  it('decodifica igual que Buffer, con y sin relleno', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 100, 1023]) {
      const raw = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256)
      const b64 = Buffer.from(raw).toString('base64')
      expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(raw))
      expect(Array.from(base64ToBytes(b64.replace(/=+$/, '')))).toEqual(Array.from(raw))
    }
  })
})
