import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { OdooClient, OdooError } from '../src/client/odoo.js'
import { MockOdooServer } from '../src/mock/odoo-server.js'

describe('OdooClient', () => {
  const mock = new MockOdooServer()
  let baseURL: string
  let client: OdooClient

  beforeAll(async () => {
    baseURL = await mock.start()
    client = new OdooClient({ url: baseURL, db: 'test', apiKey: 'test-key' })
  })

  afterAll(() => mock.stop())

  describe('authenticate', () => {
    it('returns true when credentials are accepted', async () => {
      expect(await client.authenticate()).toBe(true)
    })

    it('returns false on network error', async () => {
      const badClient = new OdooClient({ url: 'http://localhost:1', db: 'test', apiKey: 'bad' })
      expect(await badClient.authenticate()).toBe(false)
    })
  })

  describe('callKw', () => {
    it('sends correct JSON-RPC 2.0 envelope and receives result', async () => {
      const result = await client.callKw<Record<string, unknown>>('res.users', 'context_get')
      expect(result).toMatchObject({ uid: 1, lang: 'en_US' })
    })

    it('throws OdooError on server error response', async () => {
      await expect(
        client.callKw('nonexistent.model', 'bad_method')
      ).rejects.toThrow(OdooError)
    })

    it('OdooError has name and data properties', async () => {
      try {
        await client.callKw('nonexistent.model', 'bad_method')
      } catch (e) {
        expect(e).toBeInstanceOf(OdooError)
        const odooErr = e as OdooError
        expect(odooErr.name).toBe('OdooError')
        expect(odooErr.data).toBeDefined()
      }
    })
  })

  describe('searchRead', () => {
    it('returns array of records with requested fields', async () => {
      const partners = await client.searchRead<{ id: number; name: string }>(
        'res.partner',
        [['customer_rank', '>', 0]],
        { fields: ['id', 'name'] }
      )
      expect(partners.length).toBeGreaterThan(0)
      expect(partners[0]).toHaveProperty('id')
      expect(partners[0]).toHaveProperty('name')
    })

    it('filters by domain correctly', async () => {
      const partners = await client.searchRead<{ id: number; name: string }>(
        'res.partner',
        [['id', '=', 1]],
        { fields: ['id', 'name'] }
      )
      expect(partners).toHaveLength(1)
      expect(partners[0].id).toBe(1)
    })

    it('respects limit option', async () => {
      const partners = await client.searchRead<{ id: number }>(
        'res.partner',
        [['customer_rank', '>', 0]],
        { fields: ['id'], limit: 1 }
      )
      expect(partners).toHaveLength(1)
    })

    it('returns empty array for no matches', async () => {
      const partners = await client.searchRead<{ id: number }>(
        'res.partner',
        [['id', '=', 99999]],
        { fields: ['id'] }
      )
      expect(partners).toHaveLength(0)
    })
  })
})
