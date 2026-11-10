import { randomUUID } from 'node:crypto'

const VAT_RATE = 20 // Demonstration assumption: product prices include standard-rate UK VAT.

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

export async function listOrders(pool, limit = 100) {
  const safeLimit = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 100))
  const result = await pool.query(
    `SELECT
       o.id,
       o.order_number AS "orderNumber",
       o.customer_name AS "customerName",
       o.status,
       o.source,
       o.order_date AS "orderDate",
       o.subtotal_gross::float8 AS "subtotalGross",
       o.discount_total_gross::float8 AS "discountTotalGross",
       o.vat_total::float8 AS "vatTotal",
       o.total_gross::float8 AS "totalGross",
       COUNT(oi.id)::int AS "lineCount",
       COALESCE(SUM(oi.quantity), 0)::int AS units
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.source <> 'historical'
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [safeLimit],
  )
  return result.rows
}

export async function getOrder(pool, orderId) {
  const header = await pool.query(
    `SELECT id, order_number AS "orderNumber", customer_name AS "customerName",
            status, source, order_date AS "orderDate", currency,
            subtotal_gross::float8 AS "subtotalGross",
            discount_total_gross::float8 AS "discountTotalGross",
            vat_total::float8 AS "vatTotal", total_gross::float8 AS "totalGross",
            cancelled_at AS "cancelledAt", created_at AS "createdAt"
     FROM orders WHERE id = $1`,
    [orderId],
  )
  if (!header.rowCount) return null

  const items = await pool.query(
    `SELECT id, product_id AS "productId", sku_snapshot AS sku,
            product_name_snapshot AS "productName", brand_snapshot AS brand,
            category_snapshot AS category, quantity,
            unit_price_gross::float8 AS "unitPriceGross",
            unit_cost::float8 AS "unitCost", vat_rate::float8 AS "vatRate",
            discount_gross::float8 AS "discountGross",
            line_total_gross::float8 AS "lineTotalGross",
            line_net_revenue::float8 AS "lineNetRevenue",
            vat_amount::float8 AS "vatAmount"
     FROM order_items WHERE order_id = $1 ORDER BY id`,
    [orderId],
  )
  return { ...header.rows[0], items: items.rows }
}

export async function createOrder(pool, payload) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 20) {
    throw httpError(400, 'An order must contain between 1 and 20 product lines.')
  }

  const combined = new Map()
  for (const item of payload.items) {
    const productId = typeof item?.productId === 'string' ? item.productId.trim() : ''
    const quantity = Number(item?.quantity)
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw httpError(400, 'Each order line needs a product ID and a whole-number quantity from 1 to 50.')
    }
    combined.set(productId, (combined.get(productId) || 0) + quantity)
  }

  for (const quantity of combined.values()) {
    if (quantity > 100) throw httpError(400, 'The maximum combined quantity per product is 100.')
  }

  const ids = [...combined.keys()]
  const source = payload.source === 'simulator' ? 'simulator' : 'admin'
  const customerName = typeof payload.customerName === 'string' && payload.customerName.trim()
    ? payload.customerName.trim().slice(0, 120)
    : 'Guest customer'
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Lock every requested product in a stable order. This serialises competing
    // checkouts and prevents two orders from selling the same final unit.
    const locked = await client.query(
      `SELECT id, sku, name, brand, category, price::float8 AS price,
              cost::float8 AS cost, stock
       FROM products
       WHERE id = ANY($1::text[])
       ORDER BY id
       FOR UPDATE`,
      [ids],
    )
    if (locked.rowCount !== ids.length) {
      const found = new Set(locked.rows.map((row) => row.id))
      const missing = ids.find((id) => !found.has(id))
      throw httpError(404, `Product ${missing} was not found.`)
    }

    const productMap = new Map(locked.rows.map((row) => [row.id, row]))
    for (const [id, quantity] of combined.entries()) {
      const product = productMap.get(id)
      if (Number(product.stock) < quantity) {
        throw httpError(409, `Insufficient stock for ${product.sku}. Available: ${product.stock}; requested: ${quantity}.`)
      }
    }

    const lines = ids.map((id) => {
      const product = productMap.get(id)
      const quantity = combined.get(id)
      const lineTotalGross = money(Number(product.price) * quantity)
      const vatAmount = money(lineTotalGross * VAT_RATE / (100 + VAT_RATE))
      return {
        product,
        quantity,
        unitPriceGross: money(product.price),
        unitCost: money(product.cost),
        lineTotalGross,
        vatAmount,
        lineNetRevenue: money(lineTotalGross - vatAmount),
      }
    })

    const subtotalGross = money(lines.reduce((sum, line) => sum + line.lineTotalGross, 0))
    const vatTotal = money(lines.reduce((sum, line) => sum + line.vatAmount, 0))
    const totalGross = subtotalGross
    const orderNumber = `LB-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomUUID().slice(0, 6).toUpperCase()}`

    const orderResult = await client.query(
      `INSERT INTO orders (
         order_number, customer_name, status, source, subtotal_gross,
         discount_total_gross, vat_total, total_gross
       ) VALUES ($1, $2, 'completed', $3, $4, 0, $5, $4)
       RETURNING id`,
      [orderNumber, customerName, source, subtotalGross, vatTotal],
    )
    const orderId = orderResult.rows[0].id

    for (const line of lines) {
      const product = line.product
      const previousQuantity = Number(product.stock)
      const newQuantity = previousQuantity - line.quantity

      await client.query(
        `INSERT INTO order_items (
           order_id, product_id, sku_snapshot, product_name_snapshot,
           brand_snapshot, category_snapshot, quantity, unit_price_gross,
           unit_cost, vat_rate, discount_gross, line_total_gross,
           line_net_revenue, vat_amount
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12,$13)`,
        [
          orderId, product.id, product.sku, product.name, product.brand,
          product.category, line.quantity, line.unitPriceGross, line.unitCost,
          VAT_RATE, line.lineTotalGross, line.lineNetRevenue, line.vatAmount,
        ],
      )

      await client.query(
        'UPDATE products SET stock = $2, updated_at = NOW() WHERE id = $1',
        [product.id, newQuantity],
      )
      await client.query(
        `INSERT INTO inventory_movements
           (product_id, movement_type, quantity_delta, previous_quantity, new_quantity, note)
         VALUES ($1, 'sale', $2, $3, $4, $5)`,
        [product.id, -line.quantity, previousQuantity, newQuantity, `Order ${orderNumber}`],
      )
    }

    await client.query('COMMIT')
    return await getOrder(pool, orderId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function cancelOrder(pool, orderId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const orderResult = await client.query(
      'SELECT id, order_number AS "orderNumber", status, source FROM orders WHERE id = $1 FOR UPDATE',
      [orderId],
    )
    if (!orderResult.rowCount) throw httpError(404, 'Order not found.')
    const order = orderResult.rows[0]
    if (order.source === 'historical') throw httpError(409, 'Historical orders are part of the locked synthetic dataset and cannot be cancelled or restocked through live inventory.')
    if (order.status !== 'completed') throw httpError(409, 'Only completed orders can be cancelled.')

    const itemResult = await client.query(
      `SELECT product_id AS "productId", quantity
       FROM order_items WHERE order_id = $1 ORDER BY product_id`,
      [orderId],
    )
    const productIds = itemResult.rows.map((item) => item.productId)
    const products = await client.query(
      'SELECT id, stock FROM products WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE',
      [productIds],
    )
    const stockMap = new Map(products.rows.map((row) => [row.id, Number(row.stock)]))

    for (const item of itemResult.rows) {
      const previousQuantity = stockMap.get(item.productId)
      if (previousQuantity === undefined) throw httpError(409, `Product ${item.productId} no longer exists.`)
      const newQuantity = previousQuantity + Number(item.quantity)
      await client.query(
        'UPDATE products SET stock = $2, updated_at = NOW() WHERE id = $1',
        [item.productId, newQuantity],
      )
      await client.query(
        `INSERT INTO inventory_movements
           (product_id, movement_type, quantity_delta, previous_quantity, new_quantity, note)
         VALUES ($1, 'return', $2, $3, $4, $5)`,
        [item.productId, Number(item.quantity), previousQuantity, newQuantity, `Restocked after cancellation of ${order.orderNumber}`],
      )
      stockMap.set(item.productId, newQuantity)
    }

    await client.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
      [orderId],
    )
    await client.query('COMMIT')
    return await getOrder(pool, orderId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
