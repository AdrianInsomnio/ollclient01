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

export type UpdateAppointmentPayload = Partial<CreateAppointmentPayload> & {
  status?: Appointment['status']
}

export interface TimeSlot {
  time: string
  available: boolean
}

interface AppointmentsResponse {
  appointments: Appointment[]
}

interface AppointmentResponse {
  appointment: Appointment
}

interface SlotsResponse {
  slots: TimeSlot[]
}

export async function getAppointments(): Promise<Appointment[]> {
  const response = await get<AppointmentsResponse>('/appointments')
  return response.appointments
}

export async function getAppointment(id: string): Promise<Appointment> {
  const response = await get<AppointmentResponse>(`/appointments/${id}`)
  return response.appointment
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const response = await get<AppointmentsResponse>(`/appointments?date=${date}`)
  return response.appointments
}

export async function getAvailableSlots(date: string): Promise<TimeSlot[]> {
  const response = await get<SlotsResponse>(`/appointments/slots?date=${date}`)
  return response.slots
}

export async function createAppointment(data: CreateAppointmentPayload): Promise<Appointment> {
  const response = await post<AppointmentResponse>('/appointments', data)
  return response.appointment
}

export async function updateAppointment(
  id: string,
  data: UpdateAppointmentPayload
): Promise<Appointment> {
  const response = await put<AppointmentResponse>(`/appointments/${id}`, data)
  return response.appointment
}

export async function deleteAppointment(id: string): Promise<void> {
  return del(`/appointments/${id}`)
}
