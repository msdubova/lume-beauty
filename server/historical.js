import { randomInt } from 'node:crypto'

export const HISTORICAL_START_DATE = '2025-11-01'
export const HISTORICAL_END_DATE = '2026-10-31'
export const HISTORICAL_DEFAULT_ORDERS = 2700
export const HISTORICAL_DEFAULT_SEED = 20251101
const VAT_RATE = 20
const MIN_ORDERS = 2400
const MAX_ORDERS = 3000

const CUSTOMER_NAMES = [
  'Amelia Carter', 'Isla Morgan', 'Olivia Bennett', 'Freya Collins', 'Ava Thompson',
  'Lily Richardson', 'Mia Hughes', 'Sophie Walker', 'Grace Edwards', 'Ella Cooper',
  'Charlotte Bailey', 'Evie Foster', 'Ruby Mitchell', 'Ivy Brooks', 'Florence Reed',
  'Poppy James', 'Daisy Ward', 'Alice Price', 'Phoebe Gray', 'Matilda Kelly',
  'Hannah Wood', 'Emily Clarke', 'Jessica Hall', 'Lucy Wright', 'Chloe Green',
  'Millie Baker', 'Eleanor Scott', 'Harriet Adams', 'Rose Turner', 'Georgia Hill',
  'Imogen Mitchell', 'Lola Evans', 'Anna Morris', 'Martha Cook', 'Zara Rogers',
  'Evelyn Ward', 'Sienna Bell', 'Clara Murphy', 'Arabella Bailey', 'Esme Richardson',
  'Nina Cooper', 'Thea Foster', 'Lottie Hughes', 'Maya Bennett', 'Eliza Carter',
  'Erin Collins', 'Phoebe James', 'Maisie Gray', 'Ada Thompson', 'Cleo Walker',
]

const MONTH_WEIGHTS = {
  0: 0.82, 1: 0.94, 2: 0.97, 3: 1.02, 4: 1.06,
  5: 1.02, 6: 0.98, 7: 0.95, 8: 1.09, 9: 1.16,
  10: 1, 11: 1,
}
const PRICE_INDEX = [0.975, 0.982, 0.990, 0.996, 1.004, 1.000, 0.994, 0.989, 1.006, 1.018, 1, 1]
const COST_INDEX = [0.965, 0.970, 0.975, 0.980, 0.986, 0.990, 0.994, 0.997, 1.000, 1.004, 1, 1]
const CATEGORY_WEIGHTS = {
  skincare: 1.28,
  makeup: 1.12,
  haircare: 0.94,
  bodycare: 0.90,
  fragrance: 0.82,
}

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const dateText = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
const httpError = (status, message) => Object.assign(new Error(message), { status })

