import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  await fs.readFile(path.join(here, "data", "catalogue-seed.json"), "utf8")
);

const sql = `
  INSERT INTO products (
    id, sku, name, brand, category, price, cost, stock, reorder_level,
    shape, tone, bestseller, is_new, descriptor, size, launch_date, rating, review_count
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
  ) ON CONFLICT (id) DO NOTHING
  RETURNING id, stock
`;

const client = await pool.connect();
let inserted = 0;

try {
  await client.query("BEGIN");

  for (const brand of seed.brands) {
    await client.query(
      "INSERT INTO brands(name) VALUES($1) ON CONFLICT(name) DO NOTHING",
      [brand]
    );
  }

  for (const category of seed.categories) {
    await client.query(
      "INSERT INTO categories(id, label) VALUES($1, $2) ON CONFLICT(id) DO NOTHING",
      [category.id, category.label]
    );
  }

  for (const product of seed.products) {
    const result = await client.query(sql, [
      product.id,
      product.sku,
      product.name,
      product.brand,
      product.category,
      product.price,
      product.cost,
      product.stock,
      product.reorderLevel,
      product.shape,
      product.tone,
      product.bestseller,
      product.isNew,
      product.descriptor,
      product.size,
      product.launchDate,
      product.rating ?? null,
      product.reviewCount ?? 0,
    ]);

    if (result.rowCount) {
      inserted += 1;
      if (Number(product.stock) > 0) {
        await client.query(
          `INSERT INTO inventory_movements
             (product_id, movement_type, quantity_delta, previous_quantity, new_quantity, note)
           VALUES ($1, 'opening', $2, 0, $2, 'Initial demo catalogue stock')`,
          [product.id, Number(product.stock)]
        );
      }
    }
  }

  await client.query("COMMIT");
  const count = await pool.query("SELECT COUNT(*)::int AS total FROM products");
  console.log(
    `Seed complete. Inserted ${inserted} new products. Database now contains ${count.rows[0].total} products.`
  );
  if (inserted === 0)
    console.log(
      "No products were overwritten; existing catalogue records were preserved."
    );
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
