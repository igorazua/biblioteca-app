const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Base64 → bytes, sin depender de `atob` (en React Native, subir un `Blob` suele llegar vacío; los bytes no). */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let o = 0
  for (let i = 0; i < clean.length; i += 4) {
    const a = ALPHABET.indexOf(clean[i])
    const b = ALPHABET.indexOf(clean[i + 1])
    const c = i + 2 < clean.length ? ALPHABET.indexOf(clean[i + 2]) : -1
    const d = i + 3 < clean.length ? ALPHABET.indexOf(clean[i + 3]) : -1
    out[o++] = (a << 2) | (b >> 4)
    if (c >= 0) out[o++] = ((b & 15) << 4) | (c >> 2)
    if (d >= 0) out[o++] = ((c & 3) << 6) | d
  }
  return out.subarray(0, o)
}

