'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Boxes, Package, RefreshCw, Search } from 'lucide-react'

import { getProducts, type Product } from '@/lib/api/products'
import { getProductCategories, type ProductCategory } from '@/lib/api/product-categories'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthStore } from '@/lib/auth-store'

const money = (value: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 }).format(value)

export function InventoryViewerPanel() {
  const tenantId = useAuthStore((state) => state.tenantId ?? 'unknown')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [stock, setStock] = useState('all')
  const productsQuery = useQuery({ queryKey: ['inventory-viewer-products', tenantId], queryFn: () => getProducts({ isActive: true }), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false })
  const categoriesQuery = useQuery({ queryKey: ['inventory-categories', tenantId], queryFn: getProductCategories, staleTime: 10 * 60 * 1000, refetchOnWindowFocus: false })
  const products = useMemo(() => (productsQuery.data ?? []).filter((product) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(term)
    const matchesCategory = category === 'all' || String(product.categoryId ?? '') === category
    const matchesStock = stock === 'all' || (stock === 'available' ? product.stock > 0 : stock === 'low' ? product.stock > 0 && product.stock <= product.minStock : product.stock === 0)
    return matchesSearch && matchesCategory && matchesStock
  }), [productsQuery.data, search, category, stock])
  const categories = categoriesQuery.data ?? []

  if (productsQuery.isLoading || categoriesQuery.isLoading) return <div className="flex min-h-48 items-center justify-center"><RefreshCw className="size-5 animate-spin text-muted-foreground" /></div>
  if (productsQuery.isError) return <Card><CardContent className="flex flex-col items-center gap-3 py-12"><p className="text-sm text-destructive">No se pudo cargar el inventario.</p><Button variant="outline" onClick={() => void productsQuery.refetch()}>Reintentar</Button></CardContent></Card>

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-muted-foreground">Consulta</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Inventario</h1><p className="mt-2 text-sm text-muted-foreground">Consulta disponibilidad, precios y categorías de la clínica.</p></div><Button variant="outline" onClick={() => { void productsQuery.refetch(); void categoriesQuery.refetch() }}><RefreshCw /> Actualizar</Button></div><div className="grid gap-4 sm:grid-cols-3"><ViewerMetric label="Productos visibles" value={products.length} icon={<Package />} /><ViewerMetric label="Con stock" value={products.filter((product) => product.stock > 0).length} icon={<Boxes />} /><ViewerMetric label="Stock bajo" value={products.filter((product) => product.stock > 0 && product.stock <= product.minStock).length} icon={<Boxes />} /></div><Card><CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><CardTitle className="text-base">Productos disponibles</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o SKU" className="pl-8 sm:w-64" /></div><Select value={category} onValueChange={setCategory}><SelectTrigger className="sm:w-48"><SelectValue placeholder="Categoría" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las categorías</SelectItem>{categories.map((item: ProductCategory) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={stock} onValueChange={setStock}><SelectTrigger className="sm:w-40"><SelectValue placeholder="Stock" /></SelectTrigger><SelectContent><SelectItem value="all">Todo el stock</SelectItem><SelectItem value="available">Disponible</SelectItem><SelectItem value="low">Stock bajo</SelectItem><SelectItem value="empty">Sin stock</SelectItem></SelectContent></Select></div></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead>Categoría</TableHead><TableHead>Stock</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{products.length ? products.map((product) => <TableRow key={product.id}><TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.sku || '—'}</TableCell><TableCell>{product.category?.name || categories.find((item) => item.id === product.categoryId)?.name || 'Sin categoría'}</TableCell><TableCell>{product.stock}</TableCell><TableCell><div>{money(product.price)}</div>{product.ivaIncluded && <Badge variant="outline" className="mt-1 text-[10px]">IVA incluido</Badge>}</TableCell><TableCell><StockBadge product={product} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">No hay productos para estos filtros.</TableCell></TableRow>}</TableBody></Table></CardContent></Card></div>
}

function ViewerMetric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <Card><CardContent className="flex items-center gap-3"><div className="rounded-md bg-muted p-2 text-primary">{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p></div></CardContent></Card> }
function StockBadge({ product }: { product: Product }) { if (product.stock === 0) return <Badge variant="destructive">Sin stock</Badge>; if (product.stock <= product.minStock) return <Badge variant="warning">Bajo</Badge>; return <Badge variant="success">Disponible</Badge> }