function createRandom(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function addDays(dateString, count) {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

function monthEnd(dateString) {
  const [year, month] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

function monthStartDates() {
  const months = []
  let cursor = HISTORICAL_START_DATE.slice(0, 7) + '-01'
  while (cursor <= HISTORICAL_END_DATE) {
    months.push(cursor)
    const [year, month] = cursor.split('-').map(Number)
    cursor = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
  }
  return months
}

function chooseWeighted(items, weightSelector, random) {
  let total = 0
  const weighted = items.map((item) => {
    const weight = Math.max(0, weightSelector(item))
    total += weight
    return { item, weight }
  })
  if (!weighted.length || total <= 0) return null
  let cursor = random() * total
  for (const entry of weighted) {
    cursor -= entry.weight
    if (cursor <= 0) return entry.item
  }
  return weighted.at(-1).item
}

function buildOrderDates(products, ordersRequested, random) {
  const firstLaunch = products.reduce((earliest, product) => {
    const launch = dateText(product.launchDate)
    return launch < earliest ? launch : earliest
  }, HISTORICAL_END_DATE)
  const earliestLaunch = firstLaunch < HISTORICAL_START_DATE ? HISTORICAL_START_DATE : firstLaunch
  const days = []
  const averageCatalogCount = Math.max(1, products.length)

  for (let date = earliestLaunch; date <= HISTORICAL_END_DATE; date = addDays(date, 1)) {
    const availableCount = products.filter((product) => dateText(product.launchDate) <= date).length
    if (!availableCount) continue
    const dateObject = new Date(`${date}T00:00:00.000Z`)
    const monthWeight = MONTH_WEIGHTS[dateObject.getUTCMonth()] ?? 1
    const day = dateObject.getUTCDay()
    const dayWeight = day === 0 || day === 6 ? 1.13 : day === 1 ? 0.94 : 1
    const assortmentWeight = Math.sqrt(availableCount / averageCatalogCount)
    days.push({ date, weight: monthWeight * dayWeight * assortmentWeight })
  }

  const dates = []
  for (let index = 0; index < ordersRequested; index += 1) {
    const selected = chooseWeighted(days, (day) => day.weight, random)
    dates.push(selected.date)
  }
  return dates.sort()
}

function productWeight(product, date, averagePrice) {
  let weight = CATEGORY_WEIGHTS[product.category] || 1
  if (product.bestseller) weight *= 2.15
  const launch = dateText(product.launchDate)
  const ageDays = Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${launch}T00:00:00Z`)) / 86400000)
  if (ageDays <= 45) weight *= 1.18
  const priceRatio = Math.max(0.4, Number(product.price) / averagePrice)
  weight *= 1 / Math.sqrt(priceRatio)
  return weight
}

function makeOrderTimestamp(date, random) {
  const hour = 8 + Math.floor(random() * 14)
  const minute = Math.floor(random() * 60)
  const second = Math.floor(random() * 60)
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`
}

function priceAndCost(product, date, random) {
  const month = new Date(`${date}T00:00:00.000Z`).getUTCMonth()
  const priceFactor = PRICE_INDEX[month] * (0.995 + random() * 0.01)
  const costFactor = COST_INDEX[month] * (0.997 + random() * 0.006)
  return {
    unitPriceGross: money(Number(product.price) * priceFactor),
    unitCost: money(Number(product.cost) * costFactor),
  }
}

function makeHistoricalSummary(orderRows, itemRows, monthMap, movementCount, snapshotCount) {
  const units = itemRows.reduce((sum, item) => sum + item.quantity, 0)
  const subtotalGross = money(itemRows.reduce((sum, item) => sum + item.lineSubtotalGross, 0))
  const discountTotalGross = money(itemRows.reduce((sum, item) => sum + item.discountGross, 0))
  const totalGross = money(itemRows.reduce((sum, item) => sum + item.lineTotalGross, 0))
  const vatTotal = money(itemRows.reduce((sum, item) => sum + item.vatAmount, 0))
  const netSales = money(itemRows.reduce((sum, item) => sum + item.lineNetRevenue, 0))
  const costOfGoodsSold = money(itemRows.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0))
  const grossProfit = money(netSales - costOfGoodsSold)
  const monthly = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)).map((row) => ({
    ...row,
    subtotalGross: money(row.subtotalGross),
    discountTotalGross: money(row.discountTotalGross),
    totalGross: money(row.totalGross),
    vatTotal: money(row.vatTotal),
    netSales: money(row.netSales),
    costOfGoodsSold: money(row.costOfGoodsSold),
    grossProfit: money(row.netSales - row.costOfGoodsSold),
  }))

  return {
    ordersCreated: orderRows.length,
    orderLines: itemRows.length,
    units,
    subtotalGross,
    discountTotalGross,
    totalGross,
    vatTotal,
    netSales,
    costOfGoodsSold,
    grossProfit,
    grossMarginPct: netSales ? money((grossProfit / netSales) * 100) : 0,
    averageOrderValueGross: orderRows.length ? money(totalGross / orderRows.length) : 0,
    historicalInventoryMovements: movementCount,
    inventorySnapshots: snapshotCount,
    monthly,
    dataNotes: {
      priceAndCost: 'Synthetic historical snapshots derived from the catalogue price and cost with small deterministic monthly index adjustments.',
      availability: 'Products are only sold on or after their recorded launch date.',
      liveInventory: 'Historical generation does not change current product stock or live inventory movements.',
      vat: 'VAT is assumed to be 20% and is included in the simulated consumer price.',
    },
  }
}

