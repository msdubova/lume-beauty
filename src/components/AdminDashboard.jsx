import { useEffect, useMemo, useState } from 'react'
import { brands, categories } from '../data/products.js'
import Icon from './Icon.jsx'
import { cancelOrderApi, createOrderApi, generateHistoricalDatasetApi, generateSalesSimulationApi, getHistoricalDatasetStatus, getOrder, getOrders, getSimulationRuns } from '../lib/api.js'

const money = (value) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value) || 0)
const categoryName = (id) => categories.find((item) => item.id === id)?.label || id

export default function AdminDashboard({ products, onUpdateProduct, onAddProduct, onRefreshProducts, dataSourceStatus = 'local' }) {
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')
  const [newProductOpen, setNewProductOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderActionBusy, setOrderActionBusy] = useState(false)
  const [simulationRuns, setSimulationRuns] = useState([])
  const [simulationRunsLoading, setSimulationRunsLoading] = useState(false)
  const [simulationRunsError, setSimulationRunsError] = useState('')
  const [simulationBusy, setSimulationBusy] = useState(false)
  const [latestSimulationResult, setLatestSimulationResult] = useState(null)
  const [historicalStatus, setHistoricalStatus] = useState(null)
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [historicalError, setHistoricalError] = useState('')
  const [historicalBusy, setHistoricalBusy] = useState(false)

  useEffect(() => {
    if (tab !== 'orders') return undefined
    if (dataSourceStatus !== 'database') {
      setOrdersError('Orders require an active PostgreSQL connection.')
      return undefined
    }

    let active = true
    setOrdersLoading(true)
    setOrdersError('')
    getOrders()
      .then((result) => { if (active) setOrders(result) })
      .catch((error) => { if (active) setOrdersError(error.message) })
      .finally(() => { if (active) setOrdersLoading(false) })

    return () => { active = false }
  }, [tab, dataSourceStatus])

  useEffect(() => {
    if (tab !== 'simulator') return undefined
    if (dataSourceStatus !== 'database') {
      setSimulationRunsError('Sales simulation requires an active PostgreSQL connection.')
      return undefined
    }

    let active = true
    setSimulationRunsLoading(true)
    setSimulationRunsError('')
    getSimulationRuns()
      .then((result) => { if (active) setSimulationRuns(result.filter((run) => run.simulationMode === 'live')) })
      .catch((error) => { if (active) setSimulationRunsError(error.message) })
      .finally(() => { if (active) setSimulationRunsLoading(false) })

    return () => { active = false }
  }, [tab, dataSourceStatus])

  useEffect(() => {
    if (tab !== 'historical') return undefined
    if (dataSourceStatus !== 'database') {
      setHistoricalError('Historical data generation requires an active PostgreSQL connection.')
      return undefined
    }

    let active = true
    setHistoricalLoading(true)
    setHistoricalError('')
    getHistoricalDatasetStatus()
      .then((result) => { if (active) setHistoricalStatus(result) })
      .catch((error) => { if (active) setHistoricalError(error.message) })
      .finally(() => { if (active) setHistoricalLoading(false) })

    return () => { active = false }
  }, [tab, dataSourceStatus])

  const metrics = useMemo(() => {
    const units = products.reduce((sum, item) => sum + Number(item.stock || 0), 0)
    const low = products.filter((item) => item.stock > 0 && item.stock <= item.reorderLevel).length
    const out = products.filter((item) => item.stock === 0).length
    const value = products.reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.cost || 0), 0)
    return { units, low, out, value }
  }, [products])

  const filteredProducts = useMemo(() => products.filter((item) => {
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || `${item.sku} ${item.name} ${item.brand}`.toLowerCase().includes(q)
    return matchesQuery && (category === 'all' || item.category === category)
  }), [products, query, category])

  const showNotice = (message, duration = 2600) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), duration)
  }

  const update = async (product) => {
    try {
      await onUpdateProduct(product)
      setEditing(null)
      showNotice(`${product.sku} updated successfully`)
    } catch (error) {
      showNotice(`Could not save ${product.sku}: ${error.message}`)
    }
  }

  const quickStock = async (product, delta) => {
    const stock = Math.max(0, Number(product.stock || 0) + delta)
    try {
      await onUpdateProduct({ ...product, stock, stockStatus: stock === 0 ? 'out-of-stock' : stock <= product.reorderLevel ? 'low-stock' : 'in-stock' })
      showNotice(`Stock updated for ${product.sku}`, 2200)
    } catch (error) {
      showNotice(`Could not update stock: ${error.message}`)
    }
  }

  const refreshOrders = async () => {
    const result = await getOrders()
    setOrders(result)
    setOrdersError('')
    return result
  }

  const createDemoOrder = async (payload) => {
    setOrderActionBusy(true)
    try {
      const created = await createOrderApi(payload)
      await refreshOrders()
      await onRefreshProducts?.()
      setNewOrderOpen(false)
      showNotice(`${created.orderNumber} created. Stock has been updated.`)
      return true
    } catch (error) {
      showNotice(`Could not create order: ${error.message}`, 5000)
      return false
    } finally {
      setOrderActionBusy(false)
    }
  }

  const openOrderDetails = async (order) => {
    setOrderActionBusy(true)
    try {
      setSelectedOrder(await getOrder(order.id))
    } catch (error) {
      showNotice(`Could not load order: ${error.message}`, 5000)
    } finally {
      setOrderActionBusy(false)
    }
  }

  const cancelAndRestockOrder = async (order) => {
    const confirmed = window.confirm(`Cancel ${order.orderNumber} and return its units to stock? This is a demo order; no payment is involved.`)
    if (!confirmed) return
    setOrderActionBusy(true)
    try {
      await cancelOrderApi(order.id)
      await refreshOrders()
      await onRefreshProducts?.()
      showNotice(`${order.orderNumber} cancelled and stock restored.`)
    } catch (error) {
      showNotice(`Could not cancel order: ${error.message}`, 5000)
    } finally {
      setOrderActionBusy(false)
    }
  }

  const generateManualSimulation = async (settings) => {
    setSimulationBusy(true)
    setSimulationRunsError('')
    try {
      const result = await generateSalesSimulationApi(settings)
      setLatestSimulationResult(result)
      const created = Number(result.ordersCreated || 0)
      showNotice(`${created} simulated order${created === 1 ? '' : 's'} created. Inventory has been updated.`, 5000)
      try {
        const refreshedRuns = await getSimulationRuns()
        setSimulationRuns(refreshedRuns.filter((run) => run.simulationMode === 'live'))
      } catch (refreshError) {
        setSimulationRunsError(`The run was saved, but its history could not be refreshed: ${refreshError.message}`)
      }
      try {
        await onRefreshProducts?.()
      } catch (refreshError) {
        showNotice(`The run was saved, but the product view could not refresh: ${refreshError.message}`, 6000)
      }
      return result
    } catch (error) {
      setSimulationRunsError(error.message)
      showNotice(`Sales simulation failed: ${error.message}`, 6000)
      return null
    } finally {
      setSimulationBusy(false)
    }
  }

  const generateHistorical = async (settings) => {
    setHistoricalBusy(true)
    setHistoricalError('')
    try {
      const result = await generateHistoricalDatasetApi(settings)
      setHistoricalStatus({ generated: true, run: result })
      showNotice(`${Number(result.ordersCreated || 0).toLocaleString('en-GB')} historical orders saved. Live stock was not changed.`, 6500)
      return result
    } catch (error) {
      setHistoricalError(error.message)
      showNotice(`Historical data generation failed: ${error.message}`, 6500)
      return null
    } finally {
      setHistoricalBusy(false)
    }
  }

  const exportCsv = () => {
    const columns = ['sku', 'name', 'brand', 'category', 'price', 'cost', 'stock', 'reorderLevel', 'stockStatus']
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [columns.join(','), ...products.map((item) => columns.map((key) => escape(item[key])).join(','))]
    const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'Lume_Beauty_Product_Catalogue.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Catalogue CSV exported')
    window.setTimeout(() => setNotice(''), 2600)
  }

  const navigation = [
    ['overview', 'Overview', 'layout-dashboard'],
    ['products', 'Products', 'package'],
    ['inventory', 'Inventory', 'boxes'],
    ['orders', 'Orders', 'receipt'],
    ['simulator', 'Sales simulator', 'chart'],
    ['historical', 'Historical data', 'calendar'],
    ['export', 'Data export', 'file-down'],
  ]

  return (
    <main className="admin-shell">
      <div className="admin-brand-top"><a href="#home" className="admin-wordmark"><span>LUME</span><small>B E A U T Y</small></a><button type="button" onClick={() => { window.location.hash = '#home' }}>View storefront <Icon name="arrow" size={15}/></button></div>
      <div className="admin-topline"><div><p className="eyebrow">LUME BEAUTY · BACK OFFICE</p><h1>Admin dashboard</h1><p className="admin-intro">Manage your product catalogue and keep an eye on stock levels.</p></div><span className="admin-demo-badge">DEMO ENVIRONMENT</span></div>
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <p className="admin-nav-label">WORKSPACE</p>
          {navigation.map(([id, label, icon]) => <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon name={icon} size={17}/><span>{label}</span></button>)}
          <div className="admin-sidebar-note"><span className="admin-status-dot"/> {dataSourceStatus === 'database' ? 'PostgreSQL connected' : dataSourceStatus === 'checking' ? 'Checking connection…' : 'Local demo data'}<br/><small>{dataSourceStatus === 'database' ? 'Saved in the database' : dataSourceStatus === 'checking' ? 'Connecting to API' : 'Saved in this browser'}</small></div>
        </aside>

        <section className="admin-content">
          {notice && <div className="admin-notice" role="status"><Icon name="check" size={16}/>{notice}</div>}
          {tab === 'overview' && <>
            <div className="admin-section-heading"><div><p className="eyebrow">STORE SNAPSHOT</p><h2>Overview</h2></div><button className="admin-secondary-button" onClick={() => setTab('products')} type="button">View products <Icon name="arrow" size={15}/></button></div>
            <div className="admin-metric-grid">
              <Metric label="Catalogue SKUs" value={products.length.toLocaleString('en-GB')} note="Active product records" icon="package"/>
              <Metric label="Units in stock" value={metrics.units.toLocaleString('en-GB')} note="Across all products" icon="boxes"/>
              <Metric label="Low stock" value={metrics.low} note="At or below reorder level" icon="alert-triangle" tone="warning"/>
              <Metric label="Out of stock" value={metrics.out} note="Products needing replenishment" icon="circle-alert" tone="danger"/>
            </div>
            <div className="admin-overview-grid">
              <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">REPLENISHMENT</p><h3>Stock requiring attention</h3></div><button type="button" className="admin-text-button" onClick={() => setTab('inventory')}>View inventory</button></div>
                <div className="admin-alert-list">{products.filter((item) => item.stock <= item.reorderLevel).slice(0, 6).map((item) => <div className="admin-alert-row" key={item.id}><div><strong>{item.name}</strong><small>{item.sku} · {item.brand}</small></div><span className={item.stock === 0 ? 'admin-stock-pill is-out' : 'admin-stock-pill is-low'}>{item.stock === 0 ? 'Out of stock' : `${item.stock} left`}</span></div>)}{metrics.low + metrics.out === 0 && <p className="admin-muted">No products require attention.</p>}</div>
              </section>
              <section className="admin-panel admin-value-panel"><p className="eyebrow">STOCK VALUATION</p><h3>{money(metrics.value)}</h3><p>Estimated inventory cost value, calculated as units in stock × unit cost. This is not retail sales revenue.</p><button type="button" className="admin-secondary-button" onClick={() => setTab('export')}>Export catalogue <Icon name="arrow" size={15}/></button></section>
            </div>
            <div className="admin-roadmap"><p className="eyebrow">NEXT DEVELOPMENT PHASES</p><div><span>01</span><strong>Orders & fulfilment</strong><small>Order creation, item snapshots and transactional stock updates</small></div><div><span>02</span><strong>Manual sales simulator</strong><small>Batch generation is available; scheduled runs are a later enhancement</small></div><div><span>03</span><strong>Retail analytics</strong><small>Sales, margin, ABC, returns and forecasting</small></div></div>
          </>}

          {tab === 'orders' && <>
            <div className="admin-section-heading">
              <div><p className="eyebrow">SALES & FULFILMENT</p><h2>Orders <span className="admin-count">{orders.length}</span></h2></div>
              <button className="admin-primary-button" type="button" onClick={() => setNewOrderOpen(true)} disabled={dataSourceStatus !== 'database' || orderActionBusy}><Icon name="plus" size={16}/> Create demo order</button>
            </div>
            <div className="admin-orders-note"><strong>Transactional stock control</strong><span>Creating an order saves its line-item price and cost snapshots, reduces stock and records a sale movement in one PostgreSQL transaction. VAT is assumed to be 20% for this demonstration.</span></div>
            {dataSourceStatus !== 'database' && <p className="admin-form-error">Connect PostgreSQL to manage orders.</p>}
            {ordersError && <p className="admin-form-error">{ordersError}</p>}
            {ordersLoading ? <p className="admin-muted">Loading orders…</p> : orders.length ? <div className="admin-table-wrap"><table className="admin-table admin-orders-table"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Lines / units</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.orderNumber}</strong><small>#{order.id} · {order.source}</small></td><td>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(order.orderDate))}</td><td>{order.customerName}</td><td>{order.lineCount} lines · {order.units} units</td><td>{money(order.totalGross)}</td><td><span className={`admin-order-status ${order.status === 'cancelled' ? 'is-cancelled' : 'is-completed'}`}>{order.status}</span></td><td><div className="admin-order-actions"><button className="admin-edit-button" type="button" onClick={() => openOrderDetails(order)} disabled={orderActionBusy}>View</button>{order.status === 'completed' && <button className="admin-edit-button" type="button" onClick={() => cancelAndRestockOrder(order)} disabled={orderActionBusy}>Cancel & restock</button>}</div></td></tr>)}</tbody></table></div> : !ordersError && <div className="admin-empty-orders"><Icon name="receipt" size={25}/><h3>No orders yet</h3><p>Create a demonstration order to test how the order, item snapshots and stock movement are saved together.</p></div>}
            <p className="admin-table-footnote">Showing the latest {orders.length} orders. Cancelled orders remain in the database for audit history; later sales reports will exclude them from completed sales.</p>
          </>}

          {tab === 'simulator' && <SalesSimulatorPanel
            dataSourceStatus={dataSourceStatus}
            runs={simulationRuns}
            loading={simulationRunsLoading}
            error={simulationRunsError}
            busy={simulationBusy}
            latestResult={latestSimulationResult}
            onGenerate={generateManualSimulation}
          />}

          {tab === 'historical' && <HistoricalDataPanel
            dataSourceStatus={dataSourceStatus}
            status={historicalStatus}
            loading={historicalLoading}
            error={historicalError}
            busy={historicalBusy}
            onGenerate={generateHistorical}
          />}

          {tab === 'products' && <>
            <div className="admin-section-heading"><div><p className="eyebrow">PRODUCT MANAGEMENT</p><h2>Products <span className="admin-count">{products.length}</span></h2></div><button className="admin-primary-button" type="button" onClick={() => setNewProductOpen(true)}><Icon name="plus" size={16}/> Add product</button></div>
            <div className="admin-table-tools"><label className="admin-search"><Icon name="search" size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, brand or SKU"/></label><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Unit cost</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>{filteredProducts.slice(0, 60).map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.brand}</small></td><td>{item.sku}</td><td>{categoryName(item.category)}</td><td>{money(item.price)}</td><td>{money(item.cost)}</td><td>{item.stock}</td><td><StockStatus product={item}/></td><td><button className="admin-edit-button" type="button" onClick={() => setEditing({ ...item })}>Edit</button></td></tr>)}</tbody></table></div>
            <p className="admin-table-footnote">Showing {Math.min(filteredProducts.length, 60)} of {filteredProducts.length} matching products. {dataSourceStatus === 'database' ? 'Product changes are saved to PostgreSQL.' : 'Product changes are saved locally in this browser for this demonstration.'}</p>
          </>}

          {tab === 'inventory' && <>
            <div className="admin-section-heading"><div><p className="eyebrow">STOCK CONTROL</p><h2>Inventory</h2></div><span className="admin-readonly-note">Quick adjustments update the storefront</span></div>
            <div className="admin-metric-grid admin-metric-grid--compact"><Metric label="Total units" value={metrics.units.toLocaleString('en-GB')} icon="boxes"/><Metric label="Low stock SKUs" value={metrics.low} icon="alert-triangle" tone="warning"/><Metric label="Out of stock SKUs" value={metrics.out} icon="circle-alert" tone="danger"/></div>
            <div className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">REORDER CONTROL</p><h3>Stock adjustments</h3></div></div><div className="admin-inventory-list">{products.filter((item) => item.stock <= item.reorderLevel || item.stock === 0).sort((a,b) => a.stock-b.stock).slice(0, 25).map((item) => <div className="admin-inventory-row" key={item.id}><div><strong>{item.name}</strong><small>{item.sku} · {item.brand} · Reorder at {item.reorderLevel}</small></div><StockStatus product={item}/><div className="admin-quantity-control"><button type="button" onClick={() => quickStock(item, -1)} aria-label={`Remove one unit from ${item.name}`}>−</button><b>{item.stock}</b><button type="button" onClick={() => quickStock(item, 1)} aria-label={`Add one unit to ${item.name}`}>+</button></div><button type="button" className="admin-edit-button" onClick={() => setEditing({ ...item })}>Edit</button></div>)}</div></div>
            <p className="admin-table-footnote">{dataSourceStatus === 'database' ? 'Stock changes are recorded in PostgreSQL with an inventory movement history.' : 'This is a local demonstration. Stock changes are not synchronised with a server or real warehouse.'}</p>
          </>}

          {tab === 'export' && <>
            <div className="admin-section-heading"><div><p className="eyebrow">DATA MANAGEMENT</p><h2>Data export</h2></div></div>
            <section className="admin-panel admin-export-panel"><div className="admin-export-icon"><Icon name="file-spreadsheet" size={28}/></div><div><h3>Product catalogue export</h3><p>Download the current product master as a UTF-8 CSV file that can be opened in Microsoft Excel. Includes SKU, product, brand, category, selling price, unit cost, stock and reorder level.</p><button type="button" className="admin-primary-button" onClick={exportCsv}><Icon name="download" size={16}/> Export CSV</button></div></section>
            <div className="admin-roadmap admin-roadmap--single"><p className="eyebrow">COMING LATER</p><div><span>02</span><strong>Sales & order exports</strong><small>Next export enhancement after the simulator and analytics reports.</small></div><div><span>03</span><strong>Inventory movement history</strong><small>Receipts, sales, returns, adjustments and audit trail.</small></div></div>
          </>}
        </section>
      </div>
      {newOrderOpen && <NewOrderForm products={products} busy={orderActionBusy} onClose={() => setNewOrderOpen(false)} onCreate={createDemoOrder}/>}
      {selectedOrder && <OrderDetailsDialog order={selectedOrder} onClose={() => setSelectedOrder(null)}/>}
      {editing && <ProductEditor product={editing} onChange={setEditing} onSave={update} onClose={() => setEditing(null)}/>}
      {newProductOpen && <NewProductForm onClose={() => setNewProductOpen(false)} onSave={async (item) => { try { await onAddProduct(item); setNewProductOpen(false); showNotice(`${item.sku} added to catalogue`) } catch (error) { showNotice(`Could not add product: ${error.message}`) } }}/>}
    </main>
  )
}

