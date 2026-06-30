import { z } from 'zod'
import type { OdooClient } from '../client/odoo.js'

export const CreateSalesOrderInput = z.object({
  partner_id: z.number().int().positive(),
  product_lines: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        qty: z.number().positive(),
        price_unit: z.number().positive(),
      })
    )
    .min(1),
})

export interface SalesOrderResult {
  order_id: number
  order_name: string
  total_amount: number
}

interface SaleOrderRow {
  id: number
  name: string
  amount_total: number
}

export async function createSalesOrder(
  client: OdooClient,
  input: z.infer<typeof CreateSalesOrderInput>
): Promise<SalesOrderResult> {
  const orderId = await client.callKw<number>('sale.order', 'create', [
    { partner_id: input.partner_id },
  ])

  await Promise.all(
    input.product_lines.map((line) =>
      client.callKw<number>('sale.order.line', 'create', [
        {
          order_id: orderId,
          product_id: line.product_id,
          product_uom_qty: line.qty,
          price_unit: line.price_unit,
        },
      ])
    )
  )

  const [order] = await client.callKw<SaleOrderRow[]>('sale.order', 'read', [
    [orderId],
    ['id', 'name', 'amount_total'],
  ])

  return {
    order_id: order.id,
    order_name: order.name,
    total_amount: order.amount_total,
  }
}