/**
 * Pure deterministic dataset builder. Exported so the data logic can be tested
 * without a live PostgreSQL connection.
 */
export function buildHistoricalDataset({ products, ordersRequested = HISTORICAL_DEFAULT_ORDERS, randomSeed = HISTORICAL_DEFAULT_SEED }) {
  if (!Array.isArray(products) || products.length !== 150) {
    throw new Error(`Historical generator expects exactly 150 catalogue products; received ${products?.length ?? 0}.`)
  }
  const random = createRandom(randomSeed)
  const productRows = products.map((product) => ({
    ...product,
    launchDate: dateText(product.launchDate),
    price: Number(product.price),
    cost: Number(product.cost),
    reorderLevel: Number(product.reorderLevel ?? product.reorder_level ?? 5),
    bestseller: Boolean(product.bestseller),
  })).sort((a, b) => a.id.localeCompare(b.id))
  const averagePrice = productRows.reduce((sum, product) => sum + product.price, 0) / productRows.length
  const dateSamples = buildOrderDates(productRows, ordersRequested, random)
  const ordersByDate = new Map()
  dateSamples.forEach((date, index) => {
    const rows = ordersByDate.get(date) || []
    rows.push(index)
    ordersByDate.set(date, rows)
  })

  const launchByDate = new Map()
  productRows.forEach((product) => {
    const group = launchByDate.get(product.launchDate) || []
    group.push(product)
    launchByDate.set(product.launchDate, group)
  })

  const customerRows = CUSTOMER_NAMES.map((displayName, index) => ({
    customerCode: `HIST-CUSTOMER-${String(index + 1).padStart(3, '0')}`,
    customerName: displayName,
  }))
  const stock = new Map()
  const productById = new Map(productRows.map((product) => [product.id, product]))
  const orders = []
  const orderItems = []
  const movements = []
  const snapshots = []
  const monthMap = new Map(monthStartDates().map((month) => [month.slice(0, 7), {
    month: month.slice(0, 7), orders: 0, units: 0, subtotalGross: 0,
    discountTotalGross: 0, totalGross: 0, vatTotal: 0, netSales: 0, costOfGoodsSold: 0,
  }]))
  let eventSequence = 0
  let orderSequence = 0

  const recordMovement = (product, date, movementType, previous, delta, note, unitCostSnapshot) => {
    eventSequence += 1
    movements.push({
      productId: product.id,
      movementDate: date,
      eventSequence,
      movementType,
      quantityDelta: delta,
      previousQuantity: previous,
      newQuantity: previous + delta,
      unitCostSnapshot,
      note,
    })
  }

  for (let date = HISTORICAL_START_DATE; date <= HISTORICAL_END_DATE; date = addDays(date, 1)) {
    const launchingToday = (launchByDate.get(date) || []).slice().sort((a, b) => a.id.localeCompare(b.id))
    for (const product of launchingToday) {
      const openingQuantity = 28 + Math.floor(random() * 25)
      stock.set(product.id, openingQuantity)
      recordMovement(product, date, 'opening', 0, openingQuantity, 'Synthetic opening inventory at product launch', product.cost)
    }

    const dayOrders = ordersByDate.get(date) || []
    for (const orderIndex of dayOrders) {
      const desiredLinesRoll = random()
      const desiredLines = desiredLinesRoll < 0.55 ? 1 : desiredLinesRoll < 0.90 ? 2 : 3
      const selectedProductIds = new Set()
      const chosenLines = []

      for (let lineIndex = 0; lineIndex < desiredLines; lineIndex += 1) {
        const eligible = productRows.filter((product) => date >= product.launchDate
          && Number(stock.get(product.id) || 0) > 0
          && !selectedProductIds.has(product.id))
        if (!eligible.length) break
        const product = chooseWeighted(eligible, (candidate) => productWeight(candidate, date, averagePrice), random)
        if (!product) break
        selectedProductIds.add(product.id)

        const currentStock = Number(stock.get(product.id) || 0)
        const quantityRoll = random()
        const requestedQuantity = quantityRoll < 0.88 ? 1 : quantityRoll < 0.99 ? 2 : 3
        const quantity = Math.min(requestedQuantity, currentStock)
        const previousQuantity = currentStock
        const newQuantity = previousQuantity - quantity
        const { unitPriceGross, unitCost } = priceAndCost(product, date, random)
        const discountChance = 13 + (new Date(`${date}T00:00:00Z`).getUTCMonth() === 9 ? 4 : 0)
        const hasDiscount = random() * 100 < discountChance
        const discountPct = hasDiscount ? (random() < 0.65 ? 10 : random() < 0.75 ? 15 : 5) : 0
        const lineSubtotalGross = money(unitPriceGross * quantity)
        const discountGross = money(lineSubtotalGross * discountPct / 100)
        const lineTotalGross = money(lineSubtotalGross - discountGross)
        const vatAmount = money(lineTotalGross * VAT_RATE / (100 + VAT_RATE))
        const lineNetRevenue = money(lineTotalGross - vatAmount)

        chosenLines.push({
          orderIndex, product, quantity, unitPriceGross, unitCost,
          lineSubtotalGross, discountGross, lineTotalGross, vatAmount, lineNetRevenue,
        })
        stock.set(product.id, newQuantity)
        recordMovement(product, date, 'sale', previousQuantity, -quantity, 'Synthetic historical sale', unitCost)

        // Restock the virtual historical ledger when it reaches the product's
        // reorder point. This ledger is separate from current live stock.
        if (newQuantity <= product.reorderLevel) {
          const receiptQuantity = 28 + Math.floor(random() * 28)
          recordMovement(product, date, 'receipt', newQuantity, receiptQuantity, 'Synthetic historical replenishment', unitCost)
          stock.set(product.id, newQuantity + receiptQuantity)
        }
      }

      if (!chosenLines.length) {
        throw new Error(`No saleable historical products were available on ${date}.`)
      }

      orderSequence += 1
      const customer = customerRows[Math.floor(random() * customerRows.length)]
      const orderNumber = `LB-HIST-${date.replaceAll('-', '')}-${String(orderSequence).padStart(5, '0')}`
      const orderDate = makeOrderTimestamp(date, random)
      const orderSubtotalGross = money(chosenLines.reduce((sum, line) => sum + line.lineSubtotalGross, 0))
      const orderDiscountGross = money(chosenLines.reduce((sum, line) => sum + line.discountGross, 0))
      const orderTotalGross = money(chosenLines.reduce((sum, line) => sum + line.lineTotalGross, 0))
      const orderVatTotal = money(chosenLines.reduce((sum, line) => sum + line.vatAmount, 0))

      orders.push({
        orderNumber,
        customerCode: customer.customerCode,
        customerName: customer.customerName,
        subtotalGross: orderSubtotalGross,
        discountTotalGross: orderDiscountGross,
        vatTotal: orderVatTotal,
        totalGross: orderTotalGross,
        orderDate,
      })

      const monthKey = date.slice(0, 7)
      const month = monthMap.get(monthKey)
      month.orders += 1
      for (const line of chosenLines) {
        const item = {
          orderNumber,
          productId: line.product.id,
          skuSnapshot: line.product.sku,
          productNameSnapshot: line.product.name,
          brandSnapshot: line.product.brand,
          categorySnapshot: line.product.category,
          quantity: line.quantity,
          unitPriceGross: line.unitPriceGross,
          unitCost: line.unitCost,
          vatRate: VAT_RATE,
          discountGross: line.discountGross,
          lineTotalGross: line.lineTotalGross,
          lineNetRevenue: line.lineNetRevenue,
          vatAmount: line.vatAmount,
          lineSubtotalGross: line.lineSubtotalGross,
        }
        orderItems.push(item)
        month.units += line.quantity
        month.subtotalGross += line.lineSubtotalGross
        month.discountTotalGross += line.discountGross
        month.totalGross += line.lineTotalGross
        month.vatTotal += line.vatAmount
        month.netSales += line.lineNetRevenue
        month.costOfGoodsSold += line.unitCost * line.quantity
      }
    }

    const nextDay = addDays(date, 1)
    if (nextDay.slice(0, 7) !== date.slice(0, 7) || date === HISTORICAL_END_DATE) {
      for (const product of productRows) {
        const launched = product.launchDate <= date
        const quantity = launched ? Number(stock.get(product.id) || 0) : 0
        const monthStart = `${date.slice(0, 7)}-01`
        const monthIndex = new Date(`${date}T00:00:00Z`).getUTCMonth()
        const costSnapshot = money(product.cost * COST_INDEX[monthIndex])
        snapshots.push({
          productId: product.id,
          snapshotDate: date,
          snapshotMonth: monthStart,
          quantityOnHand: quantity,
          unitCostSnapshot: costSnapshot,
          inventoryValue: money(quantity * costSnapshot),
          isAvailable: launched,
        })
      }
    }
  }

  if (orders.length !== ordersRequested) {
    throw new Error(`Historical generation created ${orders.length} of ${ordersRequested} requested orders.`)
  }

  const summary = makeHistoricalSummary(orders, orderItems, monthMap, movements.length, snapshots.length)
  return {
    orders,
    orderItems,
    movements,
    snapshots,
    customers: customerRows,
    summary,
    earliestSaleDate: orders[0]?.orderDate.slice(0, 10) || null,
    latestSaleDate: orders.at(-1)?.orderDate.slice(0, 10) || null,
  }
}

