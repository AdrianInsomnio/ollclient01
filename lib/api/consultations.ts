
import { get, post, put, patch, del } from '../api-client'

export interface Consultation {
  id: string
  clientId: string | number
  petId: string | number
  appointmentId?: string | number | null
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
  priority: 'URGENT' | 'SCHEDULED' | 'NORMAL'
  consultorioId?: number | null
  startAt?: string | null
  endAt?: string | null
  consultorio?: {
    id: number
    name: string
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
    size?: string | null
  } | null
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

// Campos persistibles como columnas en `Consultation` (ver schema.prisma).
// `diagnosis` / `treatment` NO son columnas: viven como entradas en las
// relaciones Diagnosis[] / Treatment[] (ver addDiagnosis / addTreatment).
export interface UpdateClinicalPayload {
  weight?: number
  temperature?: number
  symptoms?: string
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
  sale: Sale | null
  printData: unknown | null
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
  const response = await get<ConsultationsResponse>('/consultations/queue')
  return response.consultations
}

export interface ConsultorioAssignmentPayload {
  consultorioId: number
  startAt: string
  endAt: string
}

export async function assignConsultorio(id: string | number, data: ConsultorioAssignmentPayload): Promise<Consultation> {
  const response = await patch<ConsultationResponse>(`/consultations/${id}/consultorio`, data)
  return response.consultation
}

export async function releaseConsultorio(id: string | number): Promise<Consultation> {
  const response = await del<ConsultationResponse>(`/consultations/${id}/consultorio`)
  return response.consultation
}

export async function updateConsultationPriority(id: string | number, priority: Consultation['priority']): Promise<Consultation> {
  const response = await put<ConsultationResponse>(`/consultations/${id}`, { priority })
  return response.consultation
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

