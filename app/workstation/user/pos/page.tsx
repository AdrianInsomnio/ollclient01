'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Loader2 } from 'lucide-react'
import { getClients, getClient } from '@/lib/api/clients'
import { getProducts } from '@/lib/api/products'
import { getServices, type Service } from '@/lib/api/services'
import { createSale, createDraftSale, createWaitingSale, deleteSale, getDraftSales, getSaleById, updateSale } from '@/lib/api/sales'
import { getCashRegisters, getCurrentCashShift } from '@/lib/api/cash'
import { printSaleTicket } from '@/lib/local-printer'

type Client = { id: string; name: string; documentId?: string }
type Product = { id: number; name: string; price: number; stock?: number }
type CartItem = { itemType: 'product' | 'service'; item: Product | Service; quantity: number }

export default function PosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const [cashShiftId, setCashShiftId] = useState<number | null>(null)
  const [discountRate, setDiscountRate] = useState('0')
  const [paymentLines, setPaymentLines] = useState([{ method: 'cash', amount: '' }])
  const [resumedSaleId, setResumedSaleId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [pendingDraft, setPendingDraft] = useState<any | null>(null)
  const draftSaveInFlight = useRef(false)

  useEffect(() => {
    loadClients()
    loadProducts()
    loadServices()
    void loadCashShift()
  }, [])

  useEffect(() => {
    const saleId = searchParams.get('resume')
    if (!saleId || products.length === 0 || services.length === 0 || cart.length > 0) return
    void (async () => {
      try {
        const sale = await getSaleById(saleId)
        const client = await getClient(String(sale.clientId))
        const restoredItems = (sale.saleItems ?? sale.items ?? []).map((item) => {
          const catalogItem = item.itemType === 'service'
            ? services.find((candidate) => candidate.id === item.itemId)
            : products.find((candidate) => candidate.id === item.itemId)
          return catalogItem ? { itemType: item.itemType, item: catalogItem, quantity: item.quantity } : null
        }).filter((item): item is CartItem => item !== null)
        setSelectedClientId(String(sale.clientId))
        setSelectedClient(client as Client)
        setCart(restoredItems)
        setResumedSaleId(saleId)
        setDraftId(saleId)
        setSuccess(`Cuenta #${sale.id} retomada.`)
      } catch (err: any) {
        setError(err?.message ?? 'No se pudo retomar la cuenta en espera')
      }
    })()
  }, [searchParams, products, services, cart.length])

  useEffect(() => {
    if (searchParams.get('resume') || products.length === 0 || services.length === 0 || cart.length > 0 || pendingDraft) return
    void getDraftSales()
      .then((drafts) => setPendingDraft(drafts[0] ?? null))
      .catch(() => undefined)
  }, [searchParams, products, services, cart.length, pendingDraft])

  const continueDraft = async () => {
    if (!pendingDraft) return
    try {
      const sale = await getSaleById(String(pendingDraft.id))
      const client = await getClient(String(sale.clientId))
      const restoredItems = (sale.saleItems ?? sale.items ?? []).map((item) => {
        const catalogItem = item.itemType === 'service'
          ? services.find((candidate) => candidate.id === item.itemId)
          : products.find((candidate) => candidate.id === item.itemId)
        return catalogItem ? { itemType: item.itemType, item: catalogItem, quantity: item.quantity } : null
      }).filter((item): item is CartItem => item !== null)
      setSelectedClientId(String(sale.clientId))
      setSelectedClient(client as Client)
      setCart(restoredItems)
      setDraftId(String(sale.id))
      setPendingDraft(null)
      setSuccess(`Borrador #${sale.id} retomado.`)
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo recuperar el borrador')
    }
  }

  const discardDraft = async () => {
    if (!pendingDraft) return
    try {
      await deleteSale(String(pendingDraft.id))
      setPendingDraft(null)
      setSuccess('Borrador descartado.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'No se pudo descartar el borrador')
    }
  }

  useEffect(() => {
    if (!selectedClientId || cart.length === 0 || loading || draftSaveInFlight.current) return
    const timer = window.setTimeout(async () => {
      draftSaveInFlight.current = true
      try {
        const payload = {
          clientId: Number(selectedClientId),
          items: cart.map((entry) => ({ itemType: entry.itemType, itemId: entry.item.id, quantity: entry.quantity, ...(entry.itemType === 'service' ? { nameSnapshot: entry.item.name, priceSnapshot: entry.item.price } : {}) })),
          discount: Number(discountRate) || 0,
        }
        const draft = draftId
          ? await updateSale(draftId, payload)
          : await createDraftSale(payload)
        setDraftId(String(draft.id))
      } catch (err: any) {
        setError(err?.response?.data?.message ?? err?.message ?? 'No se pudo guardar el borrador')
      } finally {
        draftSaveInFlight.current = false
      }
    }, 700)
    return () => window.clearTimeout(timer)
  }, [selectedClientId, cart, draftId, loading, discountRate])

  const loadCashShift = async () => {
    try {
      const registers = await getCashRegisters()
      if (!registers[0]) return
      const shift = await getCurrentCashShift(registers[0].id)
      setCashShiftId(shift?.id ?? null)
    } catch {
      setCashShiftId(null)
    }
  }

  const loadClients = async () => {
    try {
      const data = await getClients()
      setClients(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar clientes')
    }
  }

  const loadProducts = async () => {
    try {
      const data = await getProducts({ isActive: true })
      setProducts(data)
    } catch (err) {
      console.warn('No se pudieron cargar productos del backend', err)
      setProducts([])
    }
  }

  const loadServices = async () => {
    try {
      setServices(await getServices({ isActive: true }))
    } catch (err) {
      console.warn('No se pudieron cargar servicios del backend', err)
      setServices([])
    }
  }

  const filteredClients = useMemo(
    () =>
      clients.filter((c) => {
        const term = clientSearch.toLowerCase()
        return (
          c.name?.toLowerCase().includes(term) ||
          c.documentId?.toLowerCase().includes(term)
        )
      }),
    [clients, clientSearch],
  )

  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        p.name?.toLowerCase().includes(productSearch.toLowerCase()),
      ),
    [products, productSearch],
  )

  const filteredServices = useMemo(
    () => services.filter((service) => service.name.toLowerCase().includes(serviceSearch.toLowerCase())),
    [services, serviceSearch],
  )

  const handleClientSelect = async (clientId: string) => {
    setSelectedClientId(clientId)
    try {
      const client = await getClient(clientId)
      setSelectedClient(client as Client)
    } catch {
      setError('No se pudo cargar el cliente')
    }
  }

  const addToCart = (item: Product | Service, itemType: CartItem['itemType']) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.itemType === itemType && entry.item.id === item.id)
      if (existing) {
        return current.map((entry) =>
          entry.itemType === itemType && entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        )
      }
      return [...current, { itemType, item, quantity: 1 }]
    })
  }

  const removeFromCart = (itemType: CartItem['itemType'], itemId: number) => {
    setCart((current) => current.filter((entry) => !(entry.itemType === itemType && entry.item.id === itemId)))
  }

  const updateQuantity = (itemType: CartItem['itemType'], itemId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemType, itemId)
      return
    }
    setCart((current) =>
      current.map((item) =>
        item.itemType === itemType && item.item.id === itemId ? { ...item, quantity: qty } : item,
      ),
    )
  }

  const subtotal = cart.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0,
  )
  const discount = subtotal * (Number(discountRate) || 0) / 100
  const estimatedTax = (subtotal - discount) * 0.14
  const estimatedTotal = subtotal - discount + estimatedTax

  const updatePaymentLine = (index: number, field: 'method' | 'amount', value: string) => {
    setPaymentLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line))
  }

  const addPaymentLine = () => setPaymentLines((current) => [...current, { method: 'cash', amount: '' }])
  const removePaymentLine = (index: number) => setPaymentLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))

  const handleCheckout = async () => {
    if (!selectedClientId) {
      setError('Seleccione un cliente')
      return
    }
    if (cart.length === 0) {
      setError('El carrito está vacío')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    setPrintError(null)
    try {
      if (!cashShiftId) {
        throw new Error('Abra un turno de caja antes de confirmar la venta')
      }
      const checkoutPayments = paymentLines.map((line, index) => ({
        method: line.method,
        amount: Number(line.amount) || (paymentLines.length === 1 && index === 0 ? estimatedTotal : 0),
      }))
      const paidTotal = checkoutPayments.reduce((sum, payment) => sum + payment.amount, 0)
      if (Math.abs(paidTotal - estimatedTotal) > 0.01) {
        throw new Error('La suma de los pagos debe coincidir con el total estimado')
      }
      const sale = (resumedSaleId || draftId) ? await updateSale(resumedSaleId || draftId!, {
          items: cart.map((entry) => ({
          itemType: entry.itemType,
          itemId: entry.item.id,
          quantity: entry.quantity,
          ...(entry.itemType === 'service' ? { nameSnapshot: entry.item.name, priceSnapshot: entry.item.price } : {}),
        })),
        paymentMethod: checkoutPayments[0].method,
        payments: checkoutPayments,
        discount: Number(discountRate) || 0,
        cashShiftId: cashShiftId ?? undefined,
      }) : await createSale({
        clientId: Number(selectedClientId),
        items: cart.map((entry) => ({
          itemType: entry.itemType,
          itemId: entry.item.id,
          quantity: entry.quantity,
          ...(entry.itemType === 'service' ? { nameSnapshot: entry.item.name, priceSnapshot: entry.item.price } : {}),
        })),
        paymentMethod: checkoutPayments[0].method,
        payments: checkoutPayments,
        cashShiftId,
        discount: Number(discountRate) || 0,
      })

      setPrinting(true)
      try {
        await printSaleTicket(sale)
      } catch (printErr: any) {
        setPrintError(printErr?.message ?? 'Error al imprimir ticket')
      } finally {
        setPrinting(false)
      }

      setSuccess(`Venta creada exitosamente. ID: ${sale.id}`)
      setSelectedClientId(null)
      setSelectedClient(null)
      setCart([])
      setResumedSaleId(null)
      setDraftId(null)
      setDiscountRate('0')
      setPaymentLines([{ method: 'cash', amount: '' }])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Error al crear venta')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleHold = async () => {
    if (!selectedClientId) { setError('Seleccione un cliente'); return }
    if (!cashShiftId) { setError('Abra un turno de caja antes de guardar una cuenta en espera'); return }
    if (cart.length === 0) { setError('El carrito está vacío'); return }
    setLoading(true)
    setError(null)
    try {
      await createWaitingSale({
        clientId: Number(selectedClientId),
        draftId: draftId ?? undefined,
        cashShiftId,
        items: cart.map((entry) => ({ itemType: entry.itemType, itemId: entry.item.id, quantity: entry.quantity, ...(entry.itemType === 'service' ? { nameSnapshot: entry.item.name, priceSnapshot: entry.item.price } : {}) })),
        discount: Number(discountRate) || 0,
      })
      setSuccess('Cuenta guardada en espera.')
      setSelectedClientId(null)
      setSelectedClient(null)
      setCart([])
      setDraftId(null)
      setDiscountRate('0')
      setPaymentLines([{ method: 'cash', amount: '' }])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'No se pudo guardar la cuenta en espera')
    } finally { setLoading(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Punto de Venta (POS)</h1>
        <Button variant="outline" onClick={() => router.push('/workstation/user')}>
          Volver al panel
        </Button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded">{success}</div>}
      {pendingDraft && (
        <div className="flex items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <span>Se encontró el borrador #{pendingDraft.id} de {pendingDraft.client?.name ?? 'la venta anterior'}.</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={continueDraft}>Continuar</Button>
            <Button size="sm" variant="outline" onClick={discardDraft}>Descartar</Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Buscar cliente por nombre o documento"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
            {filteredClients.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay clientes</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                {filteredClients.map((client) => (
                  <li
                    key={client.id}
                    onClick={() => handleClientSelect(client.id)}
                    className={`cursor-pointer p-2 rounded hover:bg-muted ${
                      selectedClientId === client.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-muted-foreground">{client.documentId}</div>
                  </li>
                ))}
              </ul>
            )}
            {selectedClient && (
              <div className="mt-2 p-2 bg-primary/10 rounded">
                <div className="font-medium">Seleccionado: {selectedClient.name}</div>
                <div className="text-xs text-muted-foreground">ID: {selectedClient.id}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Buscar producto"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay productos</p>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border p-3 rounded flex justify-between items-start"
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">${product.price}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => addToCart(product, 'product')}>
                      Añadir
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t pt-4 space-y-3">
              <div className="text-sm font-semibold">Servicios</div>
              <Input placeholder="Buscar servicio" value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} />
              {filteredServices.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay servicios activos</p>
              ) : (
                <div className="space-y-2">
                  {filteredServices.map((service) => (
                    <div key={service.id} className="border p-3 rounded flex justify-between items-start">
                      <div><div className="font-medium">{service.name}</div><div className="text-xs text-muted-foreground">${service.price}</div></div>
                      <Button variant="outline" size="sm" onClick={() => addToCart(service, 'service')}>Añadir</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Carrito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center">Carrito vacío</p>
            ) : (
              <>
                {cart.map((entry) => (
                  <div
                    key={`${entry.itemType}-${entry.item.id}`}
                    className="flex justify-between items-center border-b py-2"
                  >
                    <div>
                      <div className="font-medium">{entry.item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.quantity} x ${entry.item.price}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(entry.itemType, entry.item.id, entry.quantity - 1)}
                      >
                        -
                      </Button>
                      <span>{entry.quantity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(entry.itemType, entry.item.id, entry.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t space-y-3">
                  <div className="flex justify-between font-bold">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="discount-rate" className="text-sm font-medium">Descuento (%)</label>
                    <Input id="discount-rate" type="number" min="0" max="100" step="0.01" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)} />
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between"><span>Descuento</span><span>-${discount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>IVA estimado</span><span>${estimatedTax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-base font-bold text-foreground"><span>Total estimado</span><span>${estimatedTotal.toFixed(2)}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Medios de pago</span>
                      <Button type="button" variant="ghost" size="sm" onClick={addPaymentLine}>Agregar medio</Button>
                    </div>
                    <div className="space-y-2">
                      {paymentLines.map((line, index) => (
                        <div key={index} className="flex gap-2">
                          <Select value={line.method} onValueChange={(value) => updatePaymentLine(index, 'method', value)}>
                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Efectivo</SelectItem>
                              <SelectItem value="debit_card">Débito</SelectItem>
                              <SelectItem value="credit_card">Crédito</SelectItem>
                              <SelectItem value="bank_transfer">Transferencia</SelectItem>
                              <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" min="0" step="0.01" placeholder={index === 0 && paymentLines.length === 1 ? estimatedTotal.toFixed(2) : 'Importe'} value={line.amount} onChange={(event) => updatePaymentLine(index, 'amount', event.target.value)} className="w-32" />
                          {paymentLines.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removePaymentLine(index)} aria-label="Quitar medio">×</Button>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    disabled={loading || printing}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading
                      ? 'Procesando...'
                      : printing
                        ? 'Imprimiendo...'
                        : 'Confirmar Venta'}
                  </Button>
                  <Button variant="outline" onClick={handleHold} disabled={loading || printing} className="w-full">
                    Cuenta en espera
                  </Button>
                  {printError && (
                    <div className="p-2 bg-red-50 text-red-600 rounded text-sm">
                      {printError}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
