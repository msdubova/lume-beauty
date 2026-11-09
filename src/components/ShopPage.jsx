import { useEffect, useMemo, useState } from 'react'
import ProductCard from './ProductCard.jsx'
import Icon from './Icon.jsx'
import { brands, categories } from '../data/products.js'

const PAGE_SIZE = 12

export default function ShopPage({ products, initialCategory = '', searchTerm = '', wishlist, onToggleWishlist, onAddToBag, onViewProduct, onClearSearch }) {
  const [category, setCategory] = useState(initialCategory)
  const [query, setQuery] = useState(searchTerm)
  const [selectedBrands, setSelectedBrands] = useState([])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [availability, setAvailability] = useState('all')
  const [sortBy, setSortBy] = useState('featured')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => setCategory(initialCategory), [initialCategory])
  useEffect(() => setQuery(searchTerm), [searchTerm])

  const filteredProducts = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    const results = products.filter((product) => {
      const matchesCategory = !category || product.category === category
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(product.brand)
      const matchesQuery = !normalisedQuery || `${product.name} ${product.brand} ${product.category} ${product.descriptor} ${product.sku}`.toLowerCase().includes(normalisedQuery)
      const matchesMin = minPrice === '' || product.price >= Number(minPrice)
      const matchesMax = maxPrice === '' || product.price <= Number(maxPrice)
      const matchesAvailability = availability === 'all'
        || (availability === 'in-stock' && product.stock > product.reorderLevel)
        || (availability === 'low-stock' && product.stock > 0 && product.stock <= product.reorderLevel)
        || (availability === 'out-of-stock' && product.stock === 0)
      return matchesCategory && matchesBrand && matchesQuery && matchesMin && matchesMax && matchesAvailability
    })

    return results.sort((a, b) => {
      if (sortBy === 'newest') return b.launchDate.localeCompare(a.launchDate)
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'bestselling') return Number(b.bestseller) - Number(a.bestseller)
      return Number(b.bestseller) - Number(a.bestseller) || a.id.localeCompare(b.id)
    })
  }, [category, query, selectedBrands, minPrice, maxPrice, availability, sortBy])

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const visibleProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const firstResult = filteredProducts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastResult = Math.min(page * PAGE_SIZE, filteredProducts.length)
  const activeFilterCount = Number(Boolean(category)) + selectedBrands.length + Number(minPrice !== '') + Number(maxPrice !== '') + Number(availability !== 'all')

  const toggleBrand = (brand) => {
    setSelectedBrands((current) => current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand])
    setPage(1)
  }

  const resetFilters = () => {
    setCategory('')
    setQuery('')
    setSelectedBrands([])
    setMinPrice('')
    setMaxPrice('')
    setAvailability('all')
    setSortBy('featured')
    setPage(1)
    onClearSearch?.()
  }

  const updateFilter = (setter, value) => {
    setter(value)
    setPage(1)
  }

  return (
    <main className="shop-page">
      <div className="shop-breadcrumb"><a href="#home">Home</a><span>/</span><span>Shop</span>{category && <><span>/</span><span>{categories.find((item) => item.id === category)?.label}</span></>}</div>
      <section className="shop-intro">
        <p className="eyebrow">THE LUME COLLECTION</p>
        <h1>{category ? categories.find((item) => item.id === category)?.label : 'Shop all beauty'}</h1>
        <p>Thoughtfully selected essentials from independent beauty names and considered favourites.</p>
      </section>

      <div className="shop-layout">
        <aside className={`shop-filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Product filters">
          <div className="filter-heading">
            <h2>Filters {activeFilterCount > 0 && <span>{activeFilterCount}</span>}</h2>
            <button type="button" onClick={resetFilters}>Clear all</button>
          </div>

          <div className="filter-group">
            <h3>Category</h3>
            <label className="filter-radio"><input type="radio" name="category" checked={!category} onChange={() => updateFilter(setCategory, '')}/> <span>All categories</span></label>
            {categories.map((item) => (
              <label className="filter-radio" key={item.id}>
                <input type="radio" name="category" checked={category === item.id} onChange={() => updateFilter(setCategory, item.id)} />
                <span>{item.label}</span>
                <small>{products.filter((product) => product.category === item.id).length}</small>
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h3>Brand</h3>
            {brands.map((brand) => (
              <label className="filter-check" key={brand}>
                <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} />
                <span>{brand}</span>
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h3>Price (£)</h3>
            <div className="price-inputs">
              <label><span>Min</span><input type="number" min="0" placeholder="0" value={minPrice} onChange={(event) => updateFilter(setMinPrice, event.target.value)} /></label>
              <span className="price-dash">—</span>
              <label><span>Max</span><input type="number" min="0" placeholder="150" value={maxPrice} onChange={(event) => updateFilter(setMaxPrice, event.target.value)} /></label>
            </div>
            {minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice) && <p className="field-error">Maximum price must be above minimum.</p>}
          </div>

          <div className="filter-group">
            <h3>Availability</h3>
            <select className="filter-select" value={availability} onChange={(event) => updateFilter(setAvailability, event.target.value)}>
              <option value="all">All products</option>
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </div>
        </aside>

        <section className="shop-results" aria-label="Products">
          <div className="shop-toolbar">
            <button className="filter-toggle" type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
              <Icon name="sliders" size={17} /> Filters {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
            <p className="result-count">Showing {firstResult}–{lastResult} of {filteredProducts.length} products</p>
            <label className="sort-control"><span>Sort by</span>
              <select value={sortBy} onChange={(event) => updateFilter(setSortBy, event.target.value)}>
                <option value="featured">Featured</option>
                <option value="bestselling">Best selling</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>

          <div className="shop-search-row">
            <Icon name="search" size={17} />
            <input aria-label="Search catalogue" placeholder="Search products, brands or SKU" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
            {query && <button type="button" onClick={() => { setQuery(''); setPage(1); onClearSearch?.() }}>Clear</button>}
          </div>

          {visibleProducts.length > 0 ? (
            <div className="product-grid shop-product-grid">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlist.includes(product.id)}
                  onToggleWishlist={onToggleWishlist}
                  onAddToBag={onAddToBag}
                  onViewProduct={onViewProduct}
                />
              ))}
            </div>
          ) : (
            <div className="empty-products shop-empty">
              <p>No products match these filters.</p>
              <button type="button" onClick={resetFilters}>Clear filters and view all products</button>
            </div>
          )}

          {filteredProducts.length > PAGE_SIZE && (
            <nav className="pagination" aria-label="Catalogue pages">
              <button type="button" disabled={page === 1} onClick={() => { setPage((current) => current - 1); document.querySelector('.shop-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Previous</button>
              <div>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button key={number} className={page === number ? 'is-current' : ''} type="button" aria-current={page === number ? 'page' : undefined} onClick={() => { setPage(number); document.querySelector('.shop-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{number}</button>
              ))}</div>
              <button type="button" disabled={page === pageCount} onClick={() => { setPage((current) => current + 1); document.querySelector('.shop-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Next</button>
            </nav>
          )}
        </section>
      </div>
    </main>
  )
}
