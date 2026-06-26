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

// TODO P1.2: model = account.move, move_type = out_invoice
export async function searchInvoices(
  _client: OdooClient,
  _input: z.infer<typeof SearchInvoicesInput>
): Promise<Invoice[]> {
  throw new Error('Not implemented')
}
