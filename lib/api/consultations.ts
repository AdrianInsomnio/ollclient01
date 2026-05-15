import { get, post, put, del } from '../api-client'

export interface Consultation {
  id: string
  clientId: string
  petId: string
  vetId?: string
  status: 'OPEN' | 'CLOSED'
  notes?: string
  items: ConsultationItem[]
  total: number
  createdAt: string
  updatedAt: string
}

export interface ConsultationItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

export interface CreateConsultationPayload {
  clientId: string
  petId: string
  notes?: string
}

export interface AddConsultationItemPayload {
  productId: string
  quantity: number
  price: number
}

interface ConsultationsResponse {
  consultations: Consultation[]
}

interface ConsultationResponse {
  consultation: Consultation
}

interface OpenConsultationResponse {
  consultation: Consultation
  queuePosition: number
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

export async function openConsultation(data: CreateConsultationPayload): Promise<OpenConsultationResponse> {
  const response = await post<OpenConsultationResponse>('/consultations/open', data)
  return response
}

export async function closeConsultation(id: string): Promise<Consultation> {
  const response = await post<ConsultationResponse>('/consultations/' + id + '/close', {})
  return response.consultation
}

export async function addConsultationItem(consultationId: string, data: AddConsultationItemPayload): Promise<Consultation> {
  const response = await post<ConsultationResponse>('/consultations/' + consultationId + '/items', data)
  return response.consultation
}

export async function updateConsultationNotes(id: string, notes: string): Promise<Consultation> {
  const response = await put<ConsultationResponse>('/consultations/' + id, { notes })
  return response.consultation
}
