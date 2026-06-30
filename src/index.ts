import 'dotenv/config'
import http from 'node:http'
import express from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { OdooClient, getOdooClient } from './client/odoo.js'
import { searchInvoices, SearchInvoicesInput } from './tools/invoices.js'
import { getCustomerBalance, searchCustomers, GetCustomerBalanceInput, SearchCustomersInput } from './tools/customers.js'
import { createSalesOrder, CreateSalesOrderInput } from './tools/sales.js'
import { createWebhookRouter } from './webhook/server.js'
import { createInspectorApp } from './inspector/server.js'

function mcpResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

async function startHttpServer(overrideClient?: OdooClient): Promise<void> {
  const port = parseInt(process.env.PORT ?? '3001', 10)
  const app = express()

  app.use('/webhook', createWebhookRouter())

  const inspector = createInspectorApp(overrideClient)
  app.use('/', inspector)

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(port, resolve))
  process.stderr.write(`[inspector] http://localhost:${port}\n`)
}

async function startMcpServer(client: OdooClient): Promise<void> {
  const server = new McpServer({ name: 'mcp-odoo-fintech', version: '0.1.0' })

  server.tool(
    'search_invoices',
    'Search customer invoices. Filter by customer_name, state (draft/posted/paid), and limit.',
    SearchInvoicesInput.shape,
    async (input) => {
      const result = await searchInvoices(client, SearchInvoicesInput.parse(input))
      return mcpResult(result)
    }
  )

  server.tool(
    'get_customer_balance',
    'Get credit limit, outstanding balance, and overdue amount for a customer by partner_id.',
    GetCustomerBalanceInput.shape,
    async (input) => {
      const result = await getCustomerBalance(client, GetCustomerBalanceInput.parse(input))
      return mcpResult(result)
    }
  )

  server.tool(
    'create_sales_order',
    'Create a sales order for a customer with one or more product lines.',
    CreateSalesOrderInput.shape,
    async (input) => {
      const result = await createSalesOrder(client, CreateSalesOrderInput.parse(input))
      return mcpResult(result)
    }
  )

  server.tool(
    'search_customers',
    'Search active customers by name (case-insensitive partial match).',
    SearchCustomersInput.shape,
    async (input) => {
      const result = await searchCustomers(client, SearchCustomersInput.parse(input))
      return mcpResult(result)
    }
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

async function main(): Promise<void> {
  let client: OdooClient | undefined

  if (process.env.MOCK_ODOO === 'true' || !process.env.ODOO_URL || process.env.ODOO_URL === 'https://your-odoo.com') {
    const { MockOdooServer } = await import('./mock/odoo-server.js')
    const mock = new MockOdooServer()
    const mockUrl = await mock.start(8069)
    process.stderr.write(`[mock-odoo] ${mockUrl}\n`)
    client = new OdooClient({ url: mockUrl, db: 'mock', apiKey: 'mock-key' })
  } else {
    client = getOdooClient()
  }

  await Promise.all([startHttpServer(client), startMcpServer(client)])
}

main().catch((err: Error) => {
  process.stderr.write(`Fatal: ${err.message}\n`)
  process.exit(1)
})
