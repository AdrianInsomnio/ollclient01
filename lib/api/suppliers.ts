import { get, post, put, patch } from '../api-client'

export interface Supplier {
  id: number
  name: string
  rut?: string | null
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  isActive: boolean
  _count?: { products: number }
}

export type SupplierPayload = Pick<Supplier, 'name'> & Partial<Pick<Supplier, 'rut' | 'contactName' | 'phone' | 'email' | 'address' | 'notes'>>

export async function getSuppliers(activeOnly = false) {
  const query = activeOnly ? '?activeOnly=true' : ''
  const response = await get<{ suppliers: Supplier[] }>(`/suppliers${query}`)
  return response.suppliers ?? []
}

export async function createSupplier(data: SupplierPayload) {
  const response = await post<{ supplier: Supplier }>('/suppliers', data)
  return response.supplier
}

export async function updateSupplier(id: number, data: Partial<SupplierPayload>) {
  const response = await put<{ supplier: Supplier }>(`/suppliers/${id}`, data)
  return response.supplier
}

export async function updateSupplierStatus(id: number, isActive: boolean) {
  const response = await patch<{ supplier: Supplier }>(`/suppliers/${id}/status`, { isActive })
  return response.supplier
}
