import ProductCard from './ProductCard.jsx'

export default function ProductSection({
  id, eyebrow, title, subtitle, products, wishlist, onToggleWishlist, onAddToBag,
  activeCategory, onClearCategory, searchTerm, onViewProduct, onExplore,
}) {
  return (
    <section className="content-section product-section" id={id}>
      <div className="section-heading product-section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="section-subtitle">{subtitle}</p>
        </div>
        <button className="text-link text-link-button" type="button" onClick={onExplore}>Explore the collection <span aria-hidden="true">→</span></button>
      </div>

      {(activeCategory || searchTerm) && (
        <div className="filter-notice">
          <span>{searchTerm ? `Search results for “${searchTerm}”` : `Browsing ${activeCategory}`}</span>
          <button type="button" onClick={onClearCategory}>Clear filter <span aria-hidden="true">×</span></button>
        </div>
      )}

      {products.length > 0 ? (
        <div className="product-grid">
          {products.slice(0, 4).map((product) => (
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
        <div className="empty-products">
          <p>No products found in this selection.</p>
          <button type="button" onClick={onClearCategory}>View the full collection</button>
        </div>
      )}
    </section>
  )
}
