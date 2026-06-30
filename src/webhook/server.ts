import express, { type Request, type Response, type NextFunction } from 'express'
import { verifyOdooSignature } from '../security/hmac.js'

function rawBodyMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', () => {
    ;(req as Request & { rawBody: Buffer }).rawBody = Buffer.concat(chunks)
    next()
  })
}

export function createWebhookRouter() {
  const router = express.Router()
  router.use(rawBodyMiddleware)

  router.post('/', (req: Request, res: Response) => {
    const secret = process.env.WEBHOOK_SECRET
    if (!secret) {
      res.status(500).json({ error: 'WEBHOOK_SECRET not configured' })
      return
    }

    const sig = req.headers['x-odoo-signature'] as string | undefined
    if (!sig) {
      res.status(401).json({ error: 'Missing X-Odoo-Signature header' })
      return
    }

    const rawBody = (req as Request & { rawBody: Buffer }).rawBody
    if (!verifyOdooSignature(secret, rawBody, sig)) {
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody.toString('utf8'))
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }

    process.stderr.write(`[webhook] received: ${JSON.stringify(payload)}\n`)
    res.status(200).json({ ok: true })
  })

  return router
}
