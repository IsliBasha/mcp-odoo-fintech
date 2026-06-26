import { z } from 'zod'
import type { OdooClient } from '../client/odoo.js'

export const CreateSalesOrderInput = z.object({
  partner_id: z.number().int().positive(),
  product_lines: z.array(z.object({
    product_id: z.number().int().positive(),
    qty: z.number().positive(),
    price_unit: z.number().positive(),
  })).min(1),
})

export interface SalesOrderResult {
  order_id: number
  order_name: string
  total_amount: number
}

// TODO P1.2: Create sale.order + sale.order.line records
export async function createSalesOrder(
  _client: OdooClient,
  _input: z.infer<typeof CreateSalesOrderInput>
): Promise<SalesOrderResult> {
  throw new Error('Not implemented')
}
