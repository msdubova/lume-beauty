import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import CategorySection from './components/CategorySection.jsx'
import ProductSection from './components/ProductSection.jsx'
import ProductCard from './components/ProductCard.jsx'
import BrandStory from './components/BrandStory.jsx'
import Footer from './components/Footer.jsx'
import Icon from './components/Icon.jsx'
import ShopPage from './components/ShopPage.jsx'
import ProductDetailPage from './components/ProductDetailPage.jsx'
import ProductVisual from './components/ProductVisual.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import { products as initialProducts } from './data/products.js'
import { checkApiHealth, getProducts, updateProductApi, createProductApi } from './lib/api.js'
import heroImage from './assets/hero-still-life.jpg'

function readRoute() {
  const route = window.location.hash.replace(/^#\/?/, '')
  if (route.startsWith('product/')) return { page: 'product', productId: route.split('/')[1] }
  if (['shop', 'wishlist', 'bag', 'account', 'admin'].includes(route)) return { page: route }
  return { page: 'home' }
}

function loadCatalogue() {
  try {
    const saved = window.localStorage.getItem('lume-beauty-catalogue-v1')
    if (!saved) return initialProducts
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : initialProducts
  } catch { return initialProducts }
}

function App() {
  const [route, setRoute] = useState(readRoute)
  const [catalogueProducts, setCatalogueProducts] = useState(loadCatalogue)
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [shopCategory, setShopCategory] = useState('')
  const [toast, setToast] = useState('')
  const [dataSourceStatus, setDataSourceStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    async function connectDatabase() {
      try {
        await checkApiHealth()
        const databaseProducts = await getProducts()
        if (!Array.isArray(databaseProducts) || databaseProducts.length === 0) {
          throw new Error('The database has no products yet. Run npm run db:seed first.')
        }
        if (!cancelled) {
          setCatalogueProducts(databaseProducts)
          setDataSourceStatus('database')
        }
      } catch (error) {
        console.info('Lume API is not available; using local demo data.', error.message)
        if (!cancelled) setDataSourceStatus('local')
      }
    }

    connectDatabase()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (dataSourceStatus !== 'local') return
    try {
      window.localStorage.setItem('lume-beauty-catalogue-v1', JSON.stringify(catalogueProducts))
    } catch (error) {
      console.warn('Could not save catalogue locally', error)
    }
  }, [catalogueProducts, dataSourceStatus])

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = (page, detail = '') => {
    const hash = page === 'product' ? `#product/${detail}` : `#${page}`
    if (window.location.hash === hash) {
      setRoute(readRoute())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.location.hash = hash
    }
  }

  const navigateHomeSection = (section) => {
    const scrollToSection = () => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (route.page !== 'home') {
      navigate('home')
      window.setTimeout(scrollToSection, 120)
    } else {
      scrollToSection()
    }
  }

  const matchingProducts = useMemo(() => {
    const query = searchTerm.toLowerCase()
    return catalogueProducts.filter((product) => {
      const matchesCategory = !activeCategory || product.category === activeCategory
      const matchesSearch = !query || `${product.name} ${product.brand} ${product.category} ${product.descriptor}`.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [catalogueProducts, activeCategory, searchTerm])

  const bestSellers = matchingProducts.filter((product) => product.bestseller)
  const newArrivals = matchingProducts.filter((product) => product.isNew)

  const toggleWishlist = (productId) => {
    setWishlist((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
  }

  const addToBag = (product, quantity = 1) => {
    if (!product || product.stock === 0) return
    const safeQuantity = Math.max(1, Math.min(quantity, product.stock))
    setCart((current) => [...current, ...Array.from({ length: safeQuantity }, () => product.id)])
    setToast(`${product.name} added to your bag`)
    window.clearTimeout(window.__lumeToastTimer)
    window.__lumeToastTimer = window.setTimeout(() => setToast(''), 2600)
  }

  const openShop = (category = '') => {
    setShopCategory(category)
    setSearchTerm('')
    navigate('shop')
  }

  const headerNavigate = (page) => {
    if (page === 'shop') {
      setShopCategory('')
      setSearchTerm('')
    }
    navigate(page)
  }

  const runSearch = (term) => {
    setShopCategory('')
    setSearchTerm(term)
    navigate('shop')
  }

  const clearSearch = () => setSearchTerm('')
  const selectedProduct = catalogueProducts.find((product) => product.id === route.productId)

  const updateProduct = async (updated) => {
    if (dataSourceStatus === 'database') {
      const saved = await updateProductApi(updated)
      setCatalogueProducts((current) => current.map((item) => item.id === saved.id ? saved : item))
      return saved
    }

    setCatalogueProducts((current) => current.map((item) => item.id === updated.id ? updated : item))
    return updated
  }

  const addProduct = async (item) => {
    if (dataSourceStatus === 'database') {
      const saved = await createProductApi(item)
      setCatalogueProducts((current) => [saved, ...current])
      return saved
    }

    setCatalogueProducts((current) => [item, ...current])
    return item
  }

  return (
    <div className="site-shell" id="top">
      {route.page !== 'admin' && <Header
        cartCount={cart.length}
        wishlistCount={wishlist.length}
        onSearch={runSearch}
        onNavigate={headerNavigate}
        onNavigateHomeSection={navigateHomeSection}
        currentPage={route.page}
      />}

      {route.page === 'home' && (
        <>
          <main>
            <section className="hero-section" aria-labelledby="hero-title">
              <div className="hero-copy">
                <p className="eyebrow">A CURATED BEAUTY EDIT</p>
                <h1 id="hero-title">Beauty,<br /><em>thoughtfully</em> curated.</h1>
                <p className="hero-description">Discover considered essentials and independent beauty names, selected to make every day feel a little more special.</p>
                <button className="primary-button" type="button" onClick={() => openShop()}>Explore the collection <Icon name="arrow" size={17} /></button>
                <div className="hero-footnote"><span className="hero-dot" /> Thoughtfully selected. Always personal.</div>
              </div>
              <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }} role="img" aria-label="A still life of carefully selected skincare products in warm natural light" />
              <div className="hero-index">THE LUME EDIT · 01 / 05</div>
            </section>

            <div className="benefit-strip" aria-label="Lume Beauty values">
              <span>Thoughtful discovery</span><i />
              <span>Considered essentials</span><i />
              <span>Beauty for your own rhythm</span>
            </div>

            <CategorySection onSelectCategory={openShop} activeCategory={activeCategory} />

            <ProductSection
              id="best-sellers"
              eyebrow="THE COMMUNITY EDIT"
              title="Best sellers"
              subtitle="The pieces people return to, time and again."
              products={bestSellers}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onAddToBag={addToBag}
              activeCategory={activeCategory}
              onClearCategory={() => { setActiveCategory(''); setSearchTerm('') }}
              searchTerm={searchTerm}
              onViewProduct={(product) => navigate('product', product.id)}
              onExplore={() => openShop()}
            />

            <ProductSection
              id="new-arrivals"
              eyebrow="FRESH FROM OUR EDIT"
              title="Just arrived"
              subtitle="New discoveries, ready to become your next favourites."
              products={newArrivals}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onAddToBag={addToBag}
              activeCategory={activeCategory}
              onClearCategory={() => { setActiveCategory(''); setSearchTerm('') }}
              searchTerm={searchTerm}
              onViewProduct={(product) => navigate('product', product.id)}
              onExplore={() => openShop()}
            />

            <BrandStory />
          </main>
          <Footer onNavigateHomeSection={navigateHomeSection} onShop={() => openShop()} />
        </>
      )}

      {route.page === 'shop' && (
        <>
          <ShopPage
            products={catalogueProducts}
            initialCategory={shopCategory}
            searchTerm={searchTerm}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onAddToBag={addToBag}
            onViewProduct={(product) => navigate('product', product.id)}
            onClearSearch={clearSearch}
          />
          <Footer onNavigateHomeSection={navigateHomeSection} onShop={() => openShop()} />
        </>
      )}

      {route.page === 'product' && (
        <>
          <ProductDetailPage
            product={selectedProduct}
            products={catalogueProducts}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onAddToBag={addToBag}
            onViewProduct={(product) => navigate('product', product.id)}
            onBack={() => navigate('shop')}
          />
          <Footer onNavigateHomeSection={navigateHomeSection} onShop={() => openShop()} />
        </>
      )}

      {route.page === 'wishlist' && (
        <>
        <CollectionPage
          title="Your wishlist"
          eyebrow="SAVED FOR LATER"
          products={catalogueProducts.filter((product) => wishlist.includes(product.id))}
          wishlist={wishlist}
          onToggleWishlist={toggleWishlist}
          onAddToBag={addToBag}
          onViewProduct={(product) => navigate('product', product.id)}
          onContinue={() => navigate('shop')}
        />
        <Footer onNavigateHomeSection={navigateHomeSection} onShop={() => openShop()} />
        </>
      )}

      {route.page === 'bag' && (
        <>
        <BagPage cart={cart} allProducts={catalogueProducts} onContinue={() => navigate('shop')} onRemove={(index) => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
        <Footer onNavigateHomeSection={navigateHomeSection} onShop={() => openShop()} />
        </>
      )}

      {route.page === 'admin' && <AdminDashboard products={catalogueProducts} onUpdateProduct={updateProduct} onAddProduct={addProduct} dataSourceStatus={dataSourceStatus} />}

      {route.page === 'account' && (
        <main className="simple-state-page"><p className="eyebrow">COMING SOON</p><h1>My account</h1><p>Customer accounts will be connected in a later development phase.</p><button type="button" className="primary-button" onClick={() => navigate('shop')}>Continue shopping <Icon name="arrow" size={16}/></button></main>
      )}

      {toast && <div className="toast-message" role="status"><Icon name="check" size={17} /><span>{toast}</span></div>}
    </div>
  )
}

function CollectionPage({ title, eyebrow, products: collection, wishlist, onToggleWishlist, onAddToBag, onViewProduct, onContinue }) {
  return (
    <main className="collection-page">
      <div className="shop-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>Your saved beauty discoveries, all in one place.</p></div>
      {collection.length ? <div className="product-grid">{collection.map((product) => <ProductCard key={product.id} product={product} isWishlisted={wishlist.includes(product.id)} onToggleWishlist={onToggleWishlist} onAddToBag={onAddToBag} onViewProduct={onViewProduct}/>)}</div> : <div className="empty-products"><p>Your wishlist is waiting for its first favourite.</p><button type="button" onClick={onContinue}>Explore the collection</button></div>}
    </main>
  )
}

function BagPage({ cart, allProducts, onContinue, onRemove }) {
  const bagItems = cart.map((id, index) => ({ product: allProducts.find((item) => item.id === id), index })).filter((item) => item.product)
  const subtotal = bagItems.reduce((sum, item) => sum + item.product.price, 0)
  return (
    <main className="collection-page bag-page">
      <div className="shop-intro"><p className="eyebrow">YOUR EDIT</p><h1>Your bag</h1><p>{cart.length} {cart.length === 1 ? 'item' : 'items'} in your bag.</p></div>
      {bagItems.length ? <>
        <div className="bag-lines">{bagItems.map(({ product, index }) => <article className="bag-line" key={`${product.id}-${index}`}><div className="bag-line-art"><ProductVisualForBag product={product}/></div><div className="bag-line-copy"><p className="product-brand">{product.brand}</p><h2>{product.name}</h2><p>SKU: {product.sku}</p><strong>£{product.price.toFixed(2)}</strong></div><button type="button" onClick={() => onRemove(index)}>Remove</button></article>)}</div>
        <div className="bag-summary"><span>Subtotal</span><strong>£{subtotal.toFixed(2)}</strong><p>Delivery and taxes calculated at checkout.</p><button className="primary-button" type="button" disabled>Checkout coming soon</button></div>
      </> : <div className="empty-products"><p>Your bag is currently empty.</p><button type="button" onClick={onContinue}>Continue shopping</button></div>}
    </main>
  )
}

function ProductVisualForBag({ product }) {
  return <ProductVisual shape={product.shape} tone={product.tone} />
}

export default App