function SalesSimulatorPanel({ dataSourceStatus, runs, loading, error, busy, latestResult, onGenerate }) {
  const today = new Date()
  const endDefault = toDateInput(today)
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
  const [ordersRequested, setOrdersRequested] = useState('10')
  const [periodStart, setPeriodStart] = useState(toDateInput(startDate))
  const [periodEnd, setPeriodEnd] = useState(endDefault)
  const [randomSeed, setRandomSeed] = useState('42')
  const [demandProfile, setDemandProfile] = useState('balanced')
  const [discountProbabilityPct, setDiscountProbabilityPct] = useState('15')
  const [discountPct, setDiscountPct] = useState('10')
  const [formError, setFormError] = useState('')

  const mostRecentRun = latestResult || runs[0] || null
  const recentSummary = mostRecentRun?.summary || {}

  const submit = async (event) => {
    event.preventDefault()
    const count = Number(ordersRequested)
    const chance = Number(discountProbabilityPct)
    const discount = Number(discountPct)
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      setFormError('Choose between 1 and 100 orders for one run.')
      return
    }
    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      setFormError('Choose a valid date range. The end date must be on or after the start date.')
      return
    }
    if (!Number.isInteger(chance) || chance < 0 || chance > 100) {
      setFormError('Promotion chance must be a whole number from 0 to 100.')
      return
    }
    if (!Number.isInteger(discount) || discount < 0 || discount > 30) {
      setFormError('Discount must be a whole number from 0 to 30%.')
      return
    }
    if (randomSeed.trim() && (!Number.isInteger(Number(randomSeed)) || Number(randomSeed) < 0 || Number(randomSeed) > 2147483647)) {
      setFormError('Random seed must be a whole number from 0 to 2147483647, or left empty.')
      return
    }

    setFormError('')
    await onGenerate({
      ordersRequested: count,
      periodStart,
      periodEnd,
      randomSeed: randomSeed.trim() ? Number(randomSeed) : null,
      demandProfile,
      discountProbabilityPct: chance,
      discountPct: discount,
    })
  }

  return <>
    <div className="admin-section-heading">
      <div><p className="eyebrow">SYNTHETIC TRANSACTIONS</p><h2>Sales simulator</h2></div>
      <span className="admin-readonly-note">Manual generation · PostgreSQL</span>
    </div>

    <div className="admin-orders-note">
      <strong>Manual sales generation — demo mode</strong>
      <span>Generate synthetic completed orders using the current product catalogue and stock. Each order stores price and unit-cost snapshots, reduces inventory and records sale movements in one PostgreSQL transaction. No payments are taken. This is separate from the planned 12-month historical dataset.</span>
    </div>

    {dataSourceStatus !== 'database' && <p className="admin-form-error">Connect PostgreSQL to run the sales simulator.</p>}
    {error && <p className="admin-form-error">{error}</p>}

    <section className="admin-panel admin-simulator-panel">
      <div className="admin-panel-heading">
        <div><p className="eyebrow">RUN CONFIGURATION</p><h3>Generate demo sales</h3></div>
        <span className="admin-stock-pill is-in">Manual mode</span>
      </div>
      <form onSubmit={submit}>
        <div className="admin-simulator-fields">
          <Field label="Orders to generate (1–100)"><input type="number" min="1" max="100" step="1" value={ordersRequested} onChange={(event) => setOrdersRequested(event.target.value)} required/></Field>
          <Field label="Period start"><input type="date" value={periodStart} max={periodEnd || undefined} onChange={(event) => setPeriodStart(event.target.value)} required/></Field>
          <Field label="Period end"><input type="date" value={periodEnd} min={periodStart || undefined} onChange={(event) => setPeriodEnd(event.target.value)} required/></Field>
          <Field label="Random seed (optional)"><input type="number" min="0" max="2147483647" step="1" placeholder="Leave empty for a random seed" value={randomSeed} onChange={(event) => setRandomSeed(event.target.value)}/></Field>
          <Field label="Demand profile"><select value={demandProfile} onChange={(event) => setDemandProfile(event.target.value)}><option value="balanced">Balanced demand</option><option value="bestsellers">Best sellers focus</option><option value="new-arrivals">New arrivals focus</option></select></Field>
          <Field label="Promotion chance (%)"><input type="number" min="0" max="100" step="1" value={discountProbabilityPct} onChange={(event) => setDiscountProbabilityPct(event.target.value)}/></Field>
          <Field label="Discount when applied (%)"><input type="number" min="0" max="30" step="1" value={discountPct} onChange={(event) => setDiscountPct(event.target.value)}/></Field>
        </div>
        <p className="admin-table-footnote">Each simulated order contains 1–3 different product lines. Quantities are limited by available stock. The selected seed makes product selection, quantities and simulated dates reproducible when the catalogue and stock are unchanged.</p>
        {formError && <p className="admin-form-error">{formError}</p>}
        <div className="admin-modal-actions admin-simulator-actions">
          <button className="admin-primary-button" type="submit" disabled={busy || dataSourceStatus !== 'database'}><Icon name="play" size={15}/>{busy ? 'Generating orders…' : `Generate ${ordersRequested || '0'} orders`}</button>
        </div>
      </form>
    </section>

    {mostRecentRun && <section className="admin-panel admin-simulator-result">
      <div className="admin-panel-heading"><div><p className="eyebrow">LATEST COMPLETED RUN</p><h3>Generation summary</h3></div><span className="admin-order-status is-completed">{mostRecentRun.status}</span></div>
      <div className="admin-sim-result-meta">Run #{mostRecentRun.id} · Seed {mostRecentRun.randomSeed ?? '—'} · {formatRunDate(mostRecentRun.periodStart)} – {formatRunDate(mostRecentRun.periodEnd)}</div>
      <div className="admin-metric-grid admin-sim-metrics">
        <Metric label="Orders created" value={Number(mostRecentRun.ordersCreated || 0).toLocaleString('en-GB')} note={`${mostRecentRun.ordersRequested} requested`} icon="receipt"/>
        <Metric label="Units sold" value={Number(recentSummary.units || 0).toLocaleString('en-GB')} note="Across simulated orders" icon="boxes"/>
        <Metric label="Net sales (ex VAT)" value={money(recentSummary.netSales)} note="After discounts" icon="chart"/>
        <Metric label="Gross profit" value={money(recentSummary.grossProfit)} note="Net sales less COGS" icon="trending-up"/>
      </div>
      {recentSummary.inventoryLimited && <p className="admin-sim-warning">The run created fewer orders than requested because available stock was exhausted.</p>}
      <div className="admin-sim-detail-grid">
        <span>Gross sales before discounts</span><strong>{money(recentSummary.subtotalGross)}</strong>
        <span>Discounts</span><strong>{money(recentSummary.discountTotalGross)}</strong>
        <span>Total sales (inc VAT)</span><strong>{money(recentSummary.totalGross)}</strong>
        <span>VAT</span><strong>{money(recentSummary.vatTotal)}</strong>
        <span>Cost of goods sold</span><strong>{money(recentSummary.costOfGoodsSold)}</strong>
        <span>Average order value</span><strong>{money(recentSummary.averageOrderValueGross)}</strong>
      </div>
    </section>}

    <section className="admin-panel admin-sim-history">
      <div className="admin-panel-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h3>Recent simulation runs</h3></div><span className="admin-count">{runs.length}</span></div>
      {loading ? <p className="admin-muted">Loading simulation history…</p> : runs.length ? <div className="admin-table-wrap"><table className="admin-table admin-simulation-table"><thead><tr><th>Run</th><th>Period</th><th>Orders</th><th>Units</th><th>Net sales</th><th>Seed</th><th>Status</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td><strong>#{run.id}</strong><small>{run.simulationMode === 'live' ? 'Manual demo' : run.simulationMode}</small></td><td>{formatRunDate(run.periodStart)} – {formatRunDate(run.periodEnd)}</td><td>{run.ordersCreated} / {run.ordersRequested}</td><td>{Number(run.summary?.units || 0)}</td><td>{money(run.summary?.netSales)}</td><td>{run.randomSeed ?? '—'}</td><td><span className={`admin-order-status ${run.status === 'completed' ? 'is-completed' : 'is-cancelled'}`}>{run.status}</span></td></tr>)}</tbody></table></div> : <div className="admin-empty-orders"><Icon name="chart" size={25}/><h3>No simulation runs yet</h3><p>Generate your first batch of synthetic orders above. The run history and all generated orders will be saved in PostgreSQL.</p></div>}
      <p className="admin-table-footnote">The run log records requested and completed order counts, date range, random seed and sales summary. Generated orders can also be reviewed in the Orders workspace.</p>
    </section>
  </>
}

