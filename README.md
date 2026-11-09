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
- Product data is synthetic and held in `src/data/products.js`; no PostgreSQL database is connected yet.
- Prices, costs, stock levels, launch dates, ratings and review counts are invented for demonstration and portfolio practice.
- Delivery and returns content is illustrative and must be replaced with real policies before any public launch.

## Fixes in v1.0.1
- Added the missing `ProductCard` import in `src/App.jsx`. This fixes the `ProductCard is not defined` runtime error on the wishlist page.


## Admin Dashboard (local demo)

Open the admin interface at `http://localhost:5173/#admin`. The dashboard includes an overview, product maintenance, inventory quick adjustments and product catalogue CSV export. Product edits are stored in the browser's `localStorage` under `lume-beauty-catalogue-v1`, so they persist on the same browser and device. They are not synced to a server or database.

The Products screen supports editing name, brand, category, selling price, unit cost, stock, reorder level and description, as well as adding a new product. The Inventory screen supports one-unit stock adjustments. Data export downloads the current product master as CSV for Excel. Orders, sales simulation, user authentication, cloud persistence and advanced analytics are planned for later phases and are not implemented in this local demo yet.


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

This is a local learning/demo setup, not a public production store. The API currently has no user authentication or admin authorisation; do not expose it to the public internet. Orders, customer records, returns, payment processing and scheduled sales simulation are not connected yet. Basket and wishlist still live in React state and reset on page refresh.

### Migration note

When the PostgreSQL API is first connected, the database becomes the source of truth and the browser loads the seeded catalogue from PostgreSQL. Previous test edits kept only in the browser's `localStorage` are not automatically copied into the new database; the seeded demo catalogue uses the original project data. The browser copy is not deleted, but database-mode changes are saved to PostgreSQL instead.
