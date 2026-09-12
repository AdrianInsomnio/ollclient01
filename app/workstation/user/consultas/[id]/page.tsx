'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CalendarDays, FileText, PawPrint, Users, DollarSign, Check, X } from 'lucide-react'
import { getConsultation, addConsultationItem, closeConsultation } from '@/lib/api/consultations'
import { createConsultationPrintPayload, printConsultationTicket } from '@/lib/local-printer'

export default function ConsultationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const consultationId = params?.id

  const [consultation, setConsultation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [itemType, setItemType] = useState<'product' | 'service'>('product')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [itemError, setItemError] = useState<string | null>(null)

  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [discount, setDiscount] = useState('0')
  const [closeError, setCloseError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)

  useEffect(() => {
    if (!consultationId) return
    loadConsultation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId])

  const loadConsultation = async () => {
    setLoading(true)
    try {
      const cons = await getConsultation(consultationId)
      setConsultation(cons)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar consulta')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setItemError(null)
    try {
      await addConsultationItem(consultationId, {
        itemType,
        itemId: Number(itemId),
        quantity: Number(quantity),
      })
      await loadConsultation()
      setItemId('')
      setQuantity('1')
    } catch (err: any) {
      setItemError(err?.response?.data?.message ?? err?.message ?? 'Error al agregar ítem')
    }
  }

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault()
    setCloseError(null)
    setPrintError(null)
    setClosing(true)
    try {
      const result = await closeConsultation(consultationId, {
        items: consultation?.items ?? [],
        paymentMethod,
        discount: Number(discount),
      })
      setPrinting(true)
      try {
        await printConsultationTicket(createConsultationPrintPayload(result))
      } catch (printErr: any) {
        setPrintError(printErr?.message ?? 'Error al imprimir ticket')
      } finally {
        setPrinting(false)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consultations-open'] }),
        queryClient.invalidateQueries({ queryKey: ['appointments-today'] }),
        queryClient.invalidateQueries({ queryKey: ['consultations'] }),
      ])
      setTimeout(() => {
        router.push('/workstation/user/consultas')
      }, 2000)
    } catch (err: any) {
      setCloseError(err?.response?.data?.message ?? err?.message ?? 'Error al cerrar consulta')
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <div className="text-center py-8">Cargando...</div>
  if (error) return <div className="text-center text-red-600 p-4">{error}</div>
  if (!consultation) return <div className="text-center">Consulta no encontrada</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Consulta #{consultation.id}</h1>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full text-sm bg-gray-100">
            {consultation.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
          </span>
          {consultation.status === 'CLOSED' && (
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Recargar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-2">Datos de la consulta</h2>
          <p><strong>Fecha:</strong> {new Date(consultation.createdAt).toLocaleString('es-UY')}</p>
          <p><strong>Cliente:</strong> {consultation.client?.name ?? 'N/A'}</p>
          <p><strong>Mascota:</strong> {consultation.pet?.name ?? 'N/A'} ({consultation.pet?.species ?? ''} {consultation.pet?.breed ?? ''})</p>
          {consultation.notes && (
            <div className="mt-2">
              <strong>Notas:</strong> <p className="mt-1">{consultation.notes}</p>
            </div>
          )}
        </div>

        {consultation.status === 'OPEN' && (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-2">Agregar productos/servicios</h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo</label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value as 'product' | 'service')}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="product">Producto</option>
                      <option value="service">Servicio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ID</label>
                    <Input
                      type="number"
                      placeholder="ID del producto/servicio"
                      value={itemId}
                      onChange={(e) => setItemId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cantidad</label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>
                {itemError && (
                  <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">
                    {itemError}
                  </div>
                )}
                <Button type="submit" className="w-full">Agregar</Button>
              </form>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Ítems de la consulta</h2>
              {consultation.items && consultation.items.length > 0 ? (
                <div className="space-y-2">
                  {consultation.items.map((item: any) => (
                    <div key={item.id} className="border p-3 rounded">
                      <div className="flex justify-between">
                        <span>{item.nameSnapshot}</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Cantidad: {item.quantity}</span>
                        <span>Subtotal: </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No hay ítems agregados aún</p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Cerrar consulta</h2>
              <form onSubmit={handleClose} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Método de pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Descuento (%)</label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                {closeError && (
                  <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">
                    {closeError}
                  </div>
                )}
                {printError && (
                  <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">
                    {printError}
                  </div>
                )}
                <Button type="submit" disabled={closing || printing} className="w-full bg-green-600 hover:bg-green-700">
                  {closing ? 'Cerrando...' : printing ? 'Imprimiendo...' : 'Cerrar consulta y generar ticket'}
                </Button>
              </form>
            </div>
          </>
        )}

        {consultation.status === 'CLOSED' && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Resumen de venta</h2>
            {consultation.sale && (
              <div className="space-y-2">
                <div className="flex justify-between"><span>Subtotal:</span><span></span></div>
                <div className="flex justify-between"><span>Descuento:</span><span></span></div>
                <div className="flex justify-between"><span>Impuesto:</span><span></span></div>
                <div className="flex justify-between font-bold"><span>TOTAL:</span><span></span></div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Método de pago: {consultation.sale.paymentMethod}
                </p>
              </div>
            )}
            <Button variant="outline" onClick={() => router.refresh()}>Imprimir ticket nuevamente</Button>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => router.back()}>
          Volver a la lista
        </Button>
      </div>
    </div>
  )
}