function HistoricalDataPanel({ dataSourceStatus, status, loading, error, busy, onGenerate }) {
  const [ordersRequested, setOrdersRequested] = useState('2700')
  const [randomSeed, setRandomSeed] = useState('20251101')
  const [formError, setFormError] = useState('')
  const run = status?.run || null
  const summary = run?.summary || {}

  const submit = async (event) => {
    event.preventDefault()
    const count = Number(ordersRequested)
    const seed = Number(randomSeed)
    if (!Number.isInteger(count) || count < 2400 || count > 3000) {
      setFormError('Choose between 2,400 and 3,000 historical orders.')
      return
    }
    if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
      setFormError('Random seed must be a whole number from 0 to 2147483647.')
      return
    }
    const confirmed = window.confirm('Generate the one-off 12-month historical dataset? This creates 2,400–3,000 historical orders and a separate virtual inventory ledger. Current live stock and existing live orders will not be changed. The dataset is protected against accidental duplicate generation.')
    if (!confirmed) return
    setFormError('')
    await onGenerate({ ordersRequested: count, randomSeed: seed })
  }

  return <>
    <div className="admin-section-heading">
      <div><p className="eyebrow">RETAIL ANALYTICS FOUNDATION</p><h2>Historical data generator</h2></div>
      <span className="admin-readonly-note">One-off dataset · PostgreSQL</span>
    </div>

    <div className="admin-orders-note">
      <strong>12-month synthetic trading history — separate from live sales</strong>
      <span>Generate a reproducible dataset for 1 November 2025 to 31 October 2026. Historical orders use price and cost snapshots and a separate virtual inventory ledger. They do not change current product stock, live inventory movements or live demo orders. No payments are taken.</span>
    </div>

    <div className="admin-metric-grid admin-historical-overview">
      <Metric label="Trading period" value="12 months" note="01 Nov 2025 – 31 Oct 2026" icon="calendar"/>
      <Metric label="Catalogue" value="150 SKUs" note="10 fictional brands" icon="package"/>
      <Metric label="Categories" value="5" note="30 products per category" icon="boxes"/>
      <Metric label="Target orders" value="2,400–3,000" note="Default: 2,700" icon="receipt"/>
    </div>

    {dataSourceStatus !== 'database' && <p className="admin-form-error">Connect PostgreSQL to generate the historical dataset.</p>}
    {error && <p className="admin-form-error">{error}</p>}
    {loading ? <section className="admin-panel"><p className="admin-muted">Checking historical dataset status…</p></section> : status?.generated ? <>
      <section className="admin-panel admin-historical-result">
        <div className="admin-panel-heading"><div><p className="eyebrow">HISTORICAL DATASET</p><h3>Generation completed</h3></div><span className="admin-order-status is-completed">Protected</span></div>
        <p className="admin-sim-result-meta">Run #{run.id} · Seed {run.randomSeed} · {formatRunDate(run.periodStart)} – {formatRunDate(run.periodEnd)}</p>
        <div className="admin-metric-grid admin-sim-metrics">
          <Metric label="Orders created" value={Number(run.ordersCreated || 0).toLocaleString('en-GB')} note="Completed historical orders" icon="receipt"/>
          <Metric label="Order lines" value={Number(summary.orderLines || 0).toLocaleString('en-GB')} note="Product rows in orders" icon="file-spreadsheet"/>
          <Metric label="Units sold" value={Number(summary.units || 0).toLocaleString('en-GB')} note="Across historical orders" icon="boxes"/>
          <Metric label="Net sales (ex VAT)" value={money(summary.netSales)} note="After discounts" icon="chart"/>
          <Metric label="COGS" value={money(summary.costOfGoodsSold)} note="Historical cost snapshots" icon="package"/>
          <Metric label="Gross profit" value={money(summary.grossProfit)} note={`${Number(summary.grossMarginPct || 0).toFixed(1)}% gross margin`} icon="trending-up"/>
        </div>
        <div className="admin-sim-detail-grid">
          <span>Gross sales before discounts</span><strong>{money(summary.subtotalGross)}</strong>
          <span>Discounts</span><strong>{money(summary.discountTotalGross)}</strong>
          <span>Total sales (inc VAT)</span><strong>{money(summary.totalGross)}</strong>
          <span>VAT</span><strong>{money(summary.vatTotal)}</strong>
          <span>Historical inventory movements</span><strong>{Number(summary.historicalInventoryMovements || 0).toLocaleString('en-GB')}</strong>
          <span>Month-end stock snapshots</span><strong>{Number(summary.inventorySnapshots || 0).toLocaleString('en-GB')}</strong>
        </div>
      </section>

      <section className="admin-panel admin-historical-result">
        <div className="admin-panel-heading"><div><p className="eyebrow">MONTHLY PROFILE</p><h3>Trading history by month</h3></div><span className="admin-count">12 months</span></div>
        <div className="admin-table-wrap"><table className="admin-table admin-historical-table"><thead><tr><th>Month</th><th>Orders</th><th>Units</th><th>Net sales</th><th>Gross profit</th></tr></thead><tbody>{(summary.monthly || []).map((month) => <tr key={month.month}><td>{formatRunMonth(month.month)}</td><td>{Number(month.orders).toLocaleString('en-GB')}</td><td>{Number(month.units).toLocaleString('en-GB')}</td><td>{money(month.netSales)}</td><td>{money(month.grossProfit)}</td></tr>)}</tbody></table></div>
        <p className="admin-table-footnote">The first product launches on 18 January 2026. November and December 2025, and 1–17 January 2026, correctly contain no sales because no catalogue products were available yet.</p>
      </section>
      <div className="admin-orders-note"><strong>Historical dataset is protected from duplicate generation.</strong><span>This is a one-off dataset. It is stored separately from manual demo sales and its virtual inventory history does not alter current stock levels. To create a different dataset later, we should design a deliberate replacement workflow with backup and confirmation.</span></div>
    </> : <section className="admin-panel admin-simulator-panel">
      <div className="admin-panel-heading"><div><p className="eyebrow">RUN CONFIGURATION</p><h3>Generate 12-month history</h3></div><span className="admin-stock-pill is-in">Historical mode</span></div>
      <form onSubmit={submit}>
        <div className="admin-simulator-fields admin-historical-fields">
          <Field label="Historical orders (2,400–3,000)"><input type="number" min="2400" max="3000" step="1" value={ordersRequested} onChange={(event) => setOrdersRequested(event.target.value)} required/></Field>
          <Field label="Random seed"><input type="number" min="0" max="2147483647" step="1" value={randomSeed} onChange={(event) => setRandomSeed(event.target.value)} required/></Field>
          <Field label="Period start"><input type="text" value="01 November 2025" readOnly/></Field>
          <Field label="Period end"><input type="text" value="31 October 2026" readOnly/></Field>
        </div>
        <p className="admin-table-footnote">Expected output: approximately 3,500–5,000 order lines, plus historical opening stock, receipts, sales movements and 12 month-end inventory snapshots per SKU. Seed {randomSeed || '—'} makes the generated dataset reproducible for the same catalogue data.</p>
        <p className="admin-sim-warning">Important: the earliest product launch date in this catalogue is 18 January 2026. The generator respects launch dates, so November and December 2025 and 1–17 January 2026 will be zero-sales periods. Historical generation does not modify live stock.</p>
        {formError && <p className="admin-form-error">{formError}</p>}
        <div className="admin-modal-actions admin-simulator-actions">
          <button className="admin-primary-button" type="submit" disabled={busy || dataSourceStatus !== 'database'}><Icon name="play" size={15}/>{busy ? 'Generating historical data…' : `Generate ${Number(ordersRequested || 0).toLocaleString('en-GB')} historical orders`}</button>
        </div>
      </form>
    </section>}
  </>
}

