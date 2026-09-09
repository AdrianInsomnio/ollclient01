import { get, post, put, patch, del } from '../api-client'

export interface Product {
  id: number
  name: string
  description?: string
  sku?: string
  price: number
  cost?: number
  stock: number
  minStock: number
  isActive: boolean
  discontinuedAt?: string | null
  categoryId?: number | null
  category?: { id: number; name: string } | null
  createdAt?: string
  updatedAt?: string
}

export interface ProductFilters {
  search?: string
  isActive?: boolean
  categoryId?: number
  includeDiscontinued?: boolean
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
    if (filters.categoryId !== undefined) params.append('categoryId', String(filters.categoryId))
    if (filters.includeDiscontinued) params.append('includeDiscontinued', 'true')
    if (params.toString()) query = '?' + params.toString()
  }

  const response = await get<ProductsResponse | Product[]>(`/products${query}`)
  if (Array.isArray(response)) return response
  return response.products ?? []
}

// GET /api/products/:id
export async function getProductById(id: number) {
  const response = await get<Product | { product: Product }>(`/products/${id}`)
  return 'product' in response ? response.product : response
}

// POST /api/products (create)
export type ProductPayload = Pick<Product, 'name' | 'price' | 'stock' | 'minStock' | 'isActive'> & Partial<Pick<Product, 'description' | 'sku' | 'categoryId' | 'cost'>>

export async function createProduct(data: ProductPayload) {
  return await post<Product>('/products', data)
}

// PUT /api/products/:id
export async function updateProduct(id: number, data: Partial<Product>) {
  const response = await put<Product | { product: Product }>(`/products/${id}`, data)
  return 'product' in response ? response.product : response
}

export async function updateProductStatus(id: number, isActive: boolean) {
  const response = await patch<{ product: Product }>(`/products/${id}/status`, { isActive })
  return response.product
}

export interface StockMovement {
  id: number
  productId: number
  type: string
  quantity: number
  reason?: string | null
  referenceType?: string | null
  referenceId?: number | null
  notes?: string | null
  createdAt: string
}

export async function adjustProductStock(id: number, data: { quantity: number; reason: string; notes?: string }) {
  return post<{ message: string; newStock: number }>(`/products/${id}/stock-adjustment`, data)
}

export async function getProductStockMovements(id: number) {
  const response = await get<{ movements: StockMovement[] }>(`/products/${id}/movements`)
  return response.movements ?? []
}

// DELETE /api/products/:id
export async function deleteProduct(id: number) {
  return await del<void>(`/products/${id}`)
}
