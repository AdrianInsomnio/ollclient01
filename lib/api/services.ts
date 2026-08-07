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

export async function getServices(filters?: ServiceFilters) {
  let query = ''
  if (filters) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive))
    if (params.toString()) query = '?' + params.toString()
  }

  return await get<Service[]>(`/services${query}`)
}

export async function getServiceById(id: number) {
  return await get<Service>(`/services/${id}`)
}

export async function createService(data: Partial<Service>) {
  return await post<Service>('/services', data)
}
