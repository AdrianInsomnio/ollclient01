import { get, post, put, del } from '../api-client'

export interface Appointment {
  id: string
  clientId: string
  petId: string
  vetId?: string
  date: string
  time: string
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  type: 'consultation' | 'vaccination' | 'grooming' | 'surgery' | 'follow-up'
  notes?: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CreateAppointmentPayload {
  clientId: string
  petId: string
  vetId?: string
  date: string
  time: string
  type: Appointment['type']
  notes?: string
}

export interface UpdateAppointmentPayload extends Partial<CreateAppointmentPayload> {
  status?: Appointment['status']
}

export interface TimeSlot {
  time: string
  available: boolean
}

export async function getAppointments(): Promise<Appointment[]> {
  return get<Appointment[]>('/appointments')
}

export async function getAppointment(id: string): Promise<Appointment> {
  return get<Appointment>(`/appointments/${id}`)
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  return get<Appointment[]>(`/appointments?date=${date}`)
}

export async function getAvailableSlots(date: string): Promise<TimeSlot[]> {
  return get<TimeSlot[]>(`/appointments/slots?date=${date}`)
}

export async function createAppointment(data: CreateAppointmentPayload): Promise<Appointment> {
  return post<Appointment>('/appointments', data)
}

export async function updateAppointment(
  id: string,
  data: UpdateAppointmentPayload
): Promise<Appointment> {
  return put<Appointment>(`/appointments/${id}`, data)
}

export async function deleteAppointment(id: string): Promise<void> {
  return del(`/appointments/${id}`)
}