import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { OdooClient } from '../src/client/odoo.js'
import { getCustomerBalance, searchCustomers } from '../src/tools/customers.js'
import { MockOdooServer } from '../src/mock/odoo-server.js'

describe('customers tools', () => {
  const mock = new MockOdooServer()
  let client: OdooClient

  beforeAll(async () => {
    const url = await mock.start()
    client = new OdooClient({ url, db: 'test', apiKey: 'test-key' })
  })

  afterAll(() => mock.stop())

  describe('getCustomerBalance', () => {
    it('returns balance for existing partner', async () => {
      const balance = await getCustomerBalance(client, { partner_id: 1 })
      expect(balance.credit_limit).toBe(5000)
      expect(balance.outstanding).toBe(1250.5)
      expect(typeof balance.overdue).toBe('number')
    })

    it('throws for non-existent partner', async () => {
      await expect(
        getCustomerBalance(client, { partner_id: 99999 })
      ).rejects.toThrow('not found')
    })

    it('overdue is 0 when no past-due invoices exist', async () => {
      const balance = await getCustomerBalance(client, { partner_id: 2 })
      expect(balance.overdue).toBe(0)
    })
  })

  describe('searchCustomers', () => {
    it('finds customers by partial name', async () => {
      const results = await searchCustomers(client, { query: 'Acme', limit: 10 })
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toContain('Acme')
    })

    it('returns empty array for no matches', async () => {
      const results = await searchCustomers(client, { query: 'ZZZNoMatch999', limit: 10 })
      expect(results).toHaveLength(0)
    })

    it('respects limit', async () => {
      const results = await searchCustomers(client, { query: 'Corp', limit: 1 })
      expect(results.length).toBeLessThanOrEqual(1)
    })

    it('returned customers have required fields', async () => {
      const results = await searchCustomers(client, { query: 'Acme', limit: 5 })
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('name')
      expect(results[0]).toHaveProperty('credit')
    })
  })
})
