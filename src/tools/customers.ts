import { z } from 'zod'
import type { OdooClient } from '../client/odoo.js'

export const GetCustomerBalanceInput = z.object({
  partner_id: z.number().int().positive(),
})

export const SearchCustomersInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).default(10),
})

export interface CustomerBalance {
  credit_limit: number
  outstanding: number
  overdue: number
}

export interface Customer {
  id: number
  name: string
  email: string | false
  phone: string | false
  credit: number
  credit_limit: number
}

interface PartnerRow {
  id: number
  credit: number
  credit_limit: number
}

interface OverdueRow {
  amount_residual: number
}

export async function getCustomerBalance(
  client: OdooClient,
  input: z.infer<typeof GetCustomerBalanceInput>
): Promise<CustomerBalance> {
  const today = new Date().toISOString().split('T')[0]

  const [partners, overdueInvoices] = await Promise.all([
    client.searchRead<PartnerRow>('res.partner', [['id', '=', input.partner_id]], {
      fields: ['id', 'credit', 'credit_limit'],
      limit: 1,
    }),
    client.searchRead<OverdueRow>(
      'account.move',
      [
        ['partner_id', '=', input.partner_id],
        ['move_type', '=', 'out_invoice'],
        ['state', '=', 'posted'],
        ['payment_state', '!=', 'paid'],
        ['invoice_date_due', '<', today],
      ],
      { fields: ['amount_residual'] }
    ),
  ])

  if (partners.length === 0) {
    throw new Error(`Partner ${input.partner_id} not found`)
  }

  const partner = partners[0]
  const overdue = overdueInvoices.reduce((sum, inv) => sum + inv.amount_residual, 0)

  return {
    credit_limit: partner.credit_limit,
    outstanding: partner.credit,
    overdue,
  }
}

export async function searchCustomers(
  client: OdooClient,
  input: z.infer<typeof SearchCustomersInput>
): Promise<Customer[]> {
  return client.searchRead<Customer>(
    'res.partner',
    [
      ['active', '=', true],
      ['customer_rank', '>', 0],
      ['name', 'ilike', input.query],
    ],
    {
      fields: ['id', 'name', 'email', 'phone', 'credit', 'credit_limit'],
      limit: input.limit,
    }
  )
}
