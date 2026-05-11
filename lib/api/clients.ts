import { get, post, put, del } from '../api-client'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  documentType?: string
  documentNumber?: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CreateClientPayload {
  name: string
  email: string
  phone: string
  address?: string
  documentType?: string
  documentNumber?: string
}

export type UpdateClientPayload = Partial<CreateClientPayload>

export interface ClientHistoryItem {
  date: string
  type: 'appointment' | 'consultation' | 'sale'
  description: string
  petId?: string
  petName?: string
}

export interface ClientHistory {
  id: string
  name: string
  email?: string
  phone?: string
  pets: unknown[]
  sales: unknown[]
  appointments: unknown[]
  stats: {
    totalPets: number
    totalSales: number
    totalAppointments: number
    totalSpent: number
  }
}

interface ClientsResponse {
  clients: Client[]
}

interface ClientResponse {
  client: Client
}

interface ClientHistoryResponse {
  history: ClientHistory
}

export async function getClients(): Promise<Client[]> {
  const response = await get<ClientsResponse>('/clients')
  return response.clients
}

export async function getClient(id: string): Promise<Client> {
  const response = await get<ClientResponse>(`/clients/${id}`)
  return response.client
}

export async function createClient(data: CreateClientPayload): Promise<Client> {
  const response = await post<ClientResponse>('/clients', data)
  return response.client
}

export async function updateClient(id: string, data: UpdateClientPayload): Promise<Client> {
  const response = await put<ClientResponse>(`/clients/${id}`, data)
  return response.client
}

export async function deleteClient(id: string): Promise<void> {
  return del(`/clients/${id}`)
}

export async function getClientHistory(id: string): Promise<ClientHistory> {
  const response = await get<ClientHistoryResponse>(`/clients/${id}/history`)
  return response.history
}
