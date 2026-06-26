import { z } from 'zod'
import type { OdooClient } from '../client/odoo.js'

export const GetCustomerBalanceInput = z.object({ partner_id: z.number().int().positive() })
export const SearchCustomersInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).default(10),
})

export interface CustomerBalance { credit_limit: number; outstanding: number; overdue: number }

// TODO P1.2
export async function getCustomerBalance(
  _client: OdooClient,
  _input: z.infer<typeof GetCustomerBalanceInput>
): Promise<CustomerBalance> {
  throw new Error('Not implemented')
}
