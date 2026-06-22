'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getPet, type Pet } from '@/lib/api/pets'
import { PetForm } from '@/components/pets/pet-form'
import { useEffect, useState } from 'react'

export default function EditPetPage() {
  const params = useParams()
  const router = useRouter()
  const petId = params.id as string
  const [pet, setPet] = useState<Pet | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(petId),
    enabled: !!petId,
  })

  useEffect(() => {
    if (data) {
      setPet(data)
    }
  }, [data])

  if (isLoading) {
    return <p className='text-center text-gray-500 py-8'>Cargando...</p>
  }

  if (!pet) {
    return <p className='text-center text-gray-500 py-8'>Mascota no encontrada</p>
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold text-gray-900'>Editar Mascota</h1>
      <PetForm 
        pet={pet} 
        onSuccess={() => router.push('/workstation/user/mascotas/' + petId)}
      />
    </div>
  )
}
