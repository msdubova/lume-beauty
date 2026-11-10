# Lume Beauty — React storefront and catalogue demo

A responsive editorial-style multi-brand beauty retail demo built with React, Vite and plain CSS.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

## Project structure

```text
src/
  assets/        Local editorial and category imagery
  components/    Shared navigation, category cards, product cards and footer
  data/          150 fictional catalogue SKU records and category/brand data
  pages/         (reserved for future route-level page separation)
  App.jsx        Lightweight hash routing and shared basket/wishlist state
  main.jsx       React entry point
  styles.css     Design system and responsive layouts
```

## Homepage

- Responsive announcement bar, navigation and mobile menu
- Search panel that opens the Shop catalogue with the search term applied
- Editorial Hero banner
- Five clickable categories
- Best Sellers and Just Arrived sections
- Brand story and footer

## Shop catalogue

- 150 fictional SKUs across 10 fictional brands and 5 categories
- Search by product name, brand, category, descriptor or SKU
- Category and multi-brand filters
- Minimum and maximum price filters
- Availability filter: in stock, low stock and out of stock
- Sorting by featured, best selling, newest, price and name
- 12 products per page with pagination
- Product cards display New, Low stock and Out of stock labels
- Product detail page with quantity control, stock status and related products

## Prototype behaviour and limitations

- Basket and wishlist are held in React state only. They reset when the page is refreshed.
- Checkout, payment, customer accounts and newsletter delivery are not connected to a server.
- The 150-product catalogue is synthetic. In database mode, PostgreSQL is the source of truth; `src/data/products.js` remains the browser fallback catalogue.
- Prices, costs, stock levels, launch dates, ratings and review counts are invented for demonstration and portfolio practice.
- Delivery and returns content is illustrative and must be replaced with real policies before any public launch.

## Fixes in v1.0.1
- Added the missing `ProductCard` import in `src/App.jsx`. This fixes the `ProductCard is not defined` runtime error on the wishlist page.


## Admin Dashboard

Open the admin interface at `http://localhost:5173/#admin`. The dashboard includes an overview, product maintenance, inventory adjustments, Orders, the manual Sales Simulator, the one-off Historical data generator and product catalogue CSV export. In database mode, product and inventory changes are stored in PostgreSQL. If the API is not available, the storefront can fall back to the local browser catalogue.

The Products screen supports editing name, brand, category, selling price, unit cost, stock, reorder level and description, as well as adding a product. The Inventory screen supports stock adjustments and records them in the live inventory movement ledger. Orders and sales operations require the PostgreSQL API. User authentication, cloud persistence, scheduled sales generation and advanced analytics remain future phases.


## PostgreSQL + Express API (new)

The project can now use PostgreSQL as the source of truth for products and inventory. If the API is unavailable, the storefront falls back to the local browser demo data.

### Requirements

- Node.js 22.12+ (the current machine used for development was Node 22.16)
- Docker Desktop with Docker Compose
- npm

### 1. Install the API packages

```bash
npm install
```

### 2. Configure local environment variables

```bash
cp .env.example .env
```

The example credentials are for local development only. Do not use them for a public or production deployment.

### 3. Start PostgreSQL

```bash
docker compose up -d db
```

PostgreSQL is exposed on `localhost:5433` so it does not conflict with a local server using the default port 5432.

### 4. Create tables and import the 150 demo products

```bash
npm run db:setup
npm run db:seed
```

The seed script inserts the fictional brands, categories, products and opening stock movements. It does not overwrite existing product IDs, so rerunning it will not reset product edits.

### 5. Run the API and the React app

Open two Terminal tabs in the project directory.

Terminal tab 1:

```bash
npm run server
```

Terminal tab 2:

