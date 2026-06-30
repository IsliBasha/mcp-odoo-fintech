import { z } from 'zod'
import type { OdooClient } from '../client/odoo.js'

export const SearchInvoicesInput = z.object({
  customer_name: z.string().optional(),
  state: z.enum(['draft', 'posted', 'paid']).optional(),
  limit: z.number().int().positive().max(100).default(10),
})

export interface Invoice {
  id: number
  name: string
  amount_total: number
  state: string
  date: string
  partner: { id: number; name: string }
}

interface InvoiceRow {
  id: number
  name: string
  amount_total: number
  state: string
  invoice_date: string | false
  partner_id: [number, string] | false
  payment_state: string
}

export async function searchInvoices(
  client: OdooClient,
  input: z.infer<typeof SearchInvoicesInput>
): Promise<Invoice[]> {
  const domain: unknown[][] = [['move_type', '=', 'out_invoice']]

  if (input.customer_name) {
    domain.push(['partner_id.name', 'ilike', input.customer_name])
  }

  if (input.state === 'paid') {
    domain.push(['payment_state', '=', 'paid'])
  } else if (input.state) {
    domain.push(['state', '=', input.state])
  }

  const rows = await client.searchRead<InvoiceRow>('account.move', domain, {
    fields: ['id', 'name', 'amount_total', 'state', 'invoice_date', 'partner_id', 'payment_state'],
    limit: input.limit,
    order: 'invoice_date desc',
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    amount_total: row.amount_total,
    state: row.payment_state === 'paid' ? 'paid' : row.state,
    date: row.invoice_date || '',
    partner: row.partner_id
      ? { id: row.partner_id[0], name: row.partner_id[1] }
      : { id: 0, name: '' },
  }))
}
