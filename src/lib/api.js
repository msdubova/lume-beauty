const API_BASE = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `API request failed (${response.status})`)
  }
  return payload
}

export const checkApiHealth = () => request('/health')
export const getProducts = () => request('/products')
export const updateProductApi = (product) => request(`/products/${encodeURIComponent(product.id)}`, {
  method: 'PUT',
  body: JSON.stringify(product),
})
export const createProductApi = (product) => request('/products', {
  method: 'POST',
  body: JSON.stringify(product),
})

export const getOrders = (limit = 100) => request(`/orders?limit=${encodeURIComponent(limit)}`)
export const getOrder = (id) => request(`/orders/${encodeURIComponent(id)}`)
export const createOrderApi = (order) => request('/orders', {
  method: 'POST',
  body: JSON.stringify(order),
})
export const cancelOrderApi = (id) => request(`/orders/${encodeURIComponent(id)}/cancel`, {
  method: 'POST',
})

export const getSimulationRuns = (limit = 20) => request(`/simulations?limit=${encodeURIComponent(limit)}`)
export const generateSalesSimulationApi = (settings) => request('/simulations/generate', {
  method: 'POST',
  body: JSON.stringify(settings),
})

export const getHistoricalDatasetStatus = () => request('/historical/status')
export const generateHistoricalDatasetApi = (settings) => request('/historical/generate', {
  method: 'POST',
  body: JSON.stringify(settings),
})
