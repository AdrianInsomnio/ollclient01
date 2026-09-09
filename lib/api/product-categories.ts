import { get, post, put, patch } from '../api-client'

export interface ProductCategory {
  id: number
  name: string
  description?: string | null
  isActive: boolean
  productsCount?: number
  _count?: { products: number }
  createdAt?: string
  updatedAt?: string
}

export async function getProductCategories() {
  const response = await get<{ categories: ProductCategory[] }>('/product-categories')
  return (response.categories ?? []).map((category) => ({
    ...category,
    productsCount: category.productsCount ?? category._count?.products ?? 0,
  }))
}

export async function createProductCategory(data: { name: string; description?: string }) {
  const response = await post<{ category: ProductCategory }>('/product-categories', data)
  return response.category
}

export async function updateProductCategory(id: number, data: { name: string; description?: string }) {
  const response = await put<{ category: ProductCategory }>(`/product-categories/${id}`, data)
  return response.category
}

export async function updateProductCategoryStatus(id: number, isActive: boolean) {
  const response = await patch<{ category: ProductCategory }>(`/product-categories/${id}/status`, { isActive })
  return response.category
}
