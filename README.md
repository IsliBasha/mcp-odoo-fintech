# mcp-odoo-fintech

TypeScript MCP server connecting Claude Desktop to Odoo via the JSON-2 API (replaces deprecated XML-RPC).

> **Screenshot**: *(add Claude Desktop tool execution screenshot before pushing)*

[![CI](https://github.com/IsliBasha/mcp-odoo-fintech/actions/workflows/ci.yml/badge.svg)](https://github.com/IsliBasha/mcp-odoo-fintech/actions)

## Architecture

```
Claude Desktop ──stdio──► MCP Server ──JSON-2──► Odoo 19
                               |
                          Redis Cache + Rate Limiter
                          Express :3001 (webhooks)
```

## Tools

| Tool | Odoo model | Description |
|------|-----------|-------------|
| `search_invoices` | `account.move` | Filter by customer, state, date |
| `create_sales_order` | `sale.order` | Create order with line items |
| `get_customer_balance` | `res.partner` | Credit limit, outstanding, overdue |
| `search_customers` | `res.partner` | Find by name or code |
| `register_webhook` | `base.automation` | Configure Odoo event delivery |

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

## Security
- HMAC-SHA256 webhook verification (timing-safe)
- Per-tool Redis sliding-window rate limiting
- Bearer token auth — secrets via `.env` only
