import { get, post, put, del } from '../api-client'

export interface Pet {
  id: number
  name: string
  species: string
  breed?: string
  birthDate?: string
  weight?: number
  clientId: number
  client?: {
    id: number
    name: string
  }
  tenantId?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePetPayload {
  name: string
  species: string
  breed?: string
  birthDate?: string
  weight?: number
  clientId: string | number
}

export type UpdatePetPayload = Partial<CreatePetPayload>

export interface PetHistoryItem {
  date: string
  type: 'consultation' | 'vaccination' | 'sale' | 'study'
  description: string
  professional?: string
}

export interface PetHistory {
  id: number
  name: string
  species: string
  breed?: string
  clientId: number
  clientName?: string
  consultations: PetHistoryItem[]
  vaccinations: PetHistoryItem[]
  sales: PetHistoryItem[]
  studies: PetHistoryItem[]
}

interface PetsResponse {
  pets: Pet[]
}

interface PetResponse {
  pet: Pet
}

interface PetHistoryResponse {
  history: PetHistory
}

export async function getPets(): Promise<Pet[]> {
  const response = await get<PetsResponse>('/pets')
  return response.pets
}

export async function getPet(id: string | number): Promise<Pet> {
  const response = await get<PetResponse>('/pets/' + id)
  return response.pet
}

export async function getPetsByClient(clientId: string | number): Promise<Pet[]> {
  const response = await get<PetsResponse>('/pets?clientId=' + clientId)
  return response.pets
}

export async function createPet(data: CreatePetPayload): Promise<Pet> {
  const response = await post<PetResponse>('/pets', {
    ...data,
    clientId: Number(data.clientId),
  })
  return response.pet
}

export async function updatePet(id: string | number, data: UpdatePetPayload): Promise<Pet> {
  const response = await put<PetResponse>('/pets/' + id, {
    ...data,
    ...(data.clientId !== undefined ? { clientId: Number(data.clientId) } : {}),
  })
  return response.pet
}

export async function deletePet(id: string | number): Promise<void> {
  return del('/pets/' + id)
}

export async function getPetHistory(id: string | number): Promise<PetHistory> {
  const response = await get<PetHistoryResponse | PetHistory>('/pets/' + id + '/history')
  return 'history' in response ? response.history : response
}
