import express, { type Request, type Response } from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OdooClient, getOdooClient } from '../client/odoo.js'
import { getCustomerBalance, searchCustomers, GetCustomerBalanceInput, SearchCustomersInput } from '../tools/customers.js'
import { searchInvoices, SearchInvoicesInput } from '../tools/invoices.js'
import { createSalesOrder, CreateSalesOrderInput } from '../tools/sales.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TOOLS = [
  {
    name: 'search_invoices',
    description: 'Search customer invoices with optional filters',
    schema: SearchInvoicesInput,
  },
  {
    name: 'get_customer_balance',
    description: 'Get outstanding balance and credit limit for a customer',
    schema: GetCustomerBalanceInput,
  },
  {
    name: 'create_sales_order',
    description: 'Create a new sales order with one or more product lines',
    schema: CreateSalesOrderInput,
  },
  {
    name: 'search_customers',
    description: 'Search customers by name',
    schema: SearchCustomersInput,
  },
]

async function executeTool(
  name: string,
  input: unknown,
  client: OdooClient
): Promise<unknown> {
  switch (name) {
    case 'search_invoices':
      return searchInvoices(client, SearchInvoicesInput.parse(input))
    case 'get_customer_balance':
      return getCustomerBalance(client, GetCustomerBalanceInput.parse(input))
    case 'create_sales_order':
      return createSalesOrder(client, CreateSalesOrderInput.parse(input))
    case 'search_customers':
      return searchCustomers(client, SearchCustomersInput.parse(input))
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

export function createInspectorApp(overrideClient?: OdooClient) {
  const app = express()
  app.use(express.json())

  const publicDir = path.join(__dirname, 'public')
  app.use(express.static(publicDir))

  app.get('/api/tools', (_req: Request, res: Response) => {
    res.json(
      TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        schema: t.schema._def,
      }))
    )
  })

  app.post('/api/tools/:name', async (req: Request, res: Response) => {
    const name = String(req.params['name'])
    const start = Date.now()

    try {
      const client = overrideClient ?? getOdooClient()
      const result = await executeTool(name, req.body, client)
      res.json({ data: result, executionTime: Date.now() - start })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      res.status(400).json({ error: message, executionTime: Date.now() - start })
    }
  })

  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const client = overrideClient ?? getOdooClient()
      const connected = await client.authenticate()
      res.json({
        status: 'ok',
        odoo: connected ? 'connected' : 'disconnected',
        mock: !!overrideClient,
      })
    } catch {
      res.json({ status: 'ok', odoo: 'disconnected', mock: false })
    }
  })

  return app
}
