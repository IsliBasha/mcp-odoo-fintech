import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

// TODO P1.5: Register all tools and start webhook Express server in background
const server = new McpServer({ name: 'mcp-odoo-fintech', version: '0.1.0' })
const transport = new StdioServerTransport()

server.connect(transport).catch((err: Error) => {
  process.stderr.write(`Fatal: ${err.message}\n`)
  process.exit(1)
})
