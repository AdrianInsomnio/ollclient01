import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Users, DollarSign, ShoppingCart, Check, Loader2 } from 'lucide-react'
import { getClients, getClient } from '@/lib/api/clients'
import { get, post } from '@/lib/api/client'
import { printSaleTicket } from '@/lib/local-printer'

export default function PosPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Array<any>>([])
  const [products, setProducts] = useState<Array<any>>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [cart, setCart] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)

  // Load clients and products on mount
  useEffect(() => {
    loadClients()
    loadProducts()
  }, [])

  const loadClients = async () => {
    try {
      const data = await getClients()
      setClients(data)
    } catch (err: any) {
      setError('Error al cargar clientes')
      console.error(err)
    }
  }

  const loadProducts = async () => {
    try {
      // Assuming there is an endpoint /products
      const data = await get<any[]>('/products')
      setProducts(data)
    } catch (err: any) {
      // If endpoint doesn't exist, we can mock some products for now
      console.warn('Product endpoint not found, using mock data')
      setProducts([
        { id: 1, name: 'Alimento para perros 1kg', price: 15.50 },
        { id: 2, name: 'Collar antiparasitario', price: 12.00 },
        { id: 3, name: 'Juguete mordedor', price: 8.75 },
      ])
    }
  }

  const handleClientSelect = async (clientId: string) => {
    setSelectedClientId(clientId)
    try {
      const client = await getClient(clientId)
      setSelectedClient(client)
    } catch (err) {
      setError('No se pudo cargar el cliente')
    }
  }

  const addToCart = (product: any) => {
    // Check if product already in cart
    const existing = cart.find(item => item.product.id === product.id)
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(cart.map(item =>
      item.product.id === productId ? { ...item, quantity: qty } : item
    ))
  }

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }

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
      // Prepare sale data
      const saleData = {
        clientId: Number(selectedClientId),
        items: cart.map(item => ({
          itemType: 'product',
          itemId: item.product.id,
          nameSnapshot: item.product.name,
          priceSnapshot: item.product.price,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
        })),
        paymentMethod: 'cash', // we could make this selectable
        discount: 0
      }
      // Call sales endpoint
      const response = await post<any>('/sales', saleData)
      // Print ticket via print agent
      setPrinting(true)
      try {
        await printSaleTicket(response)
        // Show success after printing
        setSuccess(`Venta creada exitosamente. ID: ${response.id}`)
      } catch (printErr: any) {
        setPrintError(printErr.message ?? 'Error al imprimir ticket')
        // Still consider sale successful
        setSuccess(`Venta creada exitosamente. ID: ${response.id}`)
      } finally {
        setPrinting(false)
      }
      // Reset form
      setSelectedClientId(null)
      setSelectedClient(null)
      setCart([])
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Error al crear venta')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className='flex items-center justify-center py-8'><Loader2 className='h-6 w-6 animate-spin' /></div>
  if (error) return <div className='p-4 bg-red-50 text-red-600 rounded'>{error}</div>
  if (success) return <div className='p-4 bg-green-50 text-green-600 rounded'>{success}</div>

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Punto de Venta (POS)</h1>
        <Button variant='outline' onClick={() => router.push('/workstation/user')}>
          Volver al panel
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        {/* Client selection */}
        <Card>
          <CardHeader><CardTitle className='text-sm'>Cliente</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            <input
              type='text'
              placeholder='Buscar cliente por nombre o documento'
              className='input input-bordered w-full'
              onChange={(e) => {
                const term = e.target.value.toLowerCase()
                const filtered = clients.filter(c =>
                  (c.name?.toLowerCase().includes(term) ?? false) ||
                  (c.documentId?.toLowerCase().includes(term) ?? false)
                )
                setClients(filtered)
              }}
            />
            {clients.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No hay clientes</p>
            ) : (
              <ul className='space-y-1 max-h-40 overflow-y-auto border rounded p-2'>
                {clients.map(client => (
                  <li
                    key={client.id}
                    onClick={() => handleClientSelect(client.id)}
                    className='cursor-pointer p-2 rounded hover:bg-muted'
                  >
                    <div className='font-medium'>{client.name}</div>
                    <div className='text-xs text-muted-foreground'>{client.documentId}</div>
                  </li>
                ))}
              </ul>
            )}
            {selectedClient && (
              <div className='mt-2 p-2 bg-primary/10 rounded'>
                <div className='font-medium'>Seleccionado: {selectedClient.name}</div>
                <div className='text-xs text-muted-foreground'>ID: {selectedClient.id}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products catalog */}
        <Card>
          <CardHeader><CardTitle className='text-sm'>Productos</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            <input
              type='text'
              placeholder='Buscar producto'
              className='input input-bordered w-full'
              onChange={(e) => {
                const term = e.target.value.toLowerCase()
                const filtered = products.filter(p =>
                  p.name?.toLowerCase().includes(term) ?? false
                )
                setProducts(filtered)
              }}
            />
            {products.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No hay productos</p>
            ) : (
              <div className='space-y-2'>
                {products.map(product => (
                  <div key={product.id} className='border p-3 rounded flex justify-between items-start'>
                    <div>
                      {product.name}
                      <div className='text-xs text-muted-foreground'>${product.price}</div>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => addToCart(product)}
                    >
                      Añadir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader><CardTitle className='text-sm'>Carrito</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {cart.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center'>Carrito vacío</p>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.product.id} className='flex justify-between items-center border-b py-2'>
                    <div>
                      {item.product.name}
                      <div className='text-xs text-muted-foreground'>
                        {item.quantity} x ${item.product.price}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span>{item.quantity}</span>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
                <div className='mt-4 pt-3 border-t'>
                  <div className='justify-between text-bold mb-2'>
                    <span>Subtotal:</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    disabled={loading || printing}
                    className='w-full bg-green-600 hover:bg-green-700'
                  >
                    {loading ? 'Procesando...' : printing ? 'Imprimiendo...' : 'Confirmar Venta'}
                  </Button>
                  {printError && (
                    <div className='mt-2 p-2 bg-red-50 text-red-600 rounded'>
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