function validatePayload(payload = {}) {
  const ordersRequested = Number(payload.ordersRequested ?? HISTORICAL_DEFAULT_ORDERS)
  if (!Number.isInteger(ordersRequested) || ordersRequested < MIN_ORDERS || ordersRequested > MAX_ORDERS) {
    throw httpError(400, `Choose between ${MIN_ORDERS.toLocaleString('en-GB')} and ${MAX_ORDERS.toLocaleString('en-GB')} historical orders.`)
  }
  const requestedSeed = payload.randomSeed == null || payload.randomSeed === '' ? HISTORICAL_DEFAULT_SEED : Number(payload.randomSeed)
  if (!Number.isInteger(requestedSeed) || requestedSeed < 0 || requestedSeed > 2147483647) {
    throw httpError(400, 'Random seed must be a whole number from 0 to 2147483647.')
  }
  return { ordersRequested, randomSeed: requestedSeed }
}

async function insertJsonRows(client, sql, rows, extraParams = []) {
  if (!rows.length) return
  await client.query(sql, [JSON.stringify(rows), ...extraParams])
}

export async function getHistoricalDatasetStatus(pool) {
  const result = await pool.query(
    `SELECT id, simulation_mode AS "simulationMode", status,
            orders_requested AS "ordersRequested", orders_created AS "ordersCreated",
            period_start AS "periodStart", period_end AS "periodEnd",
            random_seed AS "randomSeed", summary, started_at AS "startedAt",
            completed_at AS "completedAt"
     FROM sales_simulation_runs
     WHERE simulation_mode = 'historical'
     ORDER BY started_at DESC, id DESC
     LIMIT 1`,
  )
  return { generated: Boolean(result.rowCount && result.rows[0].status === 'completed'), run: result.rows[0] || null }
}

