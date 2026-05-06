import { get, post, put, del } from '../api-client'

export interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  age?: number
  weight?: number
  clientId: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CreatePetPayload {
  name: string
  species: string
  breed?: string
  age?: number
  weight?: number
  clientId: string
}

export interface UpdatePetPayload extends Partial<CreatePetPayload> {}

export async function getPets(): Promise<Pet[]> {
  return get<Pet[]>('/pets')
}

export async function getPet(id: string): Promise<Pet> {
  return get<Pet>(`/pets/${id}`)
}

export async function getPetsByClient(clientId: string): Promise<Pet[]> {
  return get<Pet[]>(`/pets?clientId=${clientId}`)
}

export async function createPet(data: CreatePetPayload): Promise<Pet> {
  return post<Pet>('/pets', data)
}

export async function updatePet(id: string, data: UpdatePetPayload): Promise<Pet> {
  return put<Pet>(`/pets/${id}`, data)
}

export async function deletePet(id: string): Promise<void> {
  return del(`/pets/${id}`)
}