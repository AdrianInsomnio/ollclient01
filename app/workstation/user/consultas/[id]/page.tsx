'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getConsultation, closeConsultation, type AddConsultationItemPayload } from '@/lib/api/consultations'
import {
  createConsultationPrintPayload,
  printConsultationTicket,
  type ConsultationPrintPayload,
  type LocalPrintState,
} from '@/lib/local-printer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, DollarSign, Plus, Printer, Trash2 } from 'lucide-react'

type CheckoutItem = AddConsultationItemPayload & {
  localId: string
  nameSnapshot: string
  priceSnapshot: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(value)

const stableItemId = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647
  }
  return hash || 1
}

export default function ConsultaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const consultationId = params.id as string

  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [error, setError] = useState('')
  const [items, setItems] = useState<CheckoutItem[]>([])
  const [printPayload, setPrintPayload] = useState<ConsultationPrintPayload | null>(null)
  const [printState, setPrintState] = useState<LocalPrintState>({
    status: 'idle',
    message: '',
  })

  const { data: consultation, isLoading } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: () => getConsultation(consultationId),
    enabled: !!consultationId,
  })

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
    [items]
  )
  const tax = subtotal * 0.14
  const total = subtotal + tax

  const closeMutation = useMutation({
    mutationFn: () => closeConsultation(consultationId, {
      items,
      paymentMethod,
      payments: [{ method: paymentMethod, amount: total }],
    }),
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['consultations-open'] })
      queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] })

      const payload = createConsultationPrintPayload(response)
      setPrintPayload(payload)
      await handlePrint(payload)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la consulta')
    },
  })

  const handlePrint = async (payload = printPayload) => {
    if (!payload) {
      setPrintState({
        status: 'error',
        message: 'No hay datos de ticket para imprimir',
      })
      return
    }

    setPrintState({
      status: 'printing',
      message: 'Imprimiendo ticket...',
    })

    try {
      await printConsultationTicket(payload)
      setPrintState({
        status: 'success',
        message: 'Ticket impreso correctamente',
      })
    } catch (err) {
      setPrintState({
        status: 'error',
        message: err instanceof Error ? err.message : 'No se pudo imprimir el ticket',
      })
    }
  }

  const handleAddItem = () => {
    const price = Number(newItemPrice)
    const normalizedName = newItemName.trim()

    if (!normalizedName || Number.isNaN(price) || price < 0) {
      setError('Ingresa nombre y precio válido')
      return
    }

    const itemId = stableItemId(normalizedName.toLowerCase())
    if (items.some((item) => item.itemId === itemId)) {
      setError('Ese item ya está agregado')
      return
    }

    setItems((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        itemType: 'service',
        itemId,
        nameSnapshot: normalizedName,
        priceSnapshot: price,
        quantity: 1,
      },
    ])
    setNewItemName('')
    setNewItemPrice('')
    setError('')
  }

  const handleClose = () => {
    if (items.length === 0) {
      setError('Agrega al menos un item para cobrar')
      return
    }

    setError('')
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
              <p className='font-medium'>{consultation?.client?.name || `Cliente #${consultation?.clientId}`}</p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>Mascota</p>
              <p className='font-medium'>
                {consultation?.pet?.name || `Mascota #${consultation?.petId}`}
                {consultation?.pet?.species ? ` (${consultation.pet.species})` : ''}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>Fecha de apertura</p>
              <p className='font-medium'>
                {consultation?.createdAt ? new Date(consultation.createdAt).toLocaleString('es-UY') : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>POS</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              {items.length === 0 ? (
                <p className='text-sm text-gray-500 text-center py-4'>No hay items agregados</p>
              ) : (
                <div className='divide-y'>
                  {items.map((item) => (
                    <div key={item.localId} className='flex justify-between py-2 gap-3'>
                      <div>
                        <p className='font-medium'>{item.nameSnapshot}</p>
                        <p className='text-sm text-gray-500'>Cantidad {item.quantity}</p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{formatCurrency(item.priceSnapshot * item.quantity)}</span>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => setItems((current) => current.filter((currentItem) => currentItem.localId !== item.localId))}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='border-t pt-4 space-y-2'>
              <p className='text-sm font-medium'>Agregar Item</p>
              <div className='grid gap-2 sm:grid-cols-[1fr_120px_40px]'>
                <Input
                  placeholder='Nombre del item'
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
                <Input
                  type='number'
                  min='0'
                  step='1'
                  placeholder='Precio'
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                />
                <Button onClick={handleAddItem} size='icon'><Plus className='h-4 w-4' /></Button>
              </div>
            </div>

            <div className='border-t pt-4 space-y-2'>
              <label className='text-sm font-medium' htmlFor='paymentMethod'>Método de pago</label>
              <select
                id='paymentMethod'
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className='w-full rounded-md border px-3 py-2 text-sm'
              >
                <option value='cash'>Efectivo</option>
                <option value='card'>Tarjeta</option>
                <option value='transfer'>Transferencia</option>
                <option value='mercado_pago'>Mercado Pago</option>
              </select>
            </div>

            <div className='border-t pt-4 space-y-1'>
              <div className='flex justify-between text-sm'><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className='flex justify-between text-sm'><span>IVA 14%</span><span>{formatCurrency(tax)}</span></div>
              <div className='flex justify-between items-center text-lg font-bold'><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className='text-sm text-red-600 text-right'>{error}</p>}

      <div className='flex gap-4 justify-end'>
        <Button variant='outline' onClick={() => router.push('/workstation/user/cola')}>Cancelar</Button>
        <Button
          variant='outline'
          onClick={() => handlePrint()}
          disabled={!printPayload || printState.status === 'printing'}
        >
          <Printer className='h-4 w-4 mr-2' />
          {printState.status === 'printing' ? 'Imprimiendo...' : 'Reimprimir'}
        </Button>
        <Button onClick={handleClose} disabled={closeMutation.isPending || printState.status === 'printing' || consultation?.status === 'CLOSED'}>
          <DollarSign className='h-4 w-4 mr-2' />
          {closeMutation.isPending ? 'Cobrando...' : 'Cerrar y Cobrar'}
        </Button>
      </div>

      {printState.message && (
        <p
          className={
            printState.status === 'success'
              ? 'text-sm text-green-700 text-right'
              : printState.status === 'error'
                ? 'text-sm text-red-600 text-right'
                : 'text-sm text-gray-600 text-right'
          }
        >
          {printState.message}
        </p>
      )}
    </div>
  )
}
