'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getPet } from '@/lib/api/pets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PawPrint, Scale } from 'lucide-react'

export default function PetDetailPage() {
  const params = useParams()
  const petId = params.id as string

  const { data: pet, isLoading } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(petId),
    enabled: !!petId,
  })

  if (isLoading) {
    return <p className='text-center text-gray-500 py-8'>Cargando...</p>
  }

  if (!pet) {
    return (
      <div className='space-y-4'>
        <p className='text-center text-gray-500 py-8'>Mascota no encontrada</p>
        <Link href='/workstation/user/mascotas'>
          <Button variant='outline'><ArrowLeft className='h-4 w-4 mr-2' />Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <Link href='/workstation/user/mascotas' className='inline-flex'>
        <Button variant='ghost' size='sm'><ArrowLeft className='h-4 w-4 mr-2' />Volver</Button>
      </Link>
      <div className='flex items-center gap-4'>
        <div className='h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center'>
          <PawPrint className='h-8 w-8 text-blue-600' />
        </div>
        <div>
          <h1 className='text-2xl font-bold'>{pet.name}</h1>
          <p className='text-gray-500'>{pet.species}</p>
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-500'>Especie</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='font-medium'>{pet.species}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-500'>Raza</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='font-medium'>{pet.breed || 'No especificada'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-500'>Edad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='font-medium'>{pet.age || 'No especificada'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

