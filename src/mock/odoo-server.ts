import express, { type Request, type Response } from 'express'
import http from 'node:http'

interface JsonRpcRequest {
  jsonrpc: string
  method: string
  id: number
  params: {
    model: string
    method: string
    args: unknown[]
    kwargs: Record<string, unknown>
  }
}

let orderIdSeq = 1000
let lineIdSeq = 2000

const MOCK_PARTNERS = [
  { id: 1, name: 'Acme Corp', email: 'billing@acme.com', phone: '+1-555-0100', credit: 1250.5, credit_limit: 5000, customer_rank: 1, active: true },
  { id: 2, name: 'Globex Ltd', email: 'finance@globex.com', phone: '+1-555-0200', credit: 3800.0, credit_limit: 10000, customer_rank: 1, active: true },
]

const MOCK_INVOICES = [
  { id: 101, name: 'INV/2024/00001', amount_total: 1250.5, amount_residual: 1250.5, state: 'posted', payment_state: 'not_paid', invoice_date: '2024-01-15', invoice_date_due: '2024-02-15', partner_id: [1, 'Acme Corp'], move_type: 'out_invoice' },
  { id: 102, name: 'INV/2024/00002', amount_total: 3800.0, amount_residual: 0, state: 'posted', payment_state: 'paid', invoice_date: '2024-02-01', invoice_date_due: '2024-03-01', partner_id: [2, 'Globex Ltd'], move_type: 'out_invoice' },
  { id: 103, name: 'INV/2024/00003', amount_total: 500.0, amount_residual: 500.0, state: 'draft', payment_state: 'not_paid', invoice_date: '2024-03-10', invoice_date_due: '2024-04-10', partner_id: [1, 'Acme Corp'], move_type: 'out_invoice' },
]

const MOCK_ORDERS: Array<{ id: number; name: string; partner_id: number; amount_total: number }> = []

function ok(id: number, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}

function err(id: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code: 200, message, data: { name: 'Error', message, type: 'except_osv' } } }
}

function pickFields<T extends Record<string, unknown>>(records: T[], fields: string[]): Partial<T>[] {
  if (!fields.length) return records
  return records.map((r) => {
    const out: Record<string, unknown> = {}
    for (const f of fields) out[f] = r[f]
    return out as Partial<T>
  })
}

function handleCallKw(req: JsonRpcRequest) {
  const { model, method, args, kwargs } = req.params
  const fields = (kwargs.fields as string[]) ?? []
  const limit = (kwargs.limit as number) ?? 80

  if (model === 'res.users' && method === 'context_get') {
    return ok(req.id, { uid: 1, lang: 'en_US', tz: 'UTC' })
  }

  if (model === 'res.partner' && method === 'search_read') {
    const domain = (args[0] as unknown[][]) ?? []
    let results = [...MOCK_PARTNERS]

    for (const clause of domain) {
      const [field, op, val] = clause as [string, string, unknown]
      if (field === 'id' && op === '=') results = results.filter((p) => p.id === val)
      if (field === 'name' && op === 'ilike') results = results.filter((p) => p.name.toLowerCase().includes(String(val).toLowerCase()))
      if (field === 'customer_rank' && op === '>') results = results.filter((p) => p.customer_rank > (val as number))
      if (field === 'active' && op === '=') results = results.filter((p) => p.active === val)
    }

    return ok(req.id, pickFields(results.slice(0, limit), fields))
  }

  if (model === 'account.move' && method === 'search_read') {
    const domain = (args[0] as unknown[][]) ?? []
    let results = [...MOCK_INVOICES]

    for (const clause of domain) {
      const [field, op, val] = clause as [string, string, unknown]
      if (field === 'move_type' && op === '=') results = results.filter((i) => i.move_type === val)
      if (field === 'state' && op === '=') results = results.filter((i) => i.state === val)
      if (field === 'payment_state' && op === '=') results = results.filter((i) => i.payment_state === val)
      if (field === 'payment_state' && op === '!=') results = results.filter((i) => i.payment_state !== val)
      if (field === 'partner_id' && op === '=') results = results.filter((i) => (i.partner_id as [number, string])[0] === val)
      if (field === 'partner_id.name' && op === 'ilike') results = results.filter((i) => (i.partner_id as [number, string])[1].toLowerCase().includes(String(val).toLowerCase()))
      if (field === 'invoice_date_due' && op === '<') results = results.filter((i) => i.invoice_date_due < String(val))
    }

    return ok(req.id, pickFields(results.slice(0, limit), fields))
  }

  if (model === 'sale.order' && method === 'create') {
    const vals = (args[0] as Record<string, unknown>) ?? {}
    const id = ++orderIdSeq
    const order = { id, name: `SO/${id}`, partner_id: vals.partner_id as number, amount_total: 0 }
    MOCK_ORDERS.push(order)
    return ok(req.id, id)
  }

  if (model === 'sale.order.line' && method === 'create') {
    const vals = (args[0] as Record<string, unknown>) ?? {}
    const lineId = ++lineIdSeq
    const order = MOCK_ORDERS.find((o) => o.id === vals.order_id)
    if (order) order.amount_total += (vals.price_unit as number) * (vals.product_uom_qty as number)
    return ok(req.id, lineId)
  }

  if (model === 'sale.order' && method === 'read') {
    const ids = args[0] as number[]
    const readFields = args[1] as string[]
    const results = MOCK_ORDERS.filter((o) => ids.includes(o.id))
    return ok(req.id, pickFields(results, readFields))
  }

  return err(req.id, `Mock: unhandled ${model}.${method}`)
}

export class MockOdooServer {
  private server: http.Server | null = null

  async start(port = 0): Promise<string> {
    const app = express()
    app.use(express.json())

    app.post('/web/dataset/call_kw', (req: Request, res: Response) => {
      try {
        const result = handleCallKw(req.body as JsonRpcRequest)
        res.json(result)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown'
        res.json(err((req.body as JsonRpcRequest).id ?? 0, msg))
      }
    })

    return new Promise((resolve) => {
      this.server = app.listen(port, () => {
        const addr = this.server!.address()
        const p = typeof addr === 'object' && addr ? addr.port : port
        resolve(`http://localhost:${p}`)
      })
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve()
      this.server.close((err) => (err ? reject(err) : resolve()))
    })
  }

  resetOrders(): void {
    MOCK_ORDERS.length = 0
    orderIdSeq = 1000
    lineIdSeq = 2000
  }
}
