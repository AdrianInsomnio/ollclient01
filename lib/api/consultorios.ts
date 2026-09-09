import { del, get, patch, post } from '@/lib/api-client'

export type ConsultorioStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
export type EquipmentStatus = 'AVAILABLE' | 'MAINTENANCE' | 'OUT_OF_SERVICE'

export interface Equipment {
  id: number
  clinicId: number
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ConsultorioEquipment {
  id: number
  consultorioId: number
  equipmentId: number
  quantity: number
  status: EquipmentStatus
  notes?: string | null
  createdAt: string
  updatedAt: string
  equipment: Equipment
}

export interface Consultorio {
  id: number
  clinicId: number
  name: string
  description?: string | null
  size?: string | null
  status: ConsultorioStatus
  createdAt: string
  updatedAt: string
  equipment: ConsultorioEquipment[]
}

interface ConsultoriosResponse {
  consultorios: Consultorio[]
}

export interface ConsultorioAssignment {
  consultorioId: number
  startAt: string
  endAt: string
}

interface ConsultorioResponse {
  consultorio: Consultorio
}

interface EquipmentListResponse {
  equipment: Equipment[]
}

interface EquipmentResponse {
  equipment: Equipment
}

interface AssociationResponse {
  equipment: ConsultorioEquipment
}

export interface ConsultorioPayload {
  name: string
  description?: string
  size?: string
}

export interface EquipmentPayload {
  name: string
  description?: string
}

export interface AssociationPayload {
  equipmentId: number
  quantity: number
  status: EquipmentStatus
  notes?: string
}

export async function getConsultorios(): Promise<Consultorio[]> {
  const response = await get<ConsultoriosResponse>('/consultorios')
  return response.consultorios ?? []
}

export async function getAvailableConsultorios(startAt: string, endAt: string): Promise<Consultorio[]> {
  const params = new URLSearchParams({ startAt, endAt })
  const response = await get<ConsultoriosResponse>(`/consultorios/available?${params.toString()}`)
  return response.consultorios ?? []
}

export async function createConsultorio(data: ConsultorioPayload): Promise<Consultorio> {
  const response = await post<ConsultorioResponse>('/consultorios', data)
  return response.consultorio
}

export async function updateConsultorio(id: number, data: Partial<ConsultorioPayload>): Promise<Consultorio> {
  const response = await patch<ConsultorioResponse>(`/consultorios/${id}`, data)
  return response.consultorio
}

export async function updateConsultorioStatus(id: number, status: ConsultorioStatus): Promise<Consultorio> {
  const response = await patch<ConsultorioResponse>(`/consultorios/${id}/status`, { status })
  return response.consultorio
}

export async function getEquipment(): Promise<Equipment[]> {
  const response = await get<EquipmentListResponse>('/equipment')
  return response.equipment ?? []
}

export async function createEquipment(data: EquipmentPayload): Promise<Equipment> {
  const response = await post<EquipmentResponse>('/equipment', data)
  return response.equipment
}

export async function updateEquipment(id: number, data: Partial<EquipmentPayload> & { isActive?: boolean }): Promise<Equipment> {
  const response = await patch<EquipmentResponse>(`/equipment/${id}`, data)
  return response.equipment
}

export async function addConsultorioEquipment(consultorioId: number, data: AssociationPayload): Promise<ConsultorioEquipment> {
  const response = await post<AssociationResponse>(`/consultorios/${consultorioId}/equipment`, data)
  return response.equipment
}

export async function updateConsultorioEquipment(
  consultorioId: number,
  equipmentId: number,
  data: Partial<Omit<AssociationPayload, 'equipmentId'>>,
): Promise<ConsultorioEquipment> {
  const response = await patch<AssociationResponse>(`/consultorios/${consultorioId}/equipment/${equipmentId}`, data)
  return response.equipment
}

export async function removeConsultorioEquipment(consultorioId: number, equipmentId: number): Promise<void> {
  await del(`/consultorios/${consultorioId}/equipment/${equipmentId}`)
}
