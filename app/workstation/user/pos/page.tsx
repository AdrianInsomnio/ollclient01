'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Loader2 } from 'lucide-react'
import { getClients, getClient } from '@/lib/api/clients'
import { getProducts } from '@/lib/api/products'
import { createSale, createWaitingSale, getSaleById, updateSale } from '@/lib/api/sales'
import { getCashRegisters, getCurrentCashShift } from '@/lib/api/cash'
import { printSaleTicket } from '@/lib/local-printer'

type Client = { id: string; name: string; documentId?: string }
type Product = { id: number; name: string; price: number; stock?: number }
type CartItem = { product: Product; quantity: number }

export default function PosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const [cashShiftId, setCashShiftId] = useState<number | null>(null)
  const [resumedSaleId, setResumedSaleId] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
    loadProducts()
    void loadCashShift()
  }, [])

  useEffect(() => {
    const saleId = searchParams.get('resume')
    if (!saleId || products.length === 0 || cart.length > 0) return
    void (async () => {
      try {
        const sale = await getSaleById(saleId)
        const client = await getClient(String(sale.clientId))
        const restoredItems = (sale.saleItems ?? sale.items ?? []).map((item) => {
          const product = products.find((candidate) => candidate.id === item.itemId)
          return product ? { product, quantity: item.quantity } : null
        }).filter((item): item is CartItem => item !== null)
        setSelectedClientId(String(sale.clientId))
        setSelectedClient(client as Client)
        setCart(restoredItems)
        setResumedSaleId(saleId)
        setSuccess(`Cuenta #${sale.id} retomada.`)
      } catch (err: any) {
        setError(err?.message ?? 'No se pudo retomar la cuenta en espera')
      }
    })()
  }, [searchParams, products, cart.length])

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

  const handleClientSelect = async (clientId: string) => {
    setSelectedClientId(clientId)
    try {
      const client = await getClient(clientId)
      setSelectedClient(client as Client)
    } catch {
      setError('No se pudo cargar el cliente')
    }
  }

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...current, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: number) => {
    setCart((current) => current.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item,
      ),
    )
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )

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
      const sale = resumedSaleId ? await updateSale(resumedSaleId, {
        items: cart.map((item) => ({
          itemType: 'product' as const,
          itemId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod: 'cash',
        discount: 0,
      }) : await createSale({
        clientId: Number(selectedClientId),
        items: cart.map((item) => ({
          itemType: 'product',
          itemId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod: 'cash',
        cashShiftId,
        discount: 0,
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
        cashShiftId,
        items: cart.map((item) => ({ itemType: 'product', itemId: item.product.id, quantity: item.quantity })),
        discount: 0,
      })
      setSuccess('Cuenta guardada en espera.')
      setSelectedClientId(null)
      setSelectedClient(null)
      setCart([])
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
                    <Button variant="outline" size="sm" onClick={() => addToCart(product)}>
                      Añadir
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center border-b py-2"
                  >
                    <div>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.quantity} x ${item.product.price}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span>{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
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
