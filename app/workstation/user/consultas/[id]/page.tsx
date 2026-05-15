'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, DollarSign, Printer, X } from 'lucide-react'
import { useState } from 'react'

export default function ConsultaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const consultationId = params.id as string

  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [notes, setNotes] = useState('')

  const { data: consultation, isLoading } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      return {
        id: consultationId,
        clientId: '1',
        petId: '1',
        status: 'OPEN',
        items: [],
        total: 0,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    enabled: !!consultationId,
  })

  const addItemMutation = useMutation({
    mutationFn: async (item: { name: string; price: number }) => {},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] })
      setNewItemName('')
      setNewItemPrice('')
    },
  })

  const closeMutation = useMutation({
    mutationFn: async () => {},
    onSuccess: () => {
      router.push('/workstation/user/cola')
    },
  })

  const handleAddItem = () => {
    if (newItemName && newItemPrice) {
      addItemMutation.mutate({ name: newItemName, price: parseFloat(newItemPrice) })
    }
  }

  const handleClose = () => {
    closeMutation.mutate()
  }

  if (isLoading) {
    return <p className='text-center text-gray-500 py-8'>Cargando...</p>
  }

  return (
    <div className='space-y-6'>
      <Link href='/workstation/user/cola' className='inline-flex'>
        <Button variant='ghost' size='sm'><ArrowLeft className='h-4 w-4 mr-2' />Volver a Cola</Button>
      </Link>

      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Consulta #{consultationId}</h1>
        <span className='px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium'>{consultation?.status}</span>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Consulta</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <p className='text-sm text-gray-500'>Cliente</p>
              <p className='font-medium'>Cliente #{consultation?.clientId}</p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>Mascota</p>
              <p className='font-medium'>Mascota #{consultation?.petId}</p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>Notas</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='Agregar notas de la consulta...'
                className='w-full p-3 border rounded-md min-h-[100px]'
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items de la Consulta</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              {consultation?.items?.length === 0 ? (
                <p className='text-sm text-gray-500 text-center py-4'>No hay items agregados</p>
              ) : (
                <div className='divide-y'>
                  {consultation?.items?.map((item: unknown) => {
                    const i = item as { id: string; name: string; price: number }
                    return (
                      <div key={i.id} className='flex justify-between py-2'>
                        <span>{i.name}</span>
                        <span className='font-medium'></span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className='border-t pt-4 space-y-2'>
              <p className='text-sm font-medium'>Agregar Item</p>
              <div className='flex gap-2'>
                <Input
                  placeholder='Nombre del item'
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className='flex-1'
                />
                <Input
                  type='number'
                  placeholder='Precio'
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className='w-24'
                />
                <Button onClick={handleAddItem} size='icon'><Plus className='h-4 w-4' /></Button>
              </div>
            </div>

            <div className='border-t pt-4 flex justify-between items-center'>
              <p className='font-bold text-lg'>Total: </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='flex gap-4 justify-end'>
        <Button variant='outline' onClick={() => router.push('/workstation/user/cola')}>Cancelar</Button>
        <Button variant='outline' onClick={() => {}}><Printer className='h-4 w-4 mr-2' />Imprimir</Button>
        <Button onClick={handleClose}><DollarSign className='h-4 w-4 mr-2' />Cerrar y Cobrar</Button>
      </div>
    </div>
  )
}

