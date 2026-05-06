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

export interface UpdateClientPayload extends Partial<CreateClientPayload> {}

export interface ClientHistoryItem {
  date: string
  type: 'appointment' | 'consultation' | 'sale'
  description: string
  petId?: string
  petName?: string
}

export async function getClients(): Promise<Client[]> {
  return get<Client[]>('/clients')
}

export async function getClient(id: string): Promise<Client> {
  return get<Client>(`/clients/${id}`)
}

export async function createClient(data: CreateClientPayload): Promise<Client> {
  return post<Client>('/clients', data)
}

export async function updateClient(id: string, data: UpdateClientPayload): Promise<Client> {
  return put<Client>(`/clients/${id}`, data)
}

export async function deleteClient(id: string): Promise<void> {
  return del(`/clients/${id}`)
}

export async function getClientHistory(id: string): Promise<ClientHistoryItem[]> {
  return get<ClientHistoryItem[]>(`/clients/${id}/history`)
}