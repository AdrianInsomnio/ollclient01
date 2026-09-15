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
    items: Array<{ name: string; quantity: number; price: number; subtotal: number; ivaIncluded?: boolean; ivaRate?: number; netAmount?: number; taxAmount?: number }>
    subtotal: number
    discount: number
    tax: number
    total: number
    payments: Array<{ method: string; amount: number }>
    taxRate?: number
  }
}

export interface SaleItem {
  id: string
  saleId: string
  itemType: 'product' | 'service' | 'subscription_installment'
  itemId: number
  nameSnapshot: string
  priceSnapshot: number
  unitPrice?: number
  ivaIncluded: boolean
  ivaRate: number
  netAmount: number
  taxAmount: number
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
  payments?: Array<{ method: string; amount: number; reference?: string; notes?: string }>
  cashShiftId?: number
  notes?: string
  subscriptionInstallmentIds?: number[]
}

export interface PosInstallmentPreparation {
  client: { id: number; name: string; documentId?: string | null }
  subscriptionId: number
  plan: { id: number; name: string }
  installmentIds: number[]
  futureInstallmentId?: number | null
  installments: Array<{
    id: number
    periodStart: string
    periodEnd: string
    dueDate: string
    amount: number
    lateFee: number
    totalAmount: number
    status: 'PENDING' | 'PAID' | 'CANCELLED'
  }>
  total: number
}

export async function prepareInstallmentsForPos(data: {
  clientId: number
  installmentIds: number[]
  futureInstallmentId?: number | null
}) {
  const response = await post<{ preparation: PosInstallmentPreparation }>(
    '/subscription-installments/prepare-pos',
    data,
  )
  return response.preparation
}

// GET /api/sales
interface SalesResponse {
  sales: Array<Sale & { items?: SaleItem[]; saleItems?: SaleItem[] }>
}

export async function getSales(filters?: { cashShiftId?: number }): Promise<Sale[]> {
  const query = filters?.cashShiftId ? `?cashShiftId=${filters.cashShiftId}` : ''
  const response = await get<SalesResponse>(`/sales${query}`)
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
  const sale = response.sale as Sale & { saleItems?: SaleItem[] }
  return { ...sale, items: sale.saleItems ?? sale.items ?? [] }
}

// POST /api/sales
export async function createSale(data: CreateSalePayload, idempotencyKey?: string) {
  const key = idempotencyKey ?? (
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  )
  return await post<Sale>('/sales', data, { idempotencyKey: key })
}

export interface HoldSalePayload {
  draftId?: string | number
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

export type DraftSalePayload = Omit<HoldSalePayload, 'cashShiftId'>

export async function createDraftSale(data: DraftSalePayload) {
  const response = await post<{ sale: Sale }>('/sales/drafts', data)
  return response.sale
}

export async function getDraftSales() {
  const response = await get<{ sales: Sale[] }>('/sales/drafts')
  return response.sales
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
  cashShiftId?: number
  payments?: Array<{ method: string; amount: number; reference?: string; notes?: string }>
}

export async function updateSale(id: string, data: UpdateSalePayload) {
  return await put<Sale>(`/sales/${id}`, data)
}

// DELETE /api/sales/:id
export async function deleteSale(id: string) {
  return await del<void>(`/sales/${id}`)
}

// DELETE /api/sales/:id is the existing audited cancellation operation.
// The backend soft-cancels the sale and returns the updated record.
export async function cancelSale(id: string | number, reason?: string) {
  const response = await del<Sale & { saleItems?: SaleItem[] }>(`/sales/${id}`, {
    body: JSON.stringify(reason ? { reason } : {}),
  })
  return { ...response, items: response.saleItems ?? response.items ?? [] }
}

export interface SaleReturnItem {
  productId: number
  quantity: number
  notes?: string
}

export async function returnSale(id: string | number, items: SaleReturnItem[]) {
  return await post<{ saleId: number; returned: SaleReturnItem[] }>(`/sales/${id}/return`, { items })
}

export async function correctSale(id: string | number, data: UpdateSalePayload) {
  return await post<{ original: Sale; waiting: Sale }>(`/sales/${id}/correct`, data)
}

export async function registerSalePrint(id: string | number, reason?: string) {
  return await post<SalePrintResponse>(`/sales/${id}/print`, reason ? { reason } : {})
}

export async function getSalePrintHistory(id: string | number) {
  return await get<{ prints: SalePrintResponse['print'][] }>(`/sales/${id}/prints`)
}
