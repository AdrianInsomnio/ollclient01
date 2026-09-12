import type { CloseConsultationResponse } from '@/lib/api/consultations'
import { registerSalePrint, type Sale, type SalePrintResponse } from '@/lib/api/sales'

const PRINT_AGENT_URL = process.env.NEXT_PUBLIC_PRINT_AGENT_URL || 'http://localhost:3333'
const PRINT_AGENT_API_KEY = process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY || 'admin_local'
const CLINIC_NAME = process.env.NEXT_PUBLIC_PRINT_CLINIC_NAME || 'Veterinaria'

type PrintStatus = 'idle' | 'printing' | 'success' | 'error'

export interface LocalPrintState {
  status: PrintStatus
  message: string
}

export interface ConsultationPrintPayload {
  config?: {
    width: number
    cut: 'full' | 'partial'
    feedLines: number
  }
  type?: string
  clinic: {
    name: string
  }
  client: {
    name: string
    documentId?: string
    phone?: string
  }
  pet: {
    name: string
    species?: string
    breed?: string
  }
  consultation: {
    id: string | number
    createdAt?: string
    closedAt?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  tax: number
  total: number
  payments: Array<{
    method: string
    amount: number
  }>
  number?: string | number
  footer?: {
    message?: string
  }
}

interface BackendPrintData {
  client?: ConsultationPrintPayload['client']
  pet?: ConsultationPrintPayload['pet']
  consultation?: {
    id: string | number
    date?: string
  }
  items?: Array<{
    name?: string
    description?: string
    quantity?: number
    price?: number
    subtotal?: number
  }>
  subtotal?: number
  tax?: number
  total?: number
  paymentMethod?: string
  payments?: ConsultationPrintPayload['payments']
  saleId?: string | number
}

type PrintableItem = {
  name?: string
  description?: string
  nameSnapshot?: string
  quantity?: number
  price?: number
  priceSnapshot?: number
  subtotal?: number
}

export function createConsultationPrintPayload(response: CloseConsultationResponse): ConsultationPrintPayload {
  const printData = (response.printData || {}) as BackendPrintData
  const sale = response.sale
  const consultation = response.consultation

  return {
    config: {
      width: 48,
      cut: 'full',
      feedLines: 3,
    },
    clinic: {
      name: CLINIC_NAME,
    },
    client: {
      name: printData.client?.name || consultation.client?.name || `Cliente #${consultation.clientId}`,
      documentId: printData.client?.documentId || consultation.client?.documentId,
      phone: printData.client?.phone || consultation.client?.phone,
    },
    pet: {
      name: printData.pet?.name || consultation.pet?.name || `Mascota #${consultation.petId}`,
      species: printData.pet?.species || consultation.pet?.species,
      breed: printData.pet?.breed || consultation.pet?.breed,
    },
    consultation: {
      id: printData.consultation?.id || consultation.id,
      createdAt: printData.consultation?.date || consultation.createdAt,
      closedAt: consultation.updatedAt,
    },
    items: ((printData.items || sale?.items || []) as PrintableItem[]).map((item) => ({
      description: item.name || item.description || item.nameSnapshot || 'Item',
      quantity: item.quantity || 1,
      unitPrice: item.price ?? item.priceSnapshot ?? 0,
      total: item.subtotal ?? (item.price ?? item.priceSnapshot ?? 0) * (item.quantity || 1),
    })),
    subtotal: printData.subtotal ?? sale?.subtotal ?? 0,
    tax: printData.tax ?? sale?.tax ?? 0,
    total: printData.total ?? sale?.total ?? 0,
    payments: printData.payments || (sale ? [{ method: printData.paymentMethod || sale.paymentMethod || 'Sin pago', amount: sale.total }] : []),
    number: printData.saleId || sale?.id,
    footer: {
      message: 'Gracias por su visita',
    },
  }
}

export async function printConsultationTicket(payload: ConsultationPrintPayload): Promise<void> {
  const response = await fetch(`${PRINT_AGENT_URL}/api/print/consultation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PRINT_AGENT_API_KEY,
    },
    body: JSON.stringify({ ticket: payload }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || error.error || 'No se pudo imprimir el ticket')
  }
}
export function createSalePrintPayload(sale: Sale, printData?: SalePrintResponse['printData']): ConsultationPrintPayload {
  const items = sale.items ?? sale.saleItems ?? []
  return {
    config: {
      width: 48,
      cut: 'full',
      feedLines: 3,
    },
    type: printData?.type || 'TICKET ORIGINAL',
    clinic: {
      name: CLINIC_NAME,
    },
    client: {
      name: sale.client?.name ?? `Cliente #${sale.clientId}`,
      documentId: sale.client?.documentId,
      phone: sale.client?.phone,
    },
    pet: sale.pet ? {
      name: sale.pet.name ?? `Mascota #${sale.petId}`,
      species: undefined,
      breed: undefined,
    } : {
      name: 'Sin mascota',
      species: undefined,
      breed: undefined,
    },
    consultation: {
      id: sale.id,
      createdAt: sale.createdAt,
      closedAt: undefined,
    },
    items: (printData?.items || items).map(item => ({
      description: 'name' in item ? item.name : item.nameSnapshot ?? 'Item',
      quantity: item.quantity,
      unitPrice: 'price' in item ? item.price : item.priceSnapshot,
      total: item.subtotal,
    })),
    subtotal: printData?.subtotal ?? sale.subtotal,
    tax: printData?.tax ?? sale.tax,
    total: printData?.total ?? sale.total,
    payments: printData?.payments || sale.payments || [{ method: sale.paymentMethod ?? 'efectivo', amount: sale.total }],
    number: sale.id,
    footer: {
      message: 'Gracias por su visita',
    },
  };
}

export async function printSaleTicket(sale: Sale): Promise<void> {
  const registered = await registerSalePrint(sale.id);
  const payload = createSalePrintPayload(registered.sale, registered.printData);
  await printConsultationTicket(payload);
}

export async function reprintSaleTicket(saleId: string | number, reason?: string): Promise<void> {
  const registered = await registerSalePrint(saleId, reason);
  const payload = createSalePrintPayload(registered.sale, registered.printData);
  await printConsultationTicket(payload);
}
