import { get, post, put, del } from '../api-client'

export interface Appointment {
  id: number
  clientId: number
  petId: number
  client?: { id: number | string; name: string; phone?: string; documentId?: string }
  pet?: { id: number; name: string; species: string }
  vetId?: string
  date: string
  duration: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  serviceType?: string
  notes?: string
  createdAt: string
  updatedAt: string
  consultation?: { id: string; status: 'OPEN' | 'CLOSED' } | null
}

export interface CreateAppointmentPayload {
  clientId: number
  petId: number
  vetId?: string
  date: string
  duration?: number
  serviceType?: string
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
  const response = await get<AppointmentsResponse | Appointment[]>('/appointments')
  return Array.isArray(response) ? response : response.appointments ?? []
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

export async function updateAppointmentStatus(
  id: string,
  status: Appointment['status'],
  notes?: string,
): Promise<Appointment> {
  const response = await put<AppointmentResponse>(`/appointments/${id}/status`, {
    status,
    ...(notes ? { notes } : {}),
  })
  return response.appointment
}

export async function deleteAppointment(id: string): Promise<void> {
  return del(`/appointments/${id}`)
}