function formatRunMonth(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date)
}

function toDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatRunDate(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function NewOrderForm({ products, busy, onClose, onCreate }) {
  const availableProducts = products.filter((product) => Number(product.stock) > 0)
  const [productId, setProductId] = useState(availableProducts[0]?.id || '')
  const [quantity, setQuantity] = useState('1')
  const [customerName, setCustomerName] = useState('Demo customer')
  const [error, setError] = useState('')
  const selectedProduct = availableProducts.find((product) => product.id === productId)

  const submit = async (event) => {
    event.preventDefault()
    if (!selectedProduct) { setError('Choose a product that is in stock.'); return }
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > Number(selectedProduct.stock)) {
      setError(`Enter a whole number from 1 to ${selectedProduct.stock}.`)
      return
    }
    setError('')
    const succeeded = await onCreate({
      customerName,
      source: 'admin',
      items: [{ productId, quantity: Number(quantity) }],
    })
    if (!succeeded) setError('The order was not created. Check the message on the dashboard.')
  }

  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <form className="admin-modal" onSubmit={submit}>
      <div className="admin-modal-heading"><div><p className="eyebrow">ORDER SIMULATION · SINGLE LINE</p><h2>Create demo order</h2></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close">×</button></div>
      {availableProducts.length ? <>
        <div className="admin-form-grid">
          <Field label="Customer name"><input value={customerName} maxLength={120} onChange={(event) => setCustomerName(event.target.value)}/></Field>
          <Field label="Product"><select value={productId} onChange={(event) => { setProductId(event.target.value); setQuantity('1') }}>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name} · {product.stock} in stock</option>)}</select></Field>
          <Field label="Quantity"><input type="number" min="1" max={selectedProduct?.stock || 1} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)}/></Field>
          <Field label="Unit selling price"><input readOnly value={selectedProduct ? money(selectedProduct.price) : '—'}/></Field>
        </div>
        {selectedProduct && <p className="admin-table-footnote">Current stock: {selectedProduct.stock} · Unit cost: {money(selectedProduct.cost)}. The server will take the actual price and cost from PostgreSQL, not from this form.</p>}
      </> : <p className="admin-form-error">There are no products currently in stock.</p>}
      {error && <p className="admin-form-error">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-secondary-button" onClick={onClose} disabled={busy}>Cancel</button><button className="admin-primary-button" type="submit" disabled={busy || !availableProducts.length}>{busy ? 'Creating…' : 'Create order'}</button></div>
    </form>
  </div>
}

