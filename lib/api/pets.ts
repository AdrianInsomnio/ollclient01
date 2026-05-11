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

export type UpdatePetPayload = Partial<CreatePetPayload>

interface PetsResponse {
  pets: Pet[]
}

interface PetResponse {
  pet: Pet
}

export async function getPets(): Promise<Pet[]> {
  const response = await get<PetsResponse>('/pets')
  return response.pets
}

export async function getPet(id: string): Promise<Pet> {
  const response = await get<PetResponse>(`/pets/${id}`)
  return response.pet
}

export async function getPetsByClient(clientId: string): Promise<Pet[]> {
  const response = await get<PetsResponse>(`/pets?clientId=${clientId}`)
  return response.pets
}

export async function createPet(data: CreatePetPayload): Promise<Pet> {
  const response = await post<PetResponse>('/pets', data)
  return response.pet
}

export async function updatePet(id: string, data: UpdatePetPayload): Promise<Pet> {
  const response = await put<PetResponse>(`/pets/${id}`, data)
  return response.pet
}

export async function deletePet(id: string): Promise<void> {
  return del(`/pets/${id}`)
}
