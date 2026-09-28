'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Boxes, ExternalLink, Package, RefreshCw, Search } from 'lucide-react'
import Link from 'next/link'
import { getProductStockMovements, getProducts, type Product, type StockMovement } from '@/lib/api/products'
import { getProductCategories, type ProductCategory } from '@/lib/api/product-categories'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/auth-store'

const money = (value: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(value)

export function InventoryViewerDetails() {
  const tenantId = useAuthStore((state) => state.tenantId ?? 'unknown')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [stock, setStock] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const productsQuery = useQuery({ queryKey: ['inventory-viewer-products', tenantId], queryFn: () => getProducts({ isActive: true }) })
  const categoriesQuery = useQuery({ queryKey: ['inventory-categories', tenantId], queryFn: getProductCategories })
  const categories = categoriesQuery.data ?? []
  const products = useMemo(() => (productsQuery.data ?? []).filter((product) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(term)
    const matchesCategory = category === 'all' || String(product.categoryId ?? '') === category
    const matchesStock = stock === 'all' || (stock === 'available' ? product.stock > 0 : stock === 'low' ? product.stock > 0 && product.stock <= product.minStock : product.stock === 0)
    return matchesSearch && matchesCategory && matchesStock
  }), [productsQuery.data, search, category, stock])

  if (productsQuery.isLoading || categoriesQuery.isLoading) return <Loading />
  if (productsQuery.isError) return <Card><CardContent className="py-12 text-center text-sm text-destructive">No se pudo cargar el inventario.</CardContent></Card>

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-muted-foreground">Consulta</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Inventario</h1><p className="mt-2 text-sm text-muted-foreground">Consulta disponibilidad, precios y categorías de la clínica.</p></div>
        <Button variant="outline" onClick={() => { void productsQuery.refetch(); void categoriesQuery.refetch() }}><RefreshCw /> Actualizar</Button>
      </header>
      <div className="grid gap-4 sm:grid-cols-3"><Metric label="Productos visibles" value={products.length} icon={<Package />} /><Metric label="Con stock" value={products.filter((product) => product.stock > 0).length} icon={<Boxes />} /><Metric label="Stock bajo" value={products.filter((product) => product.stock > 0 && product.stock <= product.minStock).length} icon={<Boxes />} /></div>
      <Card>
        <CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><CardTitle className="text-base">Productos disponibles</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o SKU" className="pl-8 sm:w-64" /></div><Select value={category} onValueChange={setCategory}><SelectTrigger className="sm:w-48"><SelectValue placeholder="Categoría" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las categorías</SelectItem>{categories.map((item: ProductCategory) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={stock} onValueChange={setStock}><SelectTrigger className="sm:w-40"><SelectValue placeholder="Stock" /></SelectTrigger><SelectContent><SelectItem value="all">Todo el stock</SelectItem><SelectItem value="available">Disponible</SelectItem><SelectItem value="low">Stock bajo</SelectItem><SelectItem value="empty">Sin stock</SelectItem></SelectContent></Select></div></div></CardHeader>
        <CardContent className="p-0"><ProductTable products={products} categories={categories} onSelect={setSelectedProduct} /></CardContent>
      </Card>
      <ProductOverviewDialog product={selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)} />
    </div>
  )
}

function Loading() { return <div className="flex min-h-48 items-center justify-center"><RefreshCw className="size-5 animate-spin text-muted-foreground" /></div> }
function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <Card><CardContent className="flex items-center gap-3"><div className="rounded-md bg-muted p-2 text-primary">{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p></div></CardContent></Card> }
function StockBadge({ product }: { product: Product }) { return product.stock === 0 ? <Badge variant="destructive">Sin stock</Badge> : product.stock <= product.minStock ? <Badge variant="warning">Bajo</Badge> : <Badge variant="success">Disponible</Badge> }

