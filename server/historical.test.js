import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildHistoricalDataset, HISTORICAL_DEFAULT_ORDERS, HISTORICAL_DEFAULT_SEED } from './historical.js'

const catalogue = JSON.parse(fs.readFileSync(new URL('./data/catalogue-seed.json', import.meta.url), 'utf8'))
const products = catalogue.products

test('builds the expected 12-month historical dataset deterministically', () => {
  const originalStock = products.map((product) => product.stock)
  const first = buildHistoricalDataset({ products })
  const second = buildHistoricalDataset({ products })

  assert.equal(first.orders.length, HISTORICAL_DEFAULT_ORDERS)
  assert.ok(first.orderItems.length >= 3500 && first.orderItems.length <= 5000)
  assert.equal(first.snapshots.length, 150 * 12)
  assert.equal(first.orders[0].orderDate.slice(0, 10), first.earliestSaleDate)
  assert.equal(first.earliestSaleDate >= '2026-01-18', true)
  assert.equal(first.latestSaleDate, '2026-10-31')
  assert.deepEqual(first.orders, second.orders)
  assert.deepEqual(first.orderItems, second.orderItems)
  assert.deepEqual(first.summary, second.summary)
  assert.deepEqual(products.map((product) => product.stock), originalStock, 'live catalogue stock must not be modified')
})

test('respects product launch dates and has zero pre-launch trading months', () => {
  const dataset = buildHistoricalDataset({ products, ordersRequested: 2400, randomSeed: 42 })
  const launchById = new Map(products.map((product) => [product.id, product.launchDate]))
  const orderDateByNumber = new Map(dataset.orders.map((order) => [order.orderNumber, order.orderDate.slice(0, 10)]))

  for (const item of dataset.orderItems) {
    assert.ok(orderDateByNumber.get(item.orderNumber) >= launchById.get(item.productId))
  }

  const months = new Map(dataset.summary.monthly.map((month) => [month.month, month.orders]))
  assert.equal(months.get('2025-11'), 0)
  assert.equal(months.get('2025-12'), 0)
  assert.equal(dataset.summary.monthly.length, 12)
  assert.equal(dataset.orders.length, 2400)
})

test('reconciles order totals, VAT, COGS and gross profit', () => {
  const dataset = buildHistoricalDataset({ products, ordersRequested: 3000, randomSeed: HISTORICAL_DEFAULT_SEED })
  const lineTotals = new Map()
  for (const item of dataset.orderItems) {
    const current = lineTotals.get(item.orderNumber) || 0
    lineTotals.set(item.orderNumber, Math.round((current + item.lineTotalGross) * 100) / 100)
    assert.equal(Math.round((item.lineNetRevenue + item.vatAmount) * 100), Math.round(item.lineTotalGross * 100))
  }
  for (const order of dataset.orders) {
    assert.equal(lineTotals.get(order.orderNumber), order.totalGross)
  }

  assert.equal(
    Math.round((dataset.summary.netSales - dataset.summary.costOfGoodsSold) * 100),
    Math.round(dataset.summary.grossProfit * 100),
  )
  assert.equal(dataset.summary.ordersCreated, 3000)
  assert.ok(dataset.orderItems.length >= 3500 && dataset.orderItems.length <= 5000)
})

test('historical inventory movements form valid quantity chains', () => {
  const dataset = buildHistoricalDataset({ products, ordersRequested: 2400, randomSeed: 20251101 })
  const byProduct = new Map()
  for (const movement of dataset.movements) {
    assert.equal(movement.newQuantity, movement.previousQuantity + movement.quantityDelta)
    const rows = byProduct.get(movement.productId) || []
    rows.push(movement)
    byProduct.set(movement.productId, rows)
  }
  for (const rows of byProduct.values()) {
    rows.sort((a, b) => a.eventSequence - b.eventSequence)
    for (let index = 1; index < rows.length; index += 1) {
      assert.equal(rows[index].previousQuantity, rows[index - 1].newQuantity)
    }
  }
  assert.equal(dataset.movements.filter((movement) => movement.movementType === 'opening').length, 150)
  assert.equal(dataset.snapshots.length, 1800)
})
