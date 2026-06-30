import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { OdooClient } from '../src/client/odoo.js'
import { searchInvoices } from '../src/tools/invoices.js'
import { MockOdooServer } from '../src/mock/odoo-server.js'

describe('searchInvoices', () => {
  const mock = new MockOdooServer()
  let client: OdooClient

  beforeAll(async () => {
    const url = await mock.start()
    client = new OdooClient({ url, db: 'test', apiKey: 'test-key' })
  })

  afterAll(() => mock.stop())

  it('returns all invoices with no filters', async () => {
    const invoices = await searchInvoices(client, { limit: 10 })
    expect(invoices.length).toBeGreaterThan(0)
  })

  it('invoice has correct shape', async () => {
    const [inv] = await searchInvoices(client, { limit: 1 })
    expect(inv).toHaveProperty('id')
    expect(inv).toHaveProperty('name')
    expect(inv).toHaveProperty('amount_total')
    expect(inv).toHaveProperty('state')
    expect(inv).toHaveProperty('date')
    expect(inv).toHaveProperty('partner')
    expect(inv.partner).toHaveProperty('id')
    expect(inv.partner).toHaveProperty('name')
  })

  it('filters by customer_name case-insensitively', async () => {
    const invoices = await searchInvoices(client, { customer_name: 'acme', limit: 10 })
    expect(invoices.length).toBeGreaterThan(0)
    for (const inv of invoices) {
      expect(inv.partner.name.toLowerCase()).toContain('acme')
    }
  })

  it('filters by state=posted', async () => {
    const invoices = await searchInvoices(client, { state: 'posted', limit: 10 })
    for (const inv of invoices) {
      expect(['posted', 'paid']).toContain(inv.state)
    }
  })

  it('filters by state=paid', async () => {
    const invoices = await searchInvoices(client, { state: 'paid', limit: 10 })
    for (const inv of invoices) {
      expect(inv.state).toBe('paid')
    }
  })

  it('filters by state=draft', async () => {
    const invoices = await searchInvoices(client, { state: 'draft', limit: 10 })
    for (const inv of invoices) {
      expect(inv.state).toBe('draft')
    }
  })

  it('returns empty array for no matches', async () => {
    const invoices = await searchInvoices(client, { customer_name: 'ZZZNoSuchCustomer', limit: 10 })
    expect(invoices).toHaveLength(0)
  })

  it('respects limit', async () => {
    const invoices = await searchInvoices(client, { limit: 1 })
    expect(invoices).toHaveLength(1)
  })
})
