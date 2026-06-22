
import { get, post, put, del } from '../api-client'

export interface Consultation {
  id: string
  clientId: string | number
  petId: string | number
  client?: {
    id: string | number
    name: string
    phone?: string
    documentId?: string
  }
  pet?: {
    id: string | number
    name: string
    species: string
    breed?: string
  }
  vetId?: string
  status: 'OPEN' | 'CLOSED'
  notes?: string
  weight?: number
  temperature?: number
  symptoms?: string
  diagnosis?: string
  treatment?: string
  diagnoses?: Array<{ id: string | number; description: string }>
  treatments?: Array<{ id: string | number; description: string }>
  prescriptions?: Array<{ id: string | number; description: string }>
  sales?: Sale[]
  totalFee?: number
  createdAt: string
  updatedAt: string
}

export interface ConsultationItem {
  id: string
  itemType: 'product' | 'service'
  itemId: number
  nameSnapshot: string
  priceSnapshot: number
  quantity: number
  subtotal: number
}

export interface Sale {
  id: string
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: string
  items: ConsultationItem[]
}

export interface CreateConsultationPayload {
  clientId: string | number
  petId: string | number
  notes?: string
}

export interface AddConsultationItemPayload {
  itemType: 'product' | 'service'
  itemId: number
  nameSnapshot?: string
  priceSnapshot?: number
  quantity: number
}

export interface CloseConsultationPayload {
  items: AddConsultationItemPayload[]
  paymentMethod: string
  payments?: Array<{
    method: string
    amount: number
  }>
  discount?: number
}

export interface UpdateClinicalPayload {
  weight?: number
  temperature?: number
  symptoms?: string
  diagnosis?: string
  treatment?: string
  notes?: string
}

interface ConsultationsResponse {
  consultations: Consultation[]
}

interface ConsultationResponse {
  consultation: Consultation
}

interface OpenConsultationResponse {
  consultation?: Consultation
  id?: string
}

export interface CloseConsultationResponse {
  consultation: Consultation
  sale: Sale
  printData: unknown
}

// Simple UUID v4 generator (sufficient for idempotency key)
const generateIdempotencyKey = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export async function getConsultations(): Promise<Consultation[]> {
  const response = await get<ConsultationsResponse>('/consultations')
  return response.consultations
}

export async function getConsultation(id: string): Promise<Consultation> {
  const response = await get<ConsultationResponse>('/consultations/' + id)
  return response.consultation
}

export async function getOpenConsultations(): Promise<Consultation[]> {
  const response = await get<ConsultationsResponse>('/consultations?status=OPEN')
  return response.consultations
}

export async function openConsultation(data: CreateConsultationPayload): Promise<Consultation> {
  const response = await post<OpenConsultationResponse | Consultation>('/consultations', {
    ...data,
    clientId: Number(data.clientId),
    petId: Number(data.petId),
  })
  return 'consultation' in response && response.consultation ? response.consultation : response as Consultation
}

export async function closeConsultation(id: string, data: CloseConsultationPayload): Promise<CloseConsultationResponse> {
  const idempotencyKey = generateIdempotencyKey()
  return post<CloseConsultationResponse>('/consultations/' + id + '/close', data, { idempotencyKey })
}

export async function addConsultationItem(consultationId: string, data: AddConsultationItemPayload): Promise<Consultation> {
  const response = await post<ConsultationResponse>('/consultations/' + consultationId + '/items', data)
  return response.consultation
}

export async function updateConsultationNotes(id: string, notes: string): Promise<Consultation> {
  const response = await put<ConsultationResponse>('/consultations/' + id, { notes })
  return response.consultation
}

export async function updateConsultationClinical(id: string, data: UpdateClinicalPayload): Promise<Consultation> {
  const response = await put<ConsultationResponse>('/consultations/' + id, data)
  return response.consultation
}

export async function addDiagnosis(id: string, description: string): Promise<{ id: string | number; description: string }> {
  return post('/consultations/' + id + '/diagnoses', { description })
}

export async function addTreatment(id: string, description: string): Promise<{ id: string | number; description: string }> {
  return post('/consultations/' + id + '/treatments', { description })
}

export async function addPrescription(id: string, description: string): Promise<{ id: string | number; description: string }> {
  return post('/consultations/' + id + '/prescriptions', { description })
}

