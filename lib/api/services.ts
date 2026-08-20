import { get, post } from '../api-client'

export interface Service {
  id: number
  name: string
  description?: string
  price: number
  duration?: number
  isActive: boolean
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
  return await get<Service>(`/services/${id}`)
}

export async function createService(data: Partial<Service>) {
  return await post<Service>('/services', data)
}
