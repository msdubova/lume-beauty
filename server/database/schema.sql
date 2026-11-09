-- Lume Beauty database schema v1
-- Safe to run more than once. Product stock is stored on products and every
-- change is recorded in inventory_movements in the same database transaction.

CREATE TABLE IF NOT EXISTS brands (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL REFERENCES brands(name) ON UPDATE CASCADE,
  category TEXT NOT NULL REFERENCES categories(id),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  shape TEXT NOT NULL DEFAULT 'bottle',
  tone TEXT NOT NULL DEFAULT 'ivory',
  bestseller BOOLEAN NOT NULL DEFAULT FALSE,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,
  descriptor TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT 'Standard Size',
  launch_date DATE,
  rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_launch_date ON products(launch_date DESC);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('opening', 'adjustment', 'sale', 'return', 'writeoff')),
  quantity_delta INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
  new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (new_quantity = previous_quantity + quantity_delta)
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_date
  ON inventory_movements(product_id, created_at DESC);

CREATE OR REPLACE VIEW product_catalogue AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.brand,
  p.category,
  p.price,
  p.cost,
  p.stock,
  p.reorder_level AS "reorderLevel",
  CASE
    WHEN p.stock = 0 THEN 'out-of-stock'
    WHEN p.stock <= p.reorder_level THEN 'low-stock'
    ELSE 'in-stock'
  END AS "stockStatus",
  p.shape,
  p.tone,
  p.bestseller,
  p.is_new AS "isNew",
  p.descriptor,
  p.size,
  TO_CHAR(p.launch_date, 'YYYY-MM-DD') AS "launchDate",
  p.rating,
  p.review_count AS "reviewCount"
FROM products p;
