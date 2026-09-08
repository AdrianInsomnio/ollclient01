import { get, post, put, del } from '../api-client'

export interface Sale {
  id: string
  clientId: string | number
  petId?: string | number
  consultationId?: string | number
  organizationId: number
  subtotal: number
  discount: number
  tax: number
  total: number
  status: 'pending' | 'completed' | 'cancelled'
  paymentMethod?: string
  items: SaleItem[]
  saleItems?: SaleItem[]
  client?: { id: string | number; name: string; documentId?: string; phone?: string }
  pet?: { id: string | number; name: string }
  createdAt?: string
  updatedAt?: string
}

export interface SaleItem {
  id: string
  saleId: string
  itemType: 'product' | 'service'
  itemId: number
  nameSnapshot: string
  priceSnapshot: number
  quantity: number
  subtotal: number
}

export interface CreateSalePayload {
  clientId: string | number
  petId?: string | number
  consultationId?: string | number
  items: Array<{
    itemType: 'product' | 'service'
    itemId: number
    quantity: number
    /** Solo para services: el backend exige snapshot del catalogo. */
    nameSnapshot?: string
    priceSnapshot?: number
  }>
  discount?: number
  paymentMethod: string
  notes?: string
}

// GET /api/sales
interface SalesResponse {
  sales: Array<Sale & { items?: SaleItem[]; saleItems?: SaleItem[] }>
}

export async function getSales(): Promise<Sale[]> {
  const response = await get<SalesResponse>('/sales')
  return response.sales.map((sale) => ({
    ...sale,
    items: sale.saleItems ?? sale.items ?? [],
  }))
}

// GET /api/sales/:id
export async function getSaleById(id: string) {
  return await get<Sale>(`/sales/${id}`)
}

// POST /api/sales
export async function createSale(data: CreateSalePayload) {
  return await post<Sale>('/sales', data)
}

// PUT /api/sales/:id (status updates, etc.)
export async function updateSale(id: string, data: Partial<Sale>) {
  return await put<Sale>(`/sales/${id}`, data)
}

// DELETE /api/sales/:id
export async function deleteSale(id: string) {
  return await del<void>(`/sales/${id}`)
}
