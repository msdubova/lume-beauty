import { useState } from 'react'
import Icon from './Icon.jsx'
import ProductVisual from './ProductVisual.jsx'
import { getStockLabel, products as initialProducts } from '../data/products.js'
import ProductCard from './ProductCard.jsx'

export default function ProductDetailPage({ product, products = initialProducts, wishlist, onToggleWishlist, onAddToBag, onViewProduct, onBack }) {
  const [quantity, setQuantity] = useState(1)
  if (!product) return <main className="product-not-found"><p>We couldn't find that product.</p><button type="button" className="primary-button" onClick={onBack}>Return to the collection</button></main>

  const unavailable = product.stock === 0
  const relatedProducts = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4)

  return (
    <main className="product-detail-page">
      <div className="shop-breadcrumb"><button type="button" onClick={onBack}>Shop</button><span>/</span><span>{product.category}</span><span>/</span><span>{product.name}</span></div>
      <div className="product-detail-layout">
        <div className="product-detail-image"><ProductVisual shape={product.shape} tone={product.tone} /></div>
        <section className="product-detail-copy">
          <p className="product-brand">{product.brand}</p>
          <h1>{product.name}</h1>
          <p className="detail-rating">★★★★★ <span>{product.rating || '4.8'} · {product.reviewCount || 86} reviews</span></p>
          <p className="detail-price">£{product.price.toFixed(2)}</p>
          <p className="detail-description">{product.descriptor}. Thoughtfully selected for a considered everyday ritual, with a sensorial texture and an easy-to-love finish.</p>
          <div className={`detail-stock ${unavailable ? 'is-out' : product.stock <= product.reorderLevel ? 'is-low' : ''}`}><span />{getStockLabel(product)}</div>
          <div className="detail-sku">SKU: {product.sku} <span>·</span> Size: {product.size || 'Standard Size'}</div>
          <div className="detail-purchase-row">
            <div className="quantity-stepper" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
              <span>{quantity}</span>
              <button type="button" aria-label="Increase quantity" disabled={quantity >= Math.max(1, product.stock)} onClick={() => setQuantity((value) => Math.min(Math.max(1, product.stock), value + 1))}>+</button>
            </div>
            <button className="detail-add-button" type="button" disabled={unavailable} onClick={() => onAddToBag(product, quantity)}>{unavailable ? 'Out of stock' : 'Add to bag'} <Icon name="arrow" size={17}/></button>
            <button className={`detail-wishlist ${wishlist.includes(product.id) ? 'is-active' : ''}`} type="button" aria-label="Toggle wishlist" onClick={() => onToggleWishlist(product.id)}><Icon name="heart"/></button>
          </div>
          <div className="detail-information">
            <details open><summary>Product details</summary><p>{product.descriptor}. A considered essential from {product.brand}, created to bring a little more ease to your daily routine.</p></details>
            <details><summary>How to use</summary><p>Use as part of your preferred daily ritual. Follow the directions on the product packaging.</p></details>
            <details><summary>Delivery & returns</summary><p>Delivery and returns information is illustrative in this portfolio project and will be confirmed before any real launch.</p></details>
          </div>
        </section>
      </div>
      <section className="related-products">
        <div className="section-heading"><div><p className="eyebrow">CONTINUE EXPLORING</p><h2>You may also like</h2></div></div>
        <div className="product-grid">
          {relatedProducts.map((item) => <ProductCard key={item.id} product={item} isWishlisted={wishlist.includes(item.id)} onToggleWishlist={onToggleWishlist} onAddToBag={onAddToBag} onViewProduct={onViewProduct}/>) }
        </div>
      </section>
    </main>
  )
}
