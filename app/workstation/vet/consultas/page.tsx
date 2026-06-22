'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getConsultations } from '@/lib/api/consultations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight, Stethoscope } from 'lucide-react'

export default function VetConsultationsPage() {
  const { data: consultations, isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: () => getConsultations(),
  })

  const openConsultations = consultations?.filter((consultation) => consultation.status === 'OPEN') || []
  const recentClosed = consultations?.filter((consultation) => consultation.status === 'CLOSED').slice(0, 8) || []

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Consultas Clínicas</h1>
        <Link href='/workstation/vet/cola'>
          <Button><Stethoscope className='h-4 w-4 mr-2' />Ver Cola</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Abiertas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-sm text-gray-500 text-center py-8'>Cargando...</p>
          ) : openConsultations.length === 0 ? (
            <p className='text-sm text-gray-500 text-center py-8'>No hay consultas abiertas</p>
          ) : (
            <div className='divide-y'>
              {openConsultations.map((consultation) => (
                <Link
                  key={consultation.id}
                  href={'/workstation/vet/consultas/' + consultation.id}
                  className='flex items-center justify-between py-3 hover:bg-gray-50'
                >
                  <div>
                    <p className='font-medium'>{consultation.pet?.name || `Mascota #${consultation.petId}`}</p>
                    <p className='text-sm text-gray-500'>{consultation.client?.name || `Cliente #${consultation.clientId}`}</p>
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
          <CardTitle className='text-lg'>Cerradas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentClosed.length === 0 ? (
            <p className='text-sm text-gray-500 text-center py-8'>No hay consultas cerradas recientes</p>
          ) : (
            <div className='divide-y'>
              {recentClosed.map((consultation) => (
                <Link
                  key={consultation.id}
                  href={'/workstation/vet/consultas/' + consultation.id}
                  className='flex items-center justify-between py-3 hover:bg-gray-50'
                >
                  <div>
                    <p className='font-medium'>{consultation.pet?.name || `Mascota #${consultation.petId}`}</p>
                    <p className='text-sm text-gray-500'>
                      {consultation.createdAt ? new Date(consultation.createdAt).toLocaleDateString('es-UY') : '-'}
                    </p>
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
