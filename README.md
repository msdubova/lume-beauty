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