function ProductTable({ products, categories, onSelect }: { products: Product[]; categories: ProductCategory[]; onSelect: (product: Product) => void }) {
  return <Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead>Categoría</TableHead><TableHead>Stock</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{products.length ? products.map((product) => <TableRow key={product.id} className="cursor-pointer" onClick={() => onSelect(product)}><TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.sku || '—'}</TableCell><TableCell>{product.category?.name || categories.find((item) => item.id === product.categoryId)?.name || 'Sin categoría'}</TableCell><TableCell>{product.stock}</TableCell><TableCell>{money(product.price)}</TableCell><TableCell><StockBadge product={product} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">No hay productos para estos filtros.</TableCell></TableRow>}</TableBody></Table>
}

function ProductOverviewDialog({ product, onOpenChange }: { product: Product | null; onOpenChange: (open: boolean) => void }) {
  const query = useQuery({ queryKey: ['inventory-product-movements', product?.id], queryFn: () => getProductStockMovements(product!.id, 10), enabled: Boolean(product) })
  const movements = query.data ?? []
  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(720px,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0"><DialogTitle>{product?.name}</DialogTitle><DialogDescription>{product?.sku ? `SKU ${product.sku}` : 'Detalle del producto'}</DialogDescription></DialogHeader>
        <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full shrink-0 grid-cols-2"><TabsTrigger value="summary">Resumen</TabsTrigger><TabsTrigger value="history">Historial completo</TabsTrigger></TabsList>
          <TabsContent value="summary" className="flex min-h-0 flex-1 flex-col space-y-5 overflow-hidden pt-4">
            <div className="grid shrink-0 gap-3 sm:grid-cols-3"><Detail label="Stock actual" value={String(product?.stock ?? 0)} /><Detail label="Stock mínimo" value={String(product?.minStock ?? 0)} /><Detail label="Precio" value={money(product?.price ?? 0)} /></div>
            <dl className="grid shrink-0 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2"><Field label="Categoría" value={product?.category?.name ?? 'Sin categoría'} /><Field label="Marca" value={product?.brand ?? '—'} /><Field label="Proveedor" value={product?.supplier ?? '—'} /><Field label="Código de barras" value={product?.barcode ?? '—'} /><Field label="Costo" value={product?.cost == null ? '—' : money(product.cost)} /><Field label="Estado" value={product?.isActive ? 'Activo' : 'Inactivo'} /></dl>
            <div className="flex min-h-0 flex-1 flex-col"><div className="mb-3 flex shrink-0 items-center justify-between"><h3 className="text-sm font-semibold">Últimos 10 movimientos</h3><Link className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={`/workstation/user/inventario/${product?.id}/movimientos`}>Ver todo <ExternalLink className="size-3.5" /></Link></div><div className="min-h-0 flex-1 overflow-y-auto pr-1"><MovementList movements={movements} loading={query.isLoading} error={query.isError} /></div></div>
          </TabsContent>
          <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto pt-4"><p className="text-sm text-muted-foreground">Consulta todos los movimientos y exporta el historial desde la página dedicada.</p><Button asChild className="mt-4"><Link href={`/workstation/user/inventario/${product?.id}/movimientos`}><ExternalLink /> Abrir historial completo</Link></Button></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function MovementList({ movements, loading, error }: { movements: StockMovement[]; loading: boolean; error: boolean }) { if (loading) return <Loading />; if (error) return <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">No se pudieron cargar los movimientos.</p>; if (!movements.length) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay movimientos registrados.</p>; return <div className="space-y-2">{movements.map((movement) => <div key={movement.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div><div className="flex items-center gap-2"><Badge variant={movement.quantity >= 0 ? 'success' : 'warning'}>{movement.type}</Badge><span>{movement.reason || 'Sin motivo'}</span></div><p className="mt-1 text-xs text-muted-foreground">{movement.notes || 'Sin notas'} · {new Date(movement.createdAt).toLocaleString('es-UY')}</p></div><span className="font-semibold tabular-nums">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</span></div>)}</div> }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div> }
function Field({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div> }
