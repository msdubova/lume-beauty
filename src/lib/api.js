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
