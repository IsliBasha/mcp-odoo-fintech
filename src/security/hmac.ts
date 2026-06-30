import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyOdooSignature(secret: string, rawBody: Buffer, headerSig: string): boolean {
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(computed)
  const b = Buffer.from(headerSig)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
