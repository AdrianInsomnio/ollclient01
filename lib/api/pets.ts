import { get, post, put, del } from '../api-client'

import { patch } from '../api-client'

export interface Pet {
  id: number
  name: string
  sex?: string
  species: string
  breed?: string
  birthDate?: string
  weight?: number
  color?: string
  notes?: string
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
  sex?: string
  species: string
  breed?: string
  birthDate?: string
  weight?: number
  color?: string
  notes?: string
  clientId: string | number
}

export type UpdatePetPayload = Partial<CreatePetPayload>

export interface PetHistoryActivity {
  id: number
  action: string
  createdAt: string
  metadata?: unknown
  consultorioId?: number | null
}

export interface PetHistoryItem {
  id?: string | number
  date: string
  type: 'consultation' | 'vaccination' | 'sale' | 'study'
  description: string
  professional?: string
  diagnosis?: string
  status?: string
  serviceType?: string
  weight?: number | null
  temperature?: number | null
  activities?: PetHistoryActivity[]
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

interface PetConsultationHistoryItem {
  id: number | string
  createdAt?: string
  updatedAt?: string
  notes?: string | null
  symptoms?: string | null
  status?: string
  weight?: number | null
  temperature?: number | null
  diagnoses?: Array<{ description: string }>
  appointment?: { serviceType?: string | null } | null
  veterinarian?: { id: number; username: string } | null
  veterinarianActivities?: PetHistoryActivity[]
}

interface PetConsultationHistoryResponse {
  petId: number
  consultationCount: number
  consultations: PetConsultationHistoryItem[]
  totalSpent: number
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
  const response = await patch<PetResponse>('/pets/' + id, {
    ...data,
    ...(data.clientId !== undefined ? { clientId: Number(data.clientId) } : {}),
  })
  return response.pet
}

export async function deletePet(id: string | number): Promise<void> {
  return del('/pets/' + id)
}

export async function getPetHistory(id: string | number): Promise<PetHistory> {
  const response = await get<PetConsultationHistoryResponse>('/consultations/pet/' + id + '/history')
  return {
    id: Number(id),
    name: '',
    species: '',
    clientId: 0,
    consultations: response.consultations.map((consultation) => {
      const diagnosis = consultation.diagnoses?.map((item) => item.description).filter(Boolean).join(' · ');
      return {
        id: consultation.id,
        date: consultation.createdAt || consultation.updatedAt || new Date().toISOString(),
        type: 'consultation' as const,
        description: consultation.notes?.trim() || consultation.symptoms?.trim() || diagnosis || 'Consulta veterinaria',
        professional: consultation.veterinarian?.username,
        diagnosis,
        status: consultation.status,
        serviceType: consultation.appointment?.serviceType ?? undefined,
        weight: consultation.weight,
        temperature: consultation.temperature,
        activities: consultation.veterinarianActivities ?? [],
      };
    }),
    vaccinations: [],
    sales: [],
    studies: [],
  }
}

export async function searchPets(query: string): Promise<Pet[]> {
  const response = await get<PetsResponse>('/pets/search?q=' + encodeURIComponent(query))
  return response.pets
}
