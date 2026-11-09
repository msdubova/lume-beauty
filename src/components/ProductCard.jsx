import Icon from './Icon.jsx'
import ProductVisual from './ProductVisual.jsx'
import { getStockLabel } from '../data/products.js'

export default function ProductCard({ product, isWishlisted, onToggleWishlist, onAddToBag, onViewProduct }) {
  const isUnavailable = product.stock === 0
  const stockLabel = getStockLabel(product)

  return (
    <article className="product-card">
      <div className="product-image">
        <button className="product-open" type="button" onClick={() => onViewProduct(product)} aria-label={`View ${product.name}`}>
          <ProductVisual shape={product.shape} tone={product.tone} />
        </button>
        <div className="product-tags">
          {product.isNew && <span className="product-tag">New</span>}
          {product.bestseller && !product.isNew && <span className="product-tag product-tag--bestseller">Bestseller</span>}
          {product.stock === 0 && <span className="product-tag product-tag--stock">Out of stock</span>}
          {product.stock > 0 && product.stock <= product.reorderLevel && <span className="product-tag product-tag--stock">Low stock</span>}
        </div>
        <button
          className={`product-wishlist ${isWishlisted ? 'is-active' : ''}`}
          type="button"
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          onClick={() => onToggleWishlist(product.id)}
        >
          <Icon name="heart" size={19} />
        </button>
        <button
          className={`quick-add ${isUnavailable ? 'is-disabled' : ''}`}
          type="button"
          onClick={() => onAddToBag(product)}
          disabled={isUnavailable}
          aria-label={isUnavailable ? `${product.name} is out of stock` : `Add ${product.name} to bag`}
        >
          <span>{isUnavailable ? 'Out of stock' : 'Add to bag'}</span><Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="product-info">
        <p className="product-brand">{product.brand}</p>
        <button className="product-name-button" type="button" onClick={() => onViewProduct(product)}>
          <h3>{product.name}</h3>
        </button>
        <p className="product-description">{product.descriptor}</p>
        <div className="product-meta-row">
          <p className="product-price">£{product.price.toFixed(2)}</p>
          <span className={`stock-label ${isUnavailable ? 'is-out' : product.stock <= product.reorderLevel ? 'is-low' : ''}`}>{stockLabel}</span>
        </div>
      </div>
    </article>
  )
}