function OrderDetailsDialog({ order, onClose }) {
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="admin-modal admin-order-detail-modal">
      <div className="admin-modal-heading"><div><p className="eyebrow">ORDER DETAILS · {order.status.toUpperCase()}</p><h2>{order.orderNumber}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
      <p className="admin-order-detail-meta">{order.customerName} · {new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(order.orderDate))}</p>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Unit cost</th><th>Line total</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td><strong>{item.productName}</strong><small>{item.sku} · {item.brand}</small></td><td>{item.quantity}</td><td>{money(item.unitPriceGross)}</td><td>{money(item.unitCost)}</td><td>{money(item.lineTotalGross)}</td></tr>)}</tbody></table></div>
      <div className="admin-order-totals"><span>Net sales (ex VAT)</span><strong>{money(order.totalGross - order.vatTotal)}</strong><span>VAT</span><strong>{money(order.vatTotal)}</strong><span>Total (inc VAT)</span><strong>{money(order.totalGross)}</strong></div>
      <div className="admin-modal-actions"><button type="button" className="admin-primary-button" onClick={onClose}>Close</button></div>
    </section>
  </div>
}

function Metric({ label, value, note, icon, tone = '' }) {
  return <div className={`admin-metric ${tone}`}><div className="admin-metric-top"><span>{label}</span><Icon name={icon} size={18}/></div><strong>{value}</strong>{note && <small>{note}</small>}</div>
}
function StockStatus({ product }) {
  const out = product.stock === 0
  const low = !out && product.stock <= product.reorderLevel
  return <span className={`admin-stock-pill ${out ? 'is-out' : low ? 'is-low' : 'is-in'}`}>{out ? 'Out of stock' : low ? 'Low stock' : 'In stock'}</span>
}
function ProductEditor({ product, onChange, onSave, onClose }) {
  const set = (key, value) => onChange((current) => ({ ...current, [key]: value }))
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><form className="admin-modal" onSubmit={(e) => { e.preventDefault(); const stock = Number(product.stock); onSave({ ...product, price: Number(product.price), cost: Number(product.cost), stock, reorderLevel: Number(product.reorderLevel), stockStatus: stock === 0 ? 'out-of-stock' : stock <= Number(product.reorderLevel) ? 'low-stock' : 'in-stock' }) }}><div className="admin-modal-heading"><div><p className="eyebrow">EDIT PRODUCT</p><h2>{product.name}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div><div className="admin-form-grid"><Field label="Product name"><input required value={product.name} onChange={(e) => set('name', e.target.value)}/></Field><Field label="SKU (read only)"><input value={product.sku} readOnly/></Field><Field label="Brand"><select value={product.brand} onChange={(e) => set('brand', e.target.value)}>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select></Field><Field label="Category"><select value={product.category} onChange={(e) => set('category', e.target.value)}>{categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></Field><Field label="Selling price (£)"><input type="number" min="0" step="0.01" required value={product.price} onChange={(e) => set('price', e.target.value)}/></Field><Field label="Unit cost (£)"><input type="number" min="0" step="0.01" required value={product.cost} onChange={(e) => set('cost', e.target.value)}/></Field><Field label="Stock quantity"><input type="number" min="0" step="1" required value={product.stock} onChange={(e) => set('stock', e.target.value)}/></Field><Field label="Reorder level"><input type="number" min="0" step="1" required value={product.reorderLevel} onChange={(e) => set('reorderLevel', e.target.value)}/></Field><Field label="Short description" wide><input value={product.descriptor} onChange={(e) => set('descriptor', e.target.value)}/></Field></div><div className="admin-modal-actions"><button type="button" className="admin-secondary-button" onClick={onClose}>Cancel</button><button className="admin-primary-button" type="submit">Save changes</button></div></form></div>
}
function NewProductForm({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState(brands[0])
  const [category, setCategory] = useState('skincare')
  const [price, setPrice] = useState('25')
  const [cost, setCost] = useState('9')
  const [stock, setStock] = useState('10')
  const [descriptor, setDescriptor] = useState('A considered everyday essential')
  const [error, setError] = useState('')
  const submit = (e) => { e.preventDefault(); if (Number(cost) > Number(price)) { setError('Unit cost cannot exceed the selling price in this demo.'); return } onSave({ id: `LB-${Date.now()}`, sku: `LB-${Date.now()}`, name: name.trim(), brand, category, price: Number(price), cost: Number(cost), stock: Number(stock), reorderLevel: 5, stockStatus: Number(stock) === 0 ? 'out-of-stock' : Number(stock) <= 5 ? 'low-stock' : 'in-stock', descriptor, shape: 'bottle', tone: 'ivory', bestseller: false, isNew: true, launchDate: new Date().toISOString().slice(0,10), size: 'Standard Size', rating: 4.7, reviewCount: 0 }) }
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><form className="admin-modal" onSubmit={submit}><div className="admin-modal-heading"><div><p className="eyebrow">NEW CATALOGUE RECORD</p><h2>Add product</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div><div className="admin-form-grid"><Field label="Product name"><input required value={name} onChange={(e) => setName(e.target.value)}/></Field><Field label="Brand"><select value={brand} onChange={(e) => setBrand(e.target.value)}>{brands.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></Field><Field label="Selling price (£)"><input type="number" min="0.01" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)}/></Field><Field label="Unit cost (£)"><input type="number" min="0" step="0.01" required value={cost} onChange={(e) => setCost(e.target.value)}/></Field><Field label="Opening stock"><input type="number" min="0" step="1" required value={stock} onChange={(e) => setStock(e.target.value)}/></Field><Field label="Short description" wide><input value={descriptor} onChange={(e) => setDescriptor(e.target.value)}/></Field></div>{error && <p className="admin-form-error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-secondary-button" onClick={onClose}>Cancel</button><button className="admin-primary-button" type="submit">Add product</button></div></form></div>
}
function Field({ label, children, wide }) { return <label className={`admin-field ${wide ? 'is-wide' : ''}`}><span>{label}</span>{children}</label> }
