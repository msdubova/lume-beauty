import 'dotenv/config'
import express from 'express'
import { pool } from './db.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(express.json({ limit: '1mb' }))

const productSelect = `
  SELECT
    id, sku, name, brand, category,
    price::float8 AS price,
    cost::float8 AS cost,
    stock,
    "reorderLevel",
    "stockStatus",
    shape, tone, bestseller, "isNew", descriptor, size,
    "launchDate",
    rating::float8 AS rating,
    "reviewCount"
  FROM product_catalogue
`

function isValidProduct(payload) {
  const requiredText = ['id', 'sku', 'name', 'brand', 'category']
  if (!payload || requiredText.some((key) => typeof payload[key] !== 'string' || !payload[key].trim())) {
    return 'Product ID, SKU, name, brand and category are required.'
  }

  const numericFields = ['price', 'cost', 'stock', 'reorderLevel']
  for (const field of numericFields) {
    if (!Number.isFinite(Number(payload[field])) || Number(payload[field]) < 0) {
      return `${field} must be a valid non-negative number.`
    }
  }

  if (!Number.isInteger(Number(payload.stock)) || !Number.isInteger(Number(payload.reorderLevel))) {
    return 'Stock and reorder level must be whole numbers.'
  }

  if (Number(payload.cost) > Number(payload.price)) {
    return 'Unit cost cannot exceed the selling price in this demo.'
  }

  return null
}

function stockStatus(stock, reorderLevel) {
  if (stock === 0) return 'out-of-stock'
  if (stock <= reorderLevel) return 'low-stock'
  return 'in-stock'
}

app.get('/api/health', async (_req, res) => {
  const result = await pool.query('SELECT NOW() AS database_time, current_database() AS database_name')
  res.json({ status: 'ok', database: result.rows[0].database_name, time: result.rows[0].database_time })
})

app.get('/api/products', async (_req, res) => {
  const result = await pool.query(`${productSelect} ORDER BY sku`)
  res.json(result.rows)
})

app.get('/api/products/:id', async (req, res) => {
  const result = await pool.query(`${productSelect} WHERE id = $1`, [req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: 'Product not found.' })
  res.json(result.rows[0])
})

app.post('/api/products', async (req, res) => {
  const payload = req.body
  const validationError = isValidProduct(payload)
  if (validationError) return res.status(400).json({ error: validationError })

  const stock = Number(payload.stock)
  const reorderLevel = Number(payload.reorderLevel)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO products (
        id, sku, name, brand, category, price, cost, stock, reorder_level,
        shape, tone, bestseller, is_new, descriptor, size, launch_date, rating, review_count
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        payload.id.trim(), payload.sku.trim(), payload.name.trim(), payload.brand,
        payload.category, Number(payload.price), Number(payload.cost), stock,
        reorderLevel, payload.shape || 'bottle', payload.tone || 'ivory',
        Boolean(payload.bestseller), payload.isNew ?? true,
        payload.descriptor || '', payload.size || 'Standard Size',
        payload.launchDate || new Date().toISOString().slice(0, 10),
        payload.rating == null ? 4.7 : Number(payload.rating),
        Number(payload.reviewCount || 0),
      ],
    )

    if (stock > 0) {
      await client.query(
        `INSERT INTO inventory_movements
          (product_id, movement_type, quantity_delta, previous_quantity, new_quantity, note)
         VALUES ($1, 'opening', $2, 0, $2, 'Opening stock for newly created product')`,
        [payload.id.trim(), stock],
      )
    }

    const result = await client.query(`${productSelect} WHERE id = $1`, [payload.id.trim()])
    await client.query('COMMIT')
    res.status(201).json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') return res.status(409).json({ error: 'This product ID or SKU already exists.' })
    if (error.code === '23503') return res.status(400).json({ error: 'Choose an existing brand and category.' })
    throw error
  } finally {
    client.release()
  }
})

app.put('/api/products/:id', async (req, res) => {
  const payload = req.body
  const validationError = isValidProduct({ ...payload, id: req.params.id })
  if (validationError) return res.status(400).json({ error: validationError })

  const client = await pool.connect()
  const nextStock = Number(payload.stock)
  const nextReorder = Number(payload.reorderLevel)

  try {
    await client.query('BEGIN')
    const current = await client.query(
      'SELECT stock FROM products WHERE id = $1 FOR UPDATE',
      [req.params.id],
    )

    if (!current.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Product not found.' })
    }

    const previousStock = Number(current.rows[0].stock)

    await client.query(
      `UPDATE products SET
        name = $2,
        brand = $3,
        category = $4,
        price = $5,
        cost = $6,
        stock = $7,
        reorder_level = $8,
        descriptor = $9,
        updated_at = NOW()
       WHERE id = $1`,
      [
        req.params.id,
        payload.name.trim(),
        payload.brand,
        payload.category,
        Number(payload.price),
        Number(payload.cost),
        nextStock,
        nextReorder,
        payload.descriptor || '',
      ],
    )

    if (nextStock !== previousStock) {
      await client.query(
        `INSERT INTO inventory_movements
          (product_id, movement_type, quantity_delta, previous_quantity, new_quantity, note)
         VALUES ($1, 'adjustment', $2, $3, $4, 'Admin stock adjustment')`,
        [req.params.id, nextStock - previousStock, previousStock, nextStock],
      )
    }

    const result = await client.query(`${productSelect} WHERE id = $1`, [req.params.id])
    await client.query('COMMIT')
    res.json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23503') return res.status(400).json({ error: 'Choose an existing brand and category.' })
    throw error
  } finally {
    client.release()
  }
})

app.get('/api/inventory/movements', async (req, res) => {
  const productId = typeof req.query.productId === 'string' ? req.query.productId : null
  const result = productId
    ? await pool.query(
      `SELECT id, product_id AS "productId", movement_type AS "movementType",
              quantity_delta AS "quantityDelta", previous_quantity AS "previousQuantity",
              new_quantity AS "newQuantity", note, created_at AS "createdAt"
       FROM inventory_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [productId],
    )
    : await pool.query(
      `SELECT id, product_id AS "productId", movement_type AS "movementType",
              quantity_delta AS "quantityDelta", previous_quantity AS "previousQuantity",
              new_quantity AS "newQuantity", note, created_at AS "createdAt"
       FROM inventory_movements ORDER BY created_at DESC LIMIT 200`,
    )
  res.json(result.rows)
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'An unexpected server error occurred.' })
})

const server = app.listen(port, () => {
  console.log(`Lume Beauty API listening on http://localhost:${port}`)
})

async function shutdown(signal) {
  console.log(`${signal} received. Closing API server...`)
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
