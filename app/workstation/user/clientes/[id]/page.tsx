'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getClient, getClientHistory } from '@/lib/api/clients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Phone, Mail, MapPin, User, PawPrint } from 'lucide-react'

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    enabled: !!clientId,
  })

  const { data: history } = useQuery({
    queryKey: ['clientHistory', clientId],
    queryFn: () => getClientHistory(clientId),
    enabled: !!clientId,
  })

  if (loadingClient) {
    return <p className='text-center text-gray-500 py-8'>Cargando...</p>
  }

  if (!client) {
    return (
      <div className='space-y-4'>
        <p className='text-center text-gray-500 py-8'>Cliente no encontrado</p>
        <Link href='/workstation/user/clientes'>
          <Button variant='outline'><ArrowLeft className='h-4 w-4 mr-2' />Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <Link href='/workstation/user/clientes' className='inline-flex'>
        <Button variant='ghost' size='sm'><ArrowLeft className='h-4 w-4 mr-2' />Volver</Button>
      </Link>

      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{client.name}</h1>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader><CardTitle className='text-lg'>Datos del Cliente</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {client.phone && (
              <div className='flex items-center gap-3'><Phone className='h-4 w-4 text-gray-400' /><span>{client.phone}</span></div>
            )}
            {client.email && (
              <div className='flex items-center gap-3'><Mail className='h-4 w-4 text-gray-400' /><span>{client.email}</span></div>
            )}
            {client.address && (
              <div className='flex items-center gap-3'><MapPin className='h-4 w-4 text-gray-400' /><span>{client.address}</span></div>
            )}
            {client.documentNumber && (
              <div className='flex items-center gap-3'><User className='h-4 w-4 text-gray-400' /><span>{client.documentType} {client.documentNumber}</span></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className='text-lg'>Estadísticas</CardTitle></CardHeader>
          <CardContent>
            {history?.stats && (
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center p-3 bg-gray-50 rounded-lg'>
                  <p className='text-2xl font-bold'>{history.stats.totalPets}</p><p className='text-xs text-gray-500'>Mascotas</p>
                </div>
                <div className='text-center p-3 bg-gray-50 rounded-lg'>
                  <p className='text-2xl font-bold'>{history.stats.totalSales}</p><p className='text-xs text-gray-500'>Ventas</p>
                </div>
                <div className='text-center p-3 bg-gray-50 rounded-lg'>
                  <p className='text-2xl font-bold'>{history.stats.totalAppointments}</p><p className='text-xs text-gray-500'>Citas</p>
                </div>
                <div className='text-center p-3 bg-gray-50 rounded-lg'>
                  <p className='text-2xl font-bold'></p><p className='text-xs text-gray-500'>Total</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle className='text-lg'>Mascotas</CardTitle>
          <Link href={'/workstation/user/mascotas/nuevo?clientId=' + clientId}>
            <Button size='sm'><PawPrint className='h-4 w-4 mr-2' />Nueva Mascota</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {history?.pets && history.pets.length > 0 ? (
            <div className='divide-y'>
              {history.pets.map((pet: unknown) => {
                const p = pet as { id: string; name: string; species: string; breed?: string }
                return (
                  <Link key={p.id} href={'/workstation/user/mascotas/' + p.id} className='flex items-center justify-between py-3 hover:bg-gray-50'>
                    <div><p className='font-medium'>{p.name}</p><p className='text-sm text-gray-500'>{p.species}</p></div><span>→</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className='text-sm text-gray-500 text-center py-4'>No hay mascotas</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
