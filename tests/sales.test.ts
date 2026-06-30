import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { OdooClient } from '../src/client/odoo.js'
import { createSalesOrder } from '../src/tools/sales.js'
import { MockOdooServer } from '../src/mock/odoo-server.js'

describe('createSalesOrder', () => {
  const mock = new MockOdooServer()
  let client: OdooClient

  beforeAll(async () => {
    const url = await mock.start()
    client = new OdooClient({ url, db: 'test', apiKey: 'test-key' })
  })

  afterAll(() => mock.stop())

  beforeEach(() => mock.resetOrders())

  it('creates an order and returns id, name, and total', async () => {
    const result = await createSalesOrder(client, {
      partner_id: 1,
      product_lines: [{ product_id: 10, qty: 2, price_unit: 100 }],
    })

    expect(result.order_id).toBeGreaterThan(0)
    expect(result.order_name).toMatch(/^SO\//)
    expect(result.total_amount).toBe(200)
  })

  it('calculates total correctly across multiple lines', async () => {
    const result = await createSalesOrder(client, {
      partner_id: 1,
      product_lines: [
        { product_id: 10, qty: 2, price_unit: 50 },
        { product_id: 11, qty: 1, price_unit: 300 },
      ],
    })

    expect(result.total_amount).toBe(400)
  })

  it('each call produces a unique order id', async () => {
    const r1 = await createSalesOrder(client, {
      partner_id: 1,
      product_lines: [{ product_id: 10, qty: 1, price_unit: 10 }],
    })
    const r2 = await createSalesOrder(client, {
      partner_id: 1,
      product_lines: [{ product_id: 10, qty: 1, price_unit: 10 }],
    })

    expect(r1.order_id).not.toBe(r2.order_id)
  })

  it('rejects empty product_lines via Zod schema', async () => {
    const { CreateSalesOrderInput } = await import('../src/tools/sales.js')
    expect(() =>
      CreateSalesOrderInput.parse({ partner_id: 1, product_lines: [] })
    ).toThrow()
  })
})
