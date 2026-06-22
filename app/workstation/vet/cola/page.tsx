'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getOpenConsultations } from '@/lib/api/consultations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, ChevronRight } from 'lucide-react'

export default function VetQueuePage() {
  const { data: consultations, isLoading } = useQuery({
    queryKey: ['consultations-open'],
    queryFn: () => getOpenConsultations(),
  })

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Cola Clínica</h1>
        <p className='text-center text-gray-500 py-8'>Cargando...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Cola Clínica</h1>
        <Link href='/workstation/user/cola/agregar'>
          <Button>Nueva Consulta</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'><Clock className='h-5 w-5' />Consultas Abiertas</CardTitle>
        </CardHeader>
        <CardContent>
          {!consultations || consultations.length === 0 ? (
            <p className='text-sm text-gray-500 text-center py-8'>No hay consultas abiertas</p>
          ) : (
            <div className='space-y-2'>
              {consultations.map((consultation, index) => (
                <Link
                  key={consultation.id}
                  href={'/workstation/vet/consultas/' + consultation.id}
                  className='flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <div className='flex items-center gap-4'>
                    <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center'>
                      <span className='font-bold text-blue-600'>{index + 1}</span>
                    </div>
                    <div>
                      <p className='font-medium'>{consultation.pet?.name || `Mascota #${consultation.petId}`}</p>
                      <p className='text-sm text-gray-500'>
                        {consultation.client?.name || `Cliente #${consultation.clientId}`}
                        {consultation.pet?.species ? ` · ${consultation.pet.species}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className='h-5 w-5 text-gray-400' />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
