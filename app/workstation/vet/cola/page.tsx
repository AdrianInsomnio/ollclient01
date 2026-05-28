'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Clock, Stethoscope, ChevronRight } from 'lucide-react'

interface QueueItem {
  id: string
  clientId: string
  petId: string
  createdAt: string
}

export default function ColaPage() {
  const { data: consultations, isLoading } = useQuery({
    queryKey: ['consultations-open'],
    queryFn: async () => {
      return [] as QueueItem[]
    },
  })

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Cola de Atencion</h1>
        <p className='text-center text-gray-500 py-8'>Cargando...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Cola de Atencion</h1>
        <Link href='/workstation/user/cola/agregar'>
          <Button><Plus className='h-4 w-4 mr-2' />Agregar a Cola</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'><Clock className='h-5 w-5' />Consultas en Cola</CardTitle>
        </CardHeader>
        <CardContent>
          {(consultations?.length === 0 || !consultations) ? (
            <p className='text-sm text-gray-500 text-center py-8'>No hay consultas en cola</p>
          ) : (
            <div className='space-y-2'>
              {consultations?.map((consultation, index) => (
                <Link
                  key={consultation.id}
                  href={'/workstation/user/consultas/' + consultation.id}
                  className='flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <div className='flex items-center gap-4'>
                    <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center'>
                      <span className='font-bold text-blue-600'>{index + 1}</span>
                    </div>
                    <div>
                      <p className='font-medium'>Cliente #{consultation.clientId}</p>
                      <p className='text-sm text-gray-500'>Mascota #{consultation.petId}</p>
                    </div>
                  </div>
                  <ChevronRight className='h-5 w-5 text-gray-400' />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'><Stethoscope className='h-5 w-5' />Acciones Rapidas</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 md:grid-cols-2'>
          <Link href='/workstation/user/clientes/buscar'>
            <Button variant='outline' className='w-full'>Buscar Cliente</Button>
          </Link>
          <Link href='/workstation/user/cola/agregar'>
            <Button variant='outline' className='w-full'>Nueva Consulta</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

