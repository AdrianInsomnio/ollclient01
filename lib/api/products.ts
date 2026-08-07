import { get, post, put, del } from '../api-client'

export interface Product {
  id: number
  name: string
  description?: string
  sku?: string
  price: number
  cost?: number
  stock: number
  isActive: boolean
}

export interface ProductFilters {
  search?: string
  isActive?: boolean
}

// GET /api/products
export async function getProducts(filters?: ProductFilters) {
  let query = ''
  if (filters) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive))
    if (params.toString()) query = '?' + params.toString()
  }
  return await get<Product[]>(`/products${query}`)
}

// GET /api/products/:id
export async function getProductById(id: number) {
  return await get<Product>(`/products/${id}`)
}

// POST /api/products (create)
export async function createProduct(data: Partial<Product>) {
  return await post<Product>('/products', data)
}

// PUT /api/products/:id
export async function updateProduct(id: number, data: Partial<Product>) {
  return await put<Product>(`/products/${id}`, data)
}

// DELETE /api/products/:id
export async function deleteProduct(id: number) {
  return await del<void>(`/products/${id}`)
}
