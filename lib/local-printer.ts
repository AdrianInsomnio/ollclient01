import type { CloseConsultationResponse } from '@/lib/api/consultations'

const PRINT_AGENT_URL = process.env.NEXT_PUBLIC_PRINT_AGENT_URL || 'http://localhost:3333'
const PRINT_AGENT_API_KEY = process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY || 'admin_local'
const CLINIC_NAME = process.env.NEXT_PUBLIC_PRINT_CLINIC_NAME || 'Veterinaria'

type PrintStatus = 'idle' | 'printing' | 'success' | 'error'

export interface LocalPrintState {
  status: PrintStatus
  message: string
}

export interface ConsultationPrintPayload {
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
    items: ((printData.items || sale.items || []) as PrintableItem[]).map((item) => ({
      description: item.name || item.description || item.nameSnapshot || 'Item',
      quantity: item.quantity || 1,
      unitPrice: item.price ?? item.priceSnapshot ?? 0,
      total: item.subtotal ?? (item.price ?? item.priceSnapshot ?? 0) * (item.quantity || 1),
    })),
    subtotal: printData.subtotal ?? sale.subtotal,
    tax: printData.tax ?? sale.tax,
    total: printData.total ?? sale.total,
    payments: printData.payments || [{ method: printData.paymentMethod || sale.paymentMethod, amount: sale.total }],
    number: printData.saleId || sale.id,
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
import type { Sale } from '@/lib/api/sales'

export function createSalePrintPayload(sale: Sale): ConsultationPrintPayload {
  return {
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
    items: sale.items.map(item => ({
      description: item.nameSnapshot ?? 'Item',
      quantity: item.quantity,
      unitPrice: item.priceSnapshot,
      total: item.subtotal,
    })),
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: sale.total,
    payments: [{
      method: sale.paymentMethod ?? 'efectivo',
      amount: sale.total,
    }],
    number: sale.id,
    footer: {
      message: 'Gracias por su visita',
    },
  };
}

export async function printSaleTicket(sale: Sale): Promise<void> {
  const payload = createSalePrintPayload(sale);
  await printConsultationTicket(payload);
}