export async function generateHistoricalDataset(pool, payload = {}) {
  const settings = validatePayload(payload)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(20251101, 1)')

    const existing = await client.query(
      `SELECT id FROM sales_simulation_runs
       WHERE simulation_mode = 'historical' AND status = 'completed'
       LIMIT 1 FOR UPDATE`,
    )
    if (existing.rowCount) {
      throw httpError(409, 'A historical dataset has already been generated. It is protected from accidental duplication.')
    }

    const productResult = await client.query(
      `SELECT id, sku, name, brand, category, price::float8 AS price,
              cost::float8 AS cost, bestseller, launch_date::text AS "launchDate",
              reorder_level AS "reorderLevel"
       FROM products ORDER BY id`,
    )
    const products = productResult.rows
    if (products.length !== 150) {
      throw httpError(409, `The historical generator requires 150 products; the database currently contains ${products.length}.`)
    }

    const dataset = buildHistoricalDataset({ ...settings, products })

    const runResult = await client.query(
      `INSERT INTO sales_simulation_runs (
         simulation_mode, status, orders_requested, orders_created,
         period_start, period_end, random_seed, summary
       ) VALUES ('historical', 'running', $1, 0, $2, $3, $4, '{}'::jsonb)
       RETURNING id`,
      [settings.ordersRequested, HISTORICAL_START_DATE, HISTORICAL_END_DATE, settings.randomSeed],
    )
    const runId = runResult.rows[0].id

    await insertJsonRows(client,
      `INSERT INTO customers (customer_code, display_name)
       SELECT x.customer_code, x.customer_name
       FROM jsonb_to_recordset($1::jsonb) AS x(customer_code text, customer_name text)
       ON CONFLICT (customer_code) DO NOTHING`,
      dataset.customers.map((customer) => ({ customer_code: customer.customerCode, customer_name: customer.customerName })),
    )

    const orderInsert = await client.query(
      `INSERT INTO orders (
         order_number, customer_id, customer_name, status, source, simulation_run_id,
         subtotal_gross, discount_total_gross, vat_total, total_gross, order_date
       )
       SELECT x.order_number, c.id, x.customer_name, 'completed', 'historical', $2,
              x.subtotal_gross, x.discount_total_gross, x.vat_total, x.total_gross, x.order_date
       FROM jsonb_to_recordset($1::jsonb) AS x(
         order_number text, customer_code text, customer_name text,
         subtotal_gross numeric, discount_total_gross numeric,
         vat_total numeric, total_gross numeric, order_date timestamptz
       )
       JOIN customers c ON c.customer_code = x.customer_code
       RETURNING id, order_number AS "orderNumber"`,
      [JSON.stringify(dataset.orders.map((order) => ({
        order_number: order.orderNumber,
        customer_code: order.customerCode,
        customer_name: order.customerName,
        subtotal_gross: order.subtotalGross,
        discount_total_gross: order.discountTotalGross,
        vat_total: order.vatTotal,
        total_gross: order.totalGross,
        order_date: order.orderDate,
      }))), runId],
    )
    if (orderInsert.rowCount !== settings.ordersRequested) {
      throw new Error(`Expected ${settings.ordersRequested} inserted orders, but PostgreSQL returned ${orderInsert.rowCount}.`)
    }

    await insertJsonRows(client,
      `INSERT INTO order_items (
         order_id, product_id, sku_snapshot, product_name_snapshot, brand_snapshot,
         category_snapshot, quantity, unit_price_gross, unit_cost, vat_rate,
         discount_gross, line_total_gross, line_net_revenue, vat_amount
       )
       SELECT o.id, x.product_id, x.sku_snapshot, x.product_name_snapshot, x.brand_snapshot,
              x.category_snapshot, x.quantity, x.unit_price_gross, x.unit_cost, x.vat_rate,
              x.discount_gross, x.line_total_gross, x.line_net_revenue, x.vat_amount
       FROM jsonb_to_recordset($1::jsonb) AS x(
         order_number text, product_id text, sku_snapshot text, product_name_snapshot text,
         brand_snapshot text, category_snapshot text, quantity integer,
         unit_price_gross numeric, unit_cost numeric, vat_rate numeric,
         discount_gross numeric, line_total_gross numeric, line_net_revenue numeric, vat_amount numeric
       )
       JOIN orders o ON o.order_number = x.order_number`,
      dataset.orderItems.map((item) => ({
        order_number: item.orderNumber,
        product_id: item.productId,
        sku_snapshot: item.skuSnapshot,
        product_name_snapshot: item.productNameSnapshot,
        brand_snapshot: item.brandSnapshot,
        category_snapshot: item.categorySnapshot,
        quantity: item.quantity,
        unit_price_gross: item.unitPriceGross,
        unit_cost: item.unitCost,
        vat_rate: item.vatRate,
        discount_gross: item.discountGross,
        line_total_gross: item.lineTotalGross,
        line_net_revenue: item.lineNetRevenue,
        vat_amount: item.vatAmount,
      })),
    )

    await insertJsonRows(client,
      `INSERT INTO historical_inventory_movements (
         simulation_run_id, product_id, movement_date, event_sequence, movement_type,
         quantity_delta, previous_quantity, new_quantity, unit_cost_snapshot, note
       )
       SELECT $2, x.product_id, x.movement_date, x.event_sequence, x.movement_type,
              x.quantity_delta, x.previous_quantity, x.new_quantity, x.unit_cost_snapshot, x.note
       FROM jsonb_to_recordset($1::jsonb) AS x(
         product_id text, movement_date date, event_sequence integer, movement_type text,
         quantity_delta integer, previous_quantity integer, new_quantity integer,
         unit_cost_snapshot numeric, note text
       )`,
      dataset.movements.map((movement) => ({
        product_id: movement.productId,
        movement_date: movement.movementDate,
        event_sequence: movement.eventSequence,
        movement_type: movement.movementType,
        quantity_delta: movement.quantityDelta,
        previous_quantity: movement.previousQuantity,
        new_quantity: movement.newQuantity,
        unit_cost_snapshot: movement.unitCostSnapshot,
        note: movement.note,
      })),
      [runId],
    )

    await insertJsonRows(client,
      `INSERT INTO historical_inventory_snapshots (
         simulation_run_id, product_id, snapshot_date, snapshot_month,
         quantity_on_hand, unit_cost_snapshot, inventory_value, is_available
       )
       SELECT $2, x.product_id, x.snapshot_date, x.snapshot_month,
              x.quantity_on_hand, x.unit_cost_snapshot, x.inventory_value, x.is_available
       FROM jsonb_to_recordset($1::jsonb) AS x(
         product_id text, snapshot_date date, snapshot_month date,
         quantity_on_hand integer, unit_cost_snapshot numeric,
         inventory_value numeric, is_available boolean
       )`,
      dataset.snapshots.map((snapshot) => ({
        product_id: snapshot.productId,
        snapshot_date: snapshot.snapshotDate,
        snapshot_month: snapshot.snapshotMonth,
        quantity_on_hand: snapshot.quantityOnHand,
        unit_cost_snapshot: snapshot.unitCostSnapshot,
        inventory_value: snapshot.inventoryValue,
        is_available: snapshot.isAvailable,
      })),
      [runId],
    )

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
      [runId, dataset.orders.length, JSON.stringify({
        ...dataset.summary,
        earliestSaleDate: dataset.earliestSaleDate,
        latestSaleDate: dataset.latestSaleDate,
        catalogueProducts: products.length,
        brands: new Set(products.map((product) => product.brand)).size,
        categories: new Set(products.map((product) => product.category)).size,
      })],
    )

    await client.query('COMMIT')
    return completed.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') {
      throw httpError(409, 'A historical dataset already exists. No duplicate rows were added.')
    }
    throw error
  } finally {
    client.release()
  }
}
