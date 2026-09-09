import { get, post, put, patch } from '../api-client'

export interface Service {
  id: number
  name: string
  description?: string
  price: number
  duration?: number
  category?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ServiceFilters {
  search?: string
  isActive?: boolean
}

export interface ServicesResponse {
  services: Service[]
}

// Tolerante: backend responde { services: [...] } o array directo.
export async function getServices(filters?: ServiceFilters): Promise<Service[]> {
  let query = ''
  if (filters) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive))
    if (params.toString()) query = '?' + params.toString()
  }

  const response = await get<ServicesResponse | Service[]>(`/services${query}`)
  if (Array.isArray(response)) return response
  return response.services ?? []
}

export async function getServiceById(id: number) {
  const response = await get<Service | { service: Service }>(`/services/${id}`)
  return 'service' in response ? response.service : response
}

export type ServicePayload = Pick<Service, 'name' | 'price' | 'isActive'> & Partial<Pick<Service, 'description' | 'duration' | 'category'>>

export async function createService(data: ServicePayload) {
  return await post<Service>('/services', data)
}

export async function updateService(id: number, data: Partial<ServicePayload>) {
  const response = await put<Service | { service: Service }>(`/services/${id}`, data)
  return 'service' in response ? response.service : response
}

export async function updateServiceStatus(id: number, isActive: boolean) {
  const response = await patch<{ service: Service }>(`/services/${id}/status`, { isActive })
  return response.service
}
