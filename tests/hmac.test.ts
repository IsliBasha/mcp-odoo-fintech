import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyOdooSignature } from '../src/security/hmac.js'

function sign(secret: string, body: string): string {
  return createHmac('sha256', secret).update(Buffer.from(body)).digest('hex')
}

describe('verifyOdooSignature', () => {
  const SECRET = 'test-webhook-secret'
  const BODY = '{"event":"sale.order","id":42}'

  it('returns true for a valid signature', () => {
    const sig = sign(SECRET, BODY)
    expect(verifyOdooSignature(SECRET, Buffer.from(BODY), sig)).toBe(true)
  })

  it('returns false for a tampered body', () => {
    const sig = sign(SECRET, BODY)
    expect(verifyOdooSignature(SECRET, Buffer.from(BODY + ' '), sig)).toBe(false)
  })

  it('returns false for a wrong secret', () => {
    const sig = sign('wrong-secret', BODY)
    expect(verifyOdooSignature(SECRET, Buffer.from(BODY), sig)).toBe(false)
  })

  it('returns false for an empty signature string', () => {
    expect(verifyOdooSignature(SECRET, Buffer.from(BODY), '')).toBe(false)
  })

  it('handles binary body content', () => {
    const binaryBody = Buffer.from([0x00, 0x01, 0x02, 0xff])
    const sig = createHmac('sha256', SECRET).update(binaryBody).digest('hex')
    expect(verifyOdooSignature(SECRET, binaryBody, sig)).toBe(true)
  })
})