```bash
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). In the Admin Dashboard, the sidebar should show **PostgreSQL connected**.

### API endpoints in this phase

- `GET /api/health` — database connection status
- `GET /api/products` — product catalogue
- `GET /api/products/:id` — one product
- `POST /api/products` — create product
- `PUT /api/products/:id` — edit product and record stock adjustments
- `GET /api/inventory/movements` — recent inventory movement history

The frontend uses the API when available. When it is not available, it falls back to the existing local demo mode.

### Database design

- `brands` — the 10 fictional brands
- `categories` — the five product categories
- `products` — product master, selling price, unit cost and current stock
- `inventory_movements` — opening stock and every admin stock adjustment
- `product_catalogue` — a view that calculates the stock status from current quantity and reorder level

Stock updates and their inventory movement record are committed in one PostgreSQL transaction. This avoids a product quantity changing without a corresponding movement entry.

### Important limitations

This is a local learning/demo setup, not a public production store. The API currently has no user authentication or admin authorisation; do not expose it to the public internet. Returns, payment processing and scheduled sales simulation are not connected yet. Orders and customer records are stored in PostgreSQL. Basket and wishlist still live in React state and reset on page refresh.

### Migration note

When the PostgreSQL API is first connected, the database becomes the source of truth and the browser loads the seeded catalogue from PostgreSQL. Previous test edits kept only in the browser's `localStorage` are not automatically copied into the new database; the seeded demo catalogue uses the original project data. The browser copy is not deleted, but database-mode changes are saved to PostgreSQL instead.


## Orders module v1

The Orders workspace adds a first transaction-safe order workflow.

### Apply the database update

After replacing the project files with the Orders module update, run:

```bash
npm run db:setup
```

The schema update is idempotent and adds `customers`, `sales_simulation_runs`, `orders` and `order_items`. It does not drop or reset existing products or inventory movements.

### Order workflow

- `GET /api/orders` — recent order summaries
- `GET /api/orders/:id` — one order with item snapshots
- `POST /api/orders` — create a demo order
- `POST /api/orders/:id/cancel` — cancel a completed demo order and restore stock

Creating an order locks all requested product rows in a stable order, validates available stock, records the unit selling price and unit cost from PostgreSQL at order time, writes order items, reduces stock, and records `sale` inventory movements in one transaction. If any line fails, the complete transaction is rolled back.

The demonstration currently assumes product selling prices include 20% VAT. It records the VAT amount and net sales per order line. No payment is taken. Cancelling a demo order restores the units and records `return` inventory movements; it does not issue a payment refund.

The Admin Dashboard has an Orders tab with a one-line demo-order form, order details and a cancel-and-restock action. The manual Sales Simulator is documented in the next section. Scheduled generation and the separate 12-month historical dataset remain later phases.


## Manual Sales Simulator v1

The Admin Dashboard now includes a **Sales simulator** workspace for generating synthetic completed orders manually.

### Run configuration

- Generate 1–100 orders per run.
- Choose an inclusive start and end date for the simulated order dates.
- Supply a random seed for repeatable product selection, quantities, customers and order dates. Leave it blank to let the API create a seed.
- Choose a demand profile: balanced, best-sellers focus or new-arrivals focus.
- Set the chance that an order line receives a discount (0–100%) and the discount rate (0–30%).
- Each order contains 1–3 different product lines. Quantities are constrained by available stock.

### Transaction and stock integrity

The simulator runs one PostgreSQL transaction for the entire batch. It locks eligible product rows in a stable order, inserts a `sales_simulation_runs` record, creates customers when needed, writes order and order-item records, stores unit-price and unit-cost snapshots, decreases stock, records `sale` inventory movements, updates the run summary and commits. If an operation fails, the entire run is rolled back. Concurrent checkouts must wait for the simulator's product locks, preventing the same final unit from being sold twice.

Generated order rows use `source = 'simulator'` and reference the run through `simulation_run_id`. The run itself is stored with `simulation_mode = 'live'`; this identifies a manually generated demo-sales batch and is distinct from the planned historical-dataset generation mode.

The summary includes gross sales before discounts, discounts, total sales including VAT, VAT, net sales excluding VAT, cost of goods sold, gross profit and average order value. Gross profit is calculated as net sales excluding VAT minus the saved unit-cost snapshots multiplied by quantities. The demonstration assumes the product prices include 20% VAT and that saved unit costs are ex-VAT.

If available inventory is exhausted before the requested number of orders can be made, the run completes with fewer orders and sets `summary.inventoryLimited = true`. It never creates an order with no items or allows negative stock.

### API endpoints

- `GET /api/simulations?limit=20` — recent simulation run history
- `POST /api/simulations/generate` — generate a manual batch of synthetic orders

Example request:

```json
{
  "ordersRequested": 10,
  "periodStart": "2026-11-04",
  "periodEnd": "2026-11-10",
  "randomSeed": 42,
  "demandProfile": "balanced",
  "discountProbabilityPct": 15,
  "discountPct": 10
}
```

### Scope and limitations

- This is a manual simulator only. Scheduled/automatic generation is a later phase.
- These demo transactions are saved to the local learning database and reduce its product stock. No real payments are taken.
- The simulator does not yet generate the separate 12-month historical dataset (1 November 2025–31 October 2026). That dataset will be generated in a separate, clearly labelled historical mode so it cannot be confused with manual demo runs.
- The API remains a local-development service without authentication; do not expose it publicly.


## Historical sales dataset generator v1

The admin dashboard has a separate **Historical data** workspace. It creates one reproducible synthetic dataset for **1 November 2025 to 31 October 2026**:

- 2,400–3,000 completed historical orders (default 2,700)
- approximately 3,500–5,000 order lines
- 150 product SKUs, 10 fictional brands and 5 categories
- order-line selling-price and unit-cost snapshots
- a separate historical inventory movement ledger (opening stock, receipts and sales)
- 12 month-end inventory snapshots per SKU
- a monthly financial summary stored in the simulation run record

Historical orders use `orders.source = 'historical'` and `sales_simulation_runs.simulation_mode = 'historical'`. The Orders workspace and live Sales Simulator show only live/admin demo activity. Historical orders cannot be cancelled through the live restock workflow.

**Important catalogue-date caveat:** the earliest product launch date in the current catalogue is 18 January 2026. The generator respects each product's launch date. Therefore November and December 2025 and 1–17 January 2026 correctly have zero sales; this is an assortment-launch effect, not missing generated transactions.

Historical inventory is deliberately isolated in `historical_inventory_movements` and `historical_inventory_snapshots`. Generating the historical dataset does **not** alter `products.stock` or the live `inventory_movements` table. A one-off generation guard prevents accidental duplicate creation. To replace the dataset later, build an explicit backup-and-reset workflow rather than deleting rows manually.

Historical price and cost snapshots are synthetic approximations derived from the current catalogue values with small deterministic monthly index adjustments. They are suitable for practising retail analytics, not representations of real commercial trading records.

To prepare the new tables and source constraint, run:

```bash
npm run db:setup
```

Then open Admin Dashboard → **Historical data** and generate the dataset. The default seed is `20251101`.

Run deterministic generator tests with:

```bash
npm test
```
