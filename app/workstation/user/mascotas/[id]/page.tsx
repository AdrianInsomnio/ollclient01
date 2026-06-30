'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getPet, getPetHistory } from '@/lib/api/pets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PawPrint, Scale, Edit, Calendar, MapPin, BarChart2 } from 'lucide-react'

export default function PetDetailPage() {
  const params = useParams()
  const petId = params.id as string

  const { data: pet, isLoading: loadingPet } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(petId),
    enabled: !!petId,
  })

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['petHistory', petId],
    queryFn: () => getPetHistory(petId),
    enabled: !!petId,
  })

  if (loadingPet) {
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
      <div className='flex items-center justify-between'>
        <Link href='/workstation/user/mascotas' className='inline-flex'>
          <Button variant='ghost' size='sm'><ArrowLeft className='h-4 w-4 mr-2' />Volver</Button>
        </Link>
        <Link href={'/workstation/user/mascotas/editar/' + petId}>
          <Button size='sm'><Edit className='h-4 w-4 mr-2' />Editar</Button>
        </Link>
      </div>

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
            <CardTitle className='text-sm font-medium text-gray-500'>Peso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='font-medium'>{pet.weight ? pet.weight + ' kg' : 'No especificado'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Consultas */}
      {history && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><Calendar className="h-5 w-5" />Historial de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <p className='text-center text-gray-500 py-4'>Cargando historial...</p>
            ) : history.consultations.length === 0 ? (
              <p className='text-center text-gray-500 py-4'>No hay consultas registradas</p>
            ) : (
              <div className='space-y-4'>
                {history.consultations.map((consultation) => (
                  <div key={consultation.date} className='border-b pb-4 last:border-b-0'>
                    <div className='flex items-start gap-4'>
                      <div className='flex-shrink-0 h-8 w-8 rounded-bg-blue-100 flex items-center justify-center'>
                        <Calendar className='h-4 w-4 text-blue-600' />
                      </div>
                      <div className='flex-1'>
                        <p className='font-medium text-gray-900'>
                          {new Date(consultation.date).toLocaleDateString('es-UY', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <p className='text-sm text-gray-600'>{consultation.description}</p>
                        {consultation.professional && (
                          <p className='text-xs text-gray-500 mt-1'>Por: {consultation.professional}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
          )}
          </CardContent>
        </Card>
      )}

      {/* Additional stats cards could go here if needed */}
    </div>
  )
}
