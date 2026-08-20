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

export interface ProductsResponse {
  products: Product[]
}

// GET /api/products
// Tolerante: el backend responde { products: [...] } pero aceptamos tambien un array directo.
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  let query = ''
  if (filters) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive))
    if (params.toString()) query = '?' + params.toString()
  }

  const response = await get<ProductsResponse | Product[]>(`/products${query}`)
  if (Array.isArray(response)) return response
  return response.products ?? []
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
