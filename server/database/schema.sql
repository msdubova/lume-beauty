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


-- Orders and sales foundation v1
-- Product prices and costs are snapshotted on each order line so later catalogue
-- edits cannot rewrite historical sales or gross-profit calculations.

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_simulation_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  simulation_mode TEXT NOT NULL CHECK (simulation_mode IN ('historical', 'live')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  orders_requested INTEGER NOT NULL CHECK (orders_requested >= 0),
  orders_created INTEGER NOT NULL DEFAULT 0 CHECK (orders_created >= 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  random_seed INTEGER,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Guest customer',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'simulator')),
  simulation_run_id BIGINT REFERENCES sales_simulation_runs(id) ON DELETE SET NULL,
  currency CHAR(3) NOT NULL DEFAULT 'GBP' CHECK (currency = 'GBP'),
  subtotal_gross NUMERIC(12, 2) NOT NULL CHECK (subtotal_gross >= 0),
  discount_total_gross NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_total_gross >= 0),
  vat_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (vat_total >= 0),
  total_gross NUMERIC(12, 2) NOT NULL CHECK (total_gross >= 0),
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  CHECK (total_gross = subtotal_gross - discount_total_gross)
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku_snapshot TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  brand_snapshot TEXT NOT NULL,
  category_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_gross NUMERIC(10, 2) NOT NULL CHECK (unit_price_gross >= 0),
  unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 20 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  discount_gross NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_gross >= 0),
  line_total_gross NUMERIC(12, 2) NOT NULL CHECK (line_total_gross >= 0),
  line_net_revenue NUMERIC(12, 2) NOT NULL CHECK (line_net_revenue >= 0),
  vat_amount NUMERIC(12, 2) NOT NULL CHECK (vat_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (discount_gross <= quantity * unit_price_gross),
  CHECK (line_total_gross = quantity * unit_price_gross - discount_gross),
  CHECK (line_total_gross = line_net_revenue + vat_amount)
);

CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_simulation_run ON orders(simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Historical dataset v1: isolated 12-month synthetic history. These records
-- never change the live products.stock column or live inventory_movements.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_source_check
  CHECK (source IN ('admin', 'simulator', 'historical'));

CREATE TABLE IF NOT EXISTS historical_inventory_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  simulation_run_id BIGINT NOT NULL REFERENCES sales_simulation_runs(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_date DATE NOT NULL,
  event_sequence INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('opening', 'receipt', 'sale', 'writeoff')),
  quantity_delta INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
  new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
  unit_cost_snapshot NUMERIC(10, 2) NOT NULL CHECK (unit_cost_snapshot >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (new_quantity = previous_quantity + quantity_delta),
  UNIQUE (simulation_run_id, event_sequence)
);

CREATE INDEX IF NOT EXISTS idx_historical_inventory_product_date
  ON historical_inventory_movements(product_id, movement_date, event_sequence);
CREATE INDEX IF NOT EXISTS idx_historical_inventory_run_date
  ON historical_inventory_movements(simulation_run_id, movement_date);

CREATE TABLE IF NOT EXISTS historical_inventory_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  simulation_run_id BIGINT NOT NULL REFERENCES sales_simulation_runs(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  snapshot_date DATE NOT NULL,
  snapshot_month DATE NOT NULL,
  quantity_on_hand INTEGER NOT NULL CHECK (quantity_on_hand >= 0),
  unit_cost_snapshot NUMERIC(10, 2) NOT NULL CHECK (unit_cost_snapshot >= 0),
  inventory_value NUMERIC(12, 2) NOT NULL CHECK (inventory_value >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (simulation_run_id, product_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_historical_inventory_snapshots_month
  ON historical_inventory_snapshots(simulation_run_id, snapshot_month, product_id);
