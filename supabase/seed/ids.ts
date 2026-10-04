import { createHash } from 'node:crypto'

// Namespace DNS estándar de RFC 4122 (el nombre solo necesita ser fijo).
const NAMESPACE = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex')

/** UUID v5 determinista a partir del slug: mismo slug, mismo id en cualquier entorno. */
export function articleId(slug: string): string {
  const hash = createHash('sha1').update(NAMESPACE).update(`faro:article:${slug}`).digest()
  hash[6] = (hash[6] & 0x0f) | 0x50 // versión 5
  hash[8] = (hash[8] & 0x3f) | 0x80 // variante RFC 4122
  const h = hash.subarray(0, 16).toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}
