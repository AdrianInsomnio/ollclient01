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
  status: 'DRAFT' | 'WAITING' | 'CONFIRMED' | 'CANCELLED'
  paymentMethod?: string
  items: SaleItem[]
  saleItems?: SaleItem[]
  client?: { id: string | number; name: string; documentId?: string; phone?: string }
  pet?: { id: string | number; name: string }
  createdAt?: string
  updatedAt?: string
  cashShiftId?: number | null
  payments?: Array<{ id?: string; method: string; amount: number }>
}

export interface SalePrintResponse {
  print: {
    id: number
    type: 'ORIGINAL' | 'DUPLICATE'
    reprintNumber: number
    createdAt: string
  }
  sale: Sale & { saleItems?: SaleItem[] }
  printData: {
    type: 'TICKET ORIGINAL' | 'TICKET DUPLICADO'
    printType: 'ORIGINAL' | 'DUPLICATE'
    printId: number
    reprintNumber: number
    saleId: number
    client?: Sale['client']
    pet?: Sale['pet']
    items: Array<{ name: string; quantity: number; price: number; subtotal: number }>
    subtotal: number
    discount: number
    tax: number
    total: number
    payments: Array<{ method: string; amount: number }>
  }
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
  cashShiftId?: number
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
  if (!id || !/^\d+$/.test(id)) {
    throw new Error('El identificador de venta no es válido')
  }
  const response = await get<{ sale: Sale }>(`/sales/${id}`)
  return response.sale
}

// POST /api/sales
export async function createSale(data: CreateSalePayload) {
  return await post<Sale>('/sales', data)
}

export interface HoldSalePayload {
  clientId: string | number
  petId?: string | number
  consultationId?: string | number
  items: CreateSalePayload['items']
  discount?: number
  notes?: string
  cashShiftId: number
}

export async function createWaitingSale(data: HoldSalePayload) {
  const response = await post<{ sale: Sale }>('/sales/waiting', data)
  return response.sale
}

export async function getWaitingSales(cashShiftId: number) {
  const response = await get<{ sales: Sale[] }>(`/sales/waiting?cashShiftId=${cashShiftId}`)
  return response.sales
}

export async function resumeWaitingSale(id: string | number) {
  const response = await post<{ sale: Sale }>(`/sales/${id}/resume`, {})
  return response.sale
}

// PUT /api/sales/:id (status updates, etc.)
export interface UpdateSalePayload {
  items: CreateSalePayload['items']
  discount?: number
  paymentMethod?: string
  reason?: string
  notes?: string
}

export async function updateSale(id: string, data: UpdateSalePayload) {
  return await put<Sale>(`/sales/${id}`, data)
}

// DELETE /api/sales/:id
export async function deleteSale(id: string) {
  return await del<void>(`/sales/${id}`)
}

export async function registerSalePrint(id: string | number, reason?: string) {
  return await post<SalePrintResponse>(`/sales/${id}/print`, reason ? { reason } : {})
}

export async function getSalePrintHistory(id: string | number) {
  return await get<{ prints: SalePrintResponse['print'][] }>(`/sales/${id}/prints`)
}
