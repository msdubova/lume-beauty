import { randomInt, randomUUID } from 'node:crypto'

const VAT_RATE = 20
const MAX_ORDERS_PER_RUN = 100
const CUSTOMER_NAMES = [
  'Amelia Carter', 'Isla Morgan', 'Olivia Bennett', 'Freya Collins', 'Ava Thompson',
  'Lily Richardson', 'Mia Hughes', 'Sophie Walker', 'Grace Edwards', 'Ella Cooper',
  'Charlotte Bailey', 'Evie Foster', 'Ruby Mitchell', 'Ivy Brooks', 'Florence Reed',
  'Poppy James', 'Daisy Ward', 'Alice Price', 'Phoebe Gray', 'Matilda Kelly',
]

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function dateIsValid(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function createRandom(seed) {
  let state = seed >>> 0
  return function random() {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function weightedProduct(products, random, demandProfile) {
  const weighted = products.map((product) => {
    let weight = 1
    if (demandProfile === 'bestsellers') {
      weight = product.bestseller ? 4 : 0.75
      if (product.isNew) weight *= 1.1
    } else if (demandProfile === 'new-arrivals') {
      weight = product.isNew ? 4 : 0.75
      if (product.bestseller) weight *= 1.25
    } else {
      if (product.bestseller) weight *= 1.8
      if (product.isNew) weight *= 1.2
    }
    // Products with very low stock remain eligible, but are less likely to be selected.
    if (product.stock <= 3) weight *= 0.65
    return { product, weight }
  })

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  let cursor = random() * totalWeight
  for (const item of weighted) {
    cursor -= item.weight
    if (cursor <= 0) return item.product
  }
  return weighted.at(-1)?.product || null
}

function randomOrderDate(periodStart, periodEnd, random) {
  const start = Date.parse(`${periodStart}T00:00:00.000Z`)
  const end = Date.parse(`${periodEnd}T23:59:59.999Z`)
  return new Date(start + Math.floor(random() * (end - start + 1)))
}

function validatePayload(payload) {
  const ordersRequested = Number(payload?.ordersRequested)
  if (!Number.isInteger(ordersRequested) || ordersRequested < 1 || ordersRequested > MAX_ORDERS_PER_RUN) {
    throw httpError(400, `Choose between 1 and ${MAX_ORDERS_PER_RUN} orders per manual run.`)
  }

  const { periodStart, periodEnd } = payload || {}
  if (!dateIsValid(periodStart) || !dateIsValid(periodEnd)) {
    throw httpError(400, 'Choose a valid start date and end date.')
  }
  if (periodEnd < periodStart) throw httpError(400, 'The end date cannot be earlier than the start date.')

  const demandProfiles = ['balanced', 'bestsellers', 'new-arrivals']
  const demandProfile = demandProfiles.includes(payload.demandProfile) ? payload.demandProfile : 'balanced'
  const discountProbabilityPct = Number(payload.discountProbabilityPct ?? 15)
  const discountPct = Number(payload.discountPct ?? 10)
  if (!Number.isInteger(discountProbabilityPct) || discountProbabilityPct < 0 || discountProbabilityPct > 100) {
    throw httpError(400, 'Promotion chance must be a whole number from 0 to 100.')
  }
  if (!Number.isInteger(discountPct) || discountPct < 0 || discountPct > 30) {
    throw httpError(400, 'Discount must be a whole number from 0 to 30%.')
  }

  const requestedSeed = payload.randomSeed === '' || payload.randomSeed == null ? null : Number(payload.randomSeed)
  if (requestedSeed != null && (!Number.isInteger(requestedSeed) || requestedSeed < 0 || requestedSeed > 2147483647)) {
    throw httpError(400, 'Random seed must be a whole number from 0 to 2147483647.')
  }

  return {
    ordersRequested,
    periodStart,
    periodEnd,
    demandProfile,
    discountProbabilityPct,
    discountPct,
    randomSeed: requestedSeed ?? randomInt(1, 2147483647),
  }
}

async function ensureSimulationCustomers(client) {
  for (let index = 0; index < CUSTOMER_NAMES.length; index += 1) {
    const code = `SIM-CUSTOMER-${String(index + 1).padStart(3, '0')}`
    await client.query(
      `INSERT INTO customers (customer_code, display_name)
       VALUES ($1, $2) ON CONFLICT (customer_code) DO NOTHING`,
      [code, CUSTOMER_NAMES[index]],
    )
  }
  const result = await client.query(
    `SELECT id, customer_code AS "customerCode", display_name AS "displayName"
     FROM customers WHERE customer_code LIKE 'SIM-CUSTOMER-%' ORDER BY customer_code`,
  )
  return result.rows
}

export async function listSimulationRuns(pool, limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20))
  const result = await pool.query(
    `SELECT id, simulation_mode AS "simulationMode", status,
            orders_requested AS "ordersRequested", orders_created AS "ordersCreated",
            period_start AS "periodStart", period_end AS "periodEnd",
            random_seed AS "randomSeed", summary,
            started_at AS "startedAt", completed_at AS "completedAt"
     FROM sales_simulation_runs
     ORDER BY started_at DESC, id DESC
     LIMIT $1`,
    [safeLimit],
  )
  return result.rows
}

export async function generateSalesSimulation(pool, payload) {
  const settings = validatePayload(payload)
  const random = createRandom(settings.randomSeed)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const runResult = await client.query(
      `INSERT INTO sales_simulation_runs (
         simulation_mode, status, orders_requested, orders_created,
         period_start, period_end, random_seed, summary
       ) VALUES ('live', 'running', $1, 0, $2, $3, $4, '{}'::jsonb)
       RETURNING id, started_at AS "startedAt"`,
      [settings.ordersRequested, settings.periodStart, settings.periodEnd, settings.randomSeed],
    )
    const runId = runResult.rows[0].id

    // Lock the eligible stock in a stable order for the entire run. Other order
    // checkouts must wait, so the simulator cannot sell the same remaining unit.
    const productResult = await client.query(
      `SELECT id, sku, name, brand, category,
              price::float8 AS price, cost::float8 AS cost,
              stock, bestseller, is_new AS "isNew"
       FROM products
       WHERE stock > 0
       ORDER BY id
       FOR UPDATE`,
    )
    const products = productResult.rows
    if (!products.length) throw httpError(409, 'There are no in-stock products available for simulation.')

    const customers = await ensureSimulationCustomers(client)
    const productMap = new Map(products.map((product) => [product.id, product]))
    let ordersCreated = 0
    let units = 0
    let subtotalGross = 0
    let discountTotalGross = 0
    let totalGross = 0
    let vatTotal = 0
    let netSales = 0
    let costOfGoodsSold = 0

    for (let orderIndex = 0; orderIndex < settings.ordersRequested; orderIndex += 1) {
      const candidateLines = 1 + Math.floor(random() * 3)
      const selectedIds = new Set()
      const lines = []

      for (let lineIndex = 0; lineIndex < candidateLines; lineIndex += 1) {
        const eligible = [...productMap.values()].filter((product) => Number(product.stock) > 0 && !selectedIds.has(product.id))
        if (!eligible.length) break
        const product = weightedProduct(eligible, random, settings.demandProfile)
        if (!product) break

        selectedIds.add(product.id)
        const quantityRoll = random()
        const requestedQuantity = quantityRoll < 0.84 ? 1 : quantityRoll < 0.97 ? 2 : 3
        const quantity = Math.min(requestedQuantity, Number(product.stock))
        const previousQuantity = Number(product.stock)
        const newQuantity = previousQuantity - quantity
        const lineSubtotalGross = money(Number(product.price) * quantity)
        const hasDiscount = settings.discountProbabilityPct > 0
          && random() * 100 < settings.discountProbabilityPct
        const discountGross = hasDiscount ? money(lineSubtotalGross * settings.discountPct / 100) : 0
        const lineTotalGross = money(lineSubtotalGross - discountGross)
        const vatAmount = money(lineTotalGross * VAT_RATE / (100 + VAT_RATE))
        const lineNetRevenue = money(lineTotalGross - vatAmount)

        lines.push({
          product,
          quantity,
          previousQuantity,
          newQuantity,
          unitPriceGross: money(product.price),
          unitCost: money(product.cost),
          discountGross,
          lineSubtotalGross,
          lineTotalGross,
          vatAmount,
          lineNetRevenue,
        })
        product.stock = newQuantity
      }

      if (!lines.length) break

      const customer = customers[Math.floor(random() * customers.length)]
      const orderDate = randomOrderDate(settings.periodStart, settings.periodEnd, random)
      const orderNumber = `LB-SIM-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomUUID().slice(0, 6).toUpperCase()}`
      const orderSubtotalGross = money(lines.reduce((sum, line) => sum + line.lineSubtotalGross, 0))
      const orderDiscountGross = money(lines.reduce((sum, line) => sum + line.discountGross, 0))
      const orderTotalGross = money(orderSubtotalGross - orderDiscountGross)
      const orderVatTotal = money(lines.reduce((sum, line) => sum + line.vatAmount, 0))

      const orderResult = await client.query(
        `INSERT INTO orders (
           order_number, customer_id, customer_name, status, source, simulation_run_id,
           subtotal_gross, discount_total_gross, vat_total, total_gross, order_date
         ) VALUES ($1, $2, $3, 'completed', 'simulator', $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [orderNumber, customer.id, customer.displayName, runId,
          orderSubtotalGross, orderDiscountGross, orderVatTotal, orderTotalGross, orderDate],
      )
      const orderId = orderResult.rows[0].id

      for (const line of lines) {
        const product = line.product
        await client.query(
          `INSERT INTO order_items (
             order_id, product_id, sku_snapshot, product_name_snapshot,
             brand_snapshot, category_snapshot, quantity, unit_price_gross,
             unit_cost, vat_rate, discount_gross, line_total_gross,
             line_net_revenue, vat_amount
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [orderId, product.id, product.sku, product.name, product.brand,
            product.category, line.quantity, line.unitPriceGross, line.unitCost,
            VAT_RATE, line.discountGross, line.lineTotalGross,
            line.lineNetRevenue, line.vatAmount],
        )
        await client.query(
          'UPDATE products SET stock = $2, updated_at = NOW() WHERE id = $1',
          [product.id, line.newQuantity],
        )
        await client.query(
          `INSERT INTO inventory_movements
             (product_id, movement_type, quantity_delta, previous_quantity, new_quantity, note)
           VALUES ($1, 'sale', $2, $3, $4, $5)`,
          [product.id, -line.quantity, line.previousQuantity, line.newQuantity, `Order ${orderNumber}`],
        )

        units += line.quantity
        subtotalGross += line.lineSubtotalGross
        discountTotalGross += line.discountGross
        totalGross += line.lineTotalGross
        vatTotal += line.vatAmount
        netSales += line.lineNetRevenue
        costOfGoodsSold += line.unitCost * line.quantity
      }
      ordersCreated += 1
    }

    if (ordersCreated === 0) throw httpError(409, 'No orders could be generated because there is no available stock.')

    const summary = {
      ordersCreated,
      units,
      subtotalGross: money(subtotalGross),
      discountTotalGross: money(discountTotalGross),
      totalGross: money(totalGross),
      vatTotal: money(vatTotal),
      netSales: money(netSales),
      costOfGoodsSold: money(costOfGoodsSold),
      grossProfit: money(netSales - costOfGoodsSold),
      averageOrderValueGross: money(totalGross / ordersCreated),
      inventoryLimited: ordersCreated < settings.ordersRequested,
      demandProfile: settings.demandProfile,
      discountProbabilityPct: settings.discountProbabilityPct,
      discountPct: settings.discountPct,
    }

    const completed = await client.query(
      `UPDATE sales_simulation_runs
       SET status = 'completed', orders_created = $2,
           summary = $3::jsonb, completed_at = NOW()
       WHERE id = $1
       RETURNING id, simulation_mode AS "simulationMode", status,
                 orders_requested AS "ordersRequested", orders_created AS "ordersCreated",
                 period_start AS "periodStart", period_end AS "periodEnd",
                 random_seed AS "randomSeed", summary,
                 started_at AS "startedAt", completed_at AS "completedAt"`,
      [runId, ordersCreated, JSON.stringify(summary)],
    )

    await client.query('COMMIT')
    return completed.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
