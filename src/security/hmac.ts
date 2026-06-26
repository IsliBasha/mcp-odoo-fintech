import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verifies Odoo webhook HMAC-SHA256 signature.
 * Timing-safe comparison prevents timing attacks.
 */
export function verifyOdooSignature(secret: string, rawBody: Buffer, headerSig: string): boolean {
  // TODO P1.3: computed = createHmac('sha256', secret).update(rawBody).digest('hex')
  //            return timingSafeEqual(Buffer.from(computed), Buffer.from(headerSig))
  void secret; void rawBody; void headerSig; void createHmac; void timingSafeEqual
  throw new Error('Not implemented')
}
