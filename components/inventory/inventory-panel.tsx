'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowDownUp, Boxes, Ellipsis, Package, Plus, RefreshCw, Search, Wrench } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api-client'
import { createProduct, getProductStockMovements, getProducts, adjustProductStock, updateProduct, updateProductStatus, type Product, type ProductPayload, type StockMovement } from '@/lib/api/products'
import { createService, getServices, updateService, updateServiceStatus, type Service, type ServicePayload } from '@/lib/api/services'
import { createProductCategory, getProductCategories, updateProductCategory, updateProductCategoryStatus, type ProductCategory } from '@/lib/api/product-categories'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

type Tab = 'products' | 'services' | 'categories'
type DialogKind = 'product' | 'service' | 'category' | null

const money = (value?: number | null) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 }).format(value ?? 0)
const dateTime = (value: string) => new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 409) return 'Ya existe un registro con esos datos.'
  return error instanceof Error ? error.message : fallback
}

export function InventoryPanel() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('products')
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [movementsProduct, setMovementsProduct] = useState<Product | null>(null)

  const productsQuery = useQuery({ queryKey: ['inventory-products'], queryFn: () => getProducts({ includeDiscontinued: true }) })
  const servicesQuery = useQuery({ queryKey: ['inventory-services'], queryFn: () => getServices() })
  const categoriesQuery = useQuery({ queryKey: ['inventory-categories'], queryFn: getProductCategories })

  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['inventory-products'] }),
    queryClient.invalidateQueries({ queryKey: ['inventory-services'] }),
    queryClient.invalidateQueries({ queryKey: ['inventory-categories'] }),
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['services'] }),
  ])

  const openNew = (kind: Exclude<DialogKind, null>) => {
    setEditingProduct(null); setEditingService(null); setEditingCategory(null); setDialog(kind)
  }

  const openEditProduct = (product: Product) => { setEditingProduct(product); setDialog('product') }
  const openEditService = (service: Service) => { setEditingService(service); setDialog('service') }
  const openEditCategory = (category: ProductCategory) => { setEditingCategory(category); setDialog('category') }

  const productStats = useMemo(() => {
    const products = productsQuery.data ?? []
    return {
      active: products.filter((product) => product.isActive).length,
      low: products.filter((product) => product.stock > 0 && product.stock <= product.minStock).length,
      empty: products.filter((product) => product.stock === 0).length,
      services: (servicesQuery.data ?? []).filter((service) => service.isActive).length,
    }
  }, [productsQuery.data, servicesQuery.data])

  const isLoading = productsQuery.isLoading || servicesQuery.isLoading || categoriesQuery.isLoading
  const hasError = productsQuery.isError || servicesQuery.isError || categoriesQuery.isError

  if (isLoading) return <InventorySkeleton />
  if (hasError) return <ErrorState onRetry={() => { void productsQuery.refetch(); void servicesQuery.refetch(); void categoriesQuery.refetch() }} />

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-muted-foreground">Administración</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Inventario</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Gestiona productos, servicios, categorías y existencias de la clínica.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void invalidate()}><RefreshCw /> Actualizar</Button><Button variant="outline" onClick={() => openNew('service')}><Wrench /> Nuevo servicio</Button><Button onClick={() => openNew('product')}><Plus /> Nuevo producto</Button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Productos activos" value={productStats.active} icon={<Package />} tone="text-blue-600" />
        <SummaryCard label="Stock bajo" value={productStats.low} icon={<ArrowDownUp />} tone="text-amber-600" />
        <SummaryCard label="Sin stock" value={productStats.empty} icon={<Boxes />} tone="text-rose-600" />
        <SummaryCard label="Servicios activos" value={productStats.services} icon={<Wrench />} tone="text-emerald-600" />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList><TabsTrigger value="products">Productos</TabsTrigger><TabsTrigger value="services">Servicios</TabsTrigger><TabsTrigger value="categories">Categorías</TabsTrigger></TabsList>
        <TabsContent value="products" className="mt-5"><ProductsTable products={productsQuery.data ?? []} categories={categoriesQuery.data ?? []} onEdit={openEditProduct} onAdjust={setStockProduct} onMovements={setMovementsProduct} onRefresh={() => void invalidate()} /></TabsContent>
        <TabsContent value="services" className="mt-5"><ServicesTable services={servicesQuery.data ?? []} categories={categoriesQuery.data ?? []} onEdit={openEditService} onRefresh={() => void invalidate()} /></TabsContent>
        <TabsContent value="categories" className="mt-5"><CategoriesTable categories={categoriesQuery.data ?? []} onNew={() => openNew('category')} onEdit={openEditCategory} onRefresh={() => void invalidate()} /></TabsContent>
      </Tabs>

      <ProductDialog key={`product-${editingProduct?.id ?? 'new'}`} open={dialog === 'product'} product={editingProduct} categories={categoriesQuery.data ?? []} onOpenChange={(open) => !open && setDialog(null)} onSaved={() => { setDialog(null); void invalidate() }} />
      <ServiceDialog key={`service-${editingService?.id ?? 'new'}`} open={dialog === 'service'} service={editingService} categories={categoriesQuery.data ?? []} onOpenChange={(open) => !open && setDialog(null)} onSaved={() => { setDialog(null); void invalidate() }} />
      <CategoryDialog key={`category-${editingCategory?.id ?? 'new'}`} open={dialog === 'category'} category={editingCategory} onOpenChange={(open) => !open && setDialog(null)} onSaved={() => { setDialog(null); void invalidate() }} />
      <StockDialog product={stockProduct} onOpenChange={(open) => !open && setStockProduct(null)} onSaved={() => { setStockProduct(null); void invalidate() }} />
      <MovementsDialog product={movementsProduct} onOpenChange={(open) => !open && setMovementsProduct(null)} />
    </div>
  )
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3"><div className={`rounded-md bg-muted p-2 ${tone}`}>{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p></div></CardContent></Card>
}

function ProductsTable({ products, categories, onEdit, onAdjust, onMovements, onRefresh }: { products: Product[]; categories: ProductCategory[]; onEdit: (product: Product) => void; onAdjust: (product: Product) => void; onMovements: (product: Product) => void; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const filtered = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = status === 'all' || (status === 'active' ? product.isActive : !product.isActive)
    const matchesCategory = category === 'all' || String(product.categoryId ?? '') === category
    return matchesSearch && matchesStatus && matchesCategory
  })
  const statusMutation = useMutation({ mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateProductStatus(id, isActive), onSuccess: () => { toast.success('Estado del producto actualizado.'); onRefresh() }, onError: (error) => toast.error(errorMessage(error, 'No se pudo actualizar el producto.')) })
  return <Card><CardHeader className="gap-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><CardTitle className="text-base">Catálogo de productos</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o SKU" className="pl-8 sm:w-64" /></div><NativeFilter value={status} onChange={setStatus} options={[['all', 'Todos los estados'], ['active', 'Activos'], ['inactive', 'Inactivos']]} /><NativeFilter value={category} onChange={setCategory} options={[['all', 'Todas las categorías'], ...categories.map((item) => [String(item.id), item.name])]} /></div></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow>{['Producto', 'SKU', 'Categoría', 'Precio', 'Costo', 'Stock', 'Stock mínimo', 'Estado', 'Acciones'].map((head) => <TableHead key={head}>{head}</TableHead>)}</TableRow></TableHeader><TableBody>{filtered.length === 0 ? <EmptyRow colSpan={9} text={search || status !== 'all' || category !== 'all' ? 'No hay productos para estos filtros.' : 'No hay productos registrados'} /> : filtered.map((product) => <TableRow key={product.id}><TableCell><div className="font-medium">{product.name}</div><div className="max-w-48 truncate text-xs text-muted-foreground">{product.description || 'Sin descripción'}</div></TableCell><TableCell>{product.sku || '—'}</TableCell><TableCell>{product.category?.name || categories.find((item) => item.id === product.categoryId)?.name || 'Sin categoría'}</TableCell><TableCell>{money(product.price)}</TableCell><TableCell>{product.cost == null ? '—' : money(product.cost)}</TableCell><TableCell><StockBadge product={product} /></TableCell><TableCell>{product.minStock}</TableCell><TableCell><Badge variant={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'Activo' : 'Inactivo'}</Badge></TableCell><TableCell><ProductActions product={product} onEdit={onEdit} onAdjust={onAdjust} onMovements={onMovements} onToggle={(isActive) => statusMutation.mutate({ id: product.id, isActive })} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
}

function ServicesTable({ services, categories, onEdit, onRefresh }: { services: Service[]; categories: ProductCategory[]; onEdit: (service: Service) => void; onRefresh: () => void }) {
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [category, setCategory] = useState('all')
  const filtered = services.filter((service) => service.name.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || (status === 'active' ? service.isActive : !service.isActive)) && (category === 'all' || String(service.category ?? '') === category || categories.find((item) => item.name === service.category)?.id.toString() === category))
  const statusMutation = useMutation({ mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateServiceStatus(id, isActive), onSuccess: () => { toast.success('Estado del servicio actualizado.'); onRefresh() }, onError: (error) => toast.error(errorMessage(error, 'No se pudo actualizar el servicio.')) })
  return <Card><CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><CardTitle className="text-base">Catálogo de servicios</CardTitle><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar servicio" className="pl-8 sm:w-64" /></div><NativeFilter value={category} onChange={setCategory} options={[['all', 'Todas las categorías'], ...categories.map((item) => [String(item.id), item.name])]} /><NativeFilter value={status} onChange={setStatus} options={[['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']]} /></div></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow>{['Servicio', 'Categoría', 'Duración', 'Precio', 'Estado', 'Acciones'].map((head) => <TableHead key={head}>{head}</TableHead>)}</TableRow></TableHeader><TableBody>{filtered.length === 0 ? <EmptyRow colSpan={6} text={services.length ? 'No hay servicios para estos filtros.' : 'No hay servicios registrados'} /> : filtered.map((service) => <TableRow key={service.id}><TableCell><div className="font-medium">{service.name}</div><div className="max-w-56 truncate text-xs text-muted-foreground">{service.description || 'Sin descripción'}</div></TableCell><TableCell>{serviceCategoryName(service.category, categories)}</TableCell><TableCell>{service.duration ? `${service.duration} min` : '—'}</TableCell><TableCell>{money(service.price)}</TableCell><TableCell><Badge variant={service.isActive ? 'success' : 'neutral'}>{service.isActive ? 'Activo' : 'Inactivo'}</Badge></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${service.name}`}><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(service)}>Editar</DropdownMenuItem><DropdownMenuItem onClick={() => statusMutation.mutate({ id: service.id, isActive: !service.isActive })}>{service.isActive ? 'Desactivar' : 'Activar'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
}

function CategoriesTable({ categories, onNew, onEdit, onRefresh }: { categories: ProductCategory[]; onNew: () => void; onEdit: (category: ProductCategory) => void; onRefresh: () => void }) {
  const statusMutation = useMutation({ mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateProductCategoryStatus(id, isActive), onSuccess: () => { toast.success('Estado de la categoría actualizado.'); onRefresh() }, onError: (error) => toast.error(errorMessage(error, 'No se pudo actualizar la categoría.')) })
  return <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Categorías</CardTitle><p className="mt-1 text-sm text-muted-foreground">Organiza el catálogo sin eliminar categorías asociadas.</p></div><Button size="sm" onClick={onNew}><Plus /> Nueva categoría</Button></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow>{['Nombre', 'Descripción', 'Productos asociados', 'Estado', 'Acciones'].map((head) => <TableHead key={head}>{head}</TableHead>)}</TableRow></TableHeader><TableBody>{categories.length === 0 ? <EmptyRow colSpan={5} text="No hay categorías registradas" /> : categories.map((category) => <TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell>{category.description || '—'}</TableCell><TableCell>{category.productsCount ?? 0}</TableCell><TableCell><Badge variant={category.isActive ? 'success' : 'neutral'}>{category.isActive ? 'Activa' : 'Inactiva'}</Badge></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${category.name}`}><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(category)}>Editar</DropdownMenuItem><DropdownMenuItem onClick={() => statusMutation.mutate({ id: category.id, isActive: !category.isActive })}>{category.isActive ? 'Desactivar' : 'Activar'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
}

function ProductActions({ product, onEdit, onAdjust, onMovements, onToggle }: { product: Product; onEdit: (product: Product) => void; onAdjust: (product: Product) => void; onMovements: (product: Product) => void; onToggle: (isActive: boolean) => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${product.name}`}><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(product)}>Ver detalle</DropdownMenuItem><DropdownMenuItem onClick={() => onEdit(product)}>Editar</DropdownMenuItem><DropdownMenuItem onClick={() => onAdjust(product)}>Ajustar stock</DropdownMenuItem><DropdownMenuItem onClick={() => onMovements(product)}>Ver movimientos</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onToggle(!product.isActive)}>{product.isActive ? 'Desactivar' : 'Activar'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
}

function StockBadge({ product }: { product: Product }) {
  if (product.stock === 0) return <Badge variant="destructive">Sin stock</Badge>
  if (product.stock <= product.minStock) return <Badge variant="warning">{product.stock} · Bajo</Badge>
  return <Badge variant="success">{product.stock} · Disponible</Badge>
}

function NativeFilter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) { return <TableRow><TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground"><Package className="mx-auto mb-2 size-6" />{text}</TableCell></TableRow> }

function ProductDialog({ open, product, categories, onOpenChange, onSaved }: { open: boolean; product: Product | null; categories: ProductCategory[]; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<ProductPayload>(() => productForm(product)); const [availableCategories, setAvailableCategories] = useState(categories); const [error, setError] = useState('')
  const mutation = useMutation({ mutationFn: () => product ? updateProduct(product.id, form) : createProduct(form), onSuccess: () => { toast.success(product ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.'); onSaved() }, onError: (error) => setError(errorMessage(error, 'No se pudo guardar el producto.')) })
  const update = <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event: React.FormEvent) => { event.preventDefault(); setError(''); if (!form.name.trim()) return setError('El nombre es obligatorio.'); if (form.price < 0 || (form.cost != null && form.cost < 0) || form.stock < 0 || form.minStock < 0) return setError('Los valores de precio, costo y stock no pueden ser negativos.'); mutation.mutate() }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{product ? 'Editar producto' : 'Nuevo producto'}</DialogTitle><DialogDescription>Los datos se guardan en la clínica activa del usuario autenticado.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre *"><Input value={form.name} onChange={(event) => update('name', event.target.value)} /></Field><Field label="SKU"><Input value={form.sku ?? ''} onChange={(event) => update('sku', event.target.value || undefined)} /></Field><CategoryPicker value={form.categoryId ? String(form.categoryId) : 'none'} categories={availableCategories} onChange={(value) => update('categoryId', value === 'none' ? undefined : Number(value))} onCreated={(category) => { setAvailableCategories((current) => [...current, category]); update('categoryId', category.id) }} /><Field label="Descripción"><Textarea value={form.description ?? ''} onChange={(event) => update('description', event.target.value || undefined)} rows={2} /></Field></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Precio *"><Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', Number(event.target.value))} /></Field><Field label="Costo"><Input type="number" min="0" step="0.01" value={form.cost ?? ''} onChange={(event) => update('cost', event.target.value === '' ? undefined : Number(event.target.value))} /></Field><Field label="Stock inicial"><Input type="number" min="0" step="1" value={form.stock} onChange={(event) => update('stock', Number(event.target.value))} /></Field><Field label="Stock mínimo"><Input type="number" min="0" step="1" value={form.minStock} onChange={(event) => update('minStock', Number(event.target.value))} /></Field></div><CheckboxField label="Producto activo" checked={form.isActive} onChange={(checked) => update('isActive', checked)} />{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <RefreshCw className="animate-spin" />} {product ? 'Guardar cambios' : 'Crear producto'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function ServiceDialog({ open, service, categories, onOpenChange, onSaved }: { open: boolean; service: Service | null; categories: ProductCategory[]; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<ServicePayload>(() => serviceForm(service)); const [availableCategories, setAvailableCategories] = useState(categories); const [error, setError] = useState('')
  const mutation = useMutation({ mutationFn: () => service ? updateService(service.id, form) : createService(form), onSuccess: () => { toast.success(service ? 'Servicio actualizado correctamente.' : 'Servicio creado correctamente.'); onSaved() }, onError: (error) => setError(errorMessage(error, 'No se pudo guardar el servicio.')) })
  const update = <K extends keyof ServicePayload>(key: K, value: ServicePayload[K]) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event: React.FormEvent) => { event.preventDefault(); setError(''); if (!form.name.trim()) return setError('El nombre es obligatorio.'); if (form.price < 0 || (form.duration != null && form.duration <= 0)) return setError('El precio no puede ser negativo y la duración debe ser mayor a cero.'); mutation.mutate() }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{service ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle><DialogDescription>Solo se utilizan campos existentes en Service.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Nombre *"><Input value={form.name} onChange={(event) => update('name', event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><CategoryPicker value={form.category || 'none'} categories={availableCategories} onChange={(value) => update('category', value === 'none' ? undefined : value)} onCreated={(category) => { setAvailableCategories((current) => [...current, category]); update('category', category.name) }} /><Field label="Precio *"><Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', Number(event.target.value))} /></Field><Field label="Duración (minutos)"><Input type="number" min="1" step="1" value={form.duration ?? ''} onChange={(event) => update('duration', event.target.value === '' ? undefined : Number(event.target.value))} /></Field></div><Field label="Descripción"><Textarea value={form.description ?? ''} onChange={(event) => update('description', event.target.value || undefined)} rows={3} /></Field><CheckboxField label="Servicio activo" checked={form.isActive} onChange={(checked) => update('isActive', checked)} />{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <RefreshCw className="animate-spin" />} {service ? 'Guardar cambios' : 'Crear servicio'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function CategoryDialog({ open, category, onOpenChange, onSaved }: { open: boolean; category: ProductCategory | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? ''); const [description, setDescription] = useState(category?.description ?? ''); const [error, setError] = useState('')
  const mutation = useMutation({ mutationFn: () => category ? updateProductCategory(category.id, { name, description }) : createProductCategory({ name: name.toUpperCase(), description }), onSuccess: () => { toast.success(category ? 'Categoría actualizada correctamente.' : 'Categoría creada correctamente.'); onSaved() }, onError: (error) => setError(errorMessage(error, 'No se pudo guardar la categoría.')) })
  const submit = (event: React.FormEvent) => { event.preventDefault(); setError(''); if (!name.trim()) return setError('El nombre es obligatorio.'); mutation.mutate() }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{category ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Nombre *"><Input value={name} onChange={(event) => setName(event.target.value.toUpperCase())} /></Field><Field label="Descripción"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></Field>{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <RefreshCw className="animate-spin" />} Guardar</Button></DialogFooter></form></DialogContent></Dialog>
}

function StockDialog({ product, onOpenChange, onSaved }: { product: Product | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [quantity, setQuantity] = useState(''); const [reason, setReason] = useState(''); const [notes, setNotes] = useState(''); const [error, setError] = useState('')
  const mutation = useMutation({ mutationFn: () => adjustProductStock(product!.id, { quantity: Number(quantity), reason, notes: notes || undefined }), onSuccess: () => { toast.success('Stock ajustado correctamente.'); onSaved() }, onError: (error) => setError(errorMessage(error, 'No se pudo ajustar el stock.')) })
  const submit = (event: React.FormEvent) => { event.preventDefault(); setError(''); if (!quantity || Number(quantity) === 0 || !reason.trim()) return setError('Indica una cantidad distinta de cero y un motivo.'); mutation.mutate() }
  return <Dialog open={Boolean(product)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Ajustar stock</DialogTitle><DialogDescription>{product?.name} · Stock actual: {product?.stock ?? 0}</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Cantidad (usa negativo para retirar)"><Input type="number" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} autoFocus /></Field><Field label="Motivo *"><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ingreso, corrección, merma..." /></Field><Field label="Notas"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></Field>{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <RefreshCw className="animate-spin" />} Ajustar stock</Button></DialogFooter></form></DialogContent></Dialog>
}

function MovementsDialog({ product, onOpenChange }: { product: Product | null; onOpenChange: (open: boolean) => void }) {
  const query = useQuery({ queryKey: ['stock-movements', product?.id], queryFn: () => getProductStockMovements(product!.id), enabled: Boolean(product) })
  return <Dialog open={Boolean(product)} onOpenChange={onOpenChange}><DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Movimientos de stock</DialogTitle><DialogDescription>{product?.name}</DialogDescription></DialogHeader>{query.isLoading ? <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : query.isError ? <p className="text-sm text-destructive">No se pudieron cargar los movimientos.</p> : (query.data ?? []).length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No hay movimientos registrados.</p> : <div className="space-y-2">{(query.data ?? []).map((movement: StockMovement) => <div key={movement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div><Badge variant={movement.quantity >= 0 ? 'success' : 'warning'}>{movement.type}</Badge><span className="ml-2 font-medium">{movement.reason || 'Sin motivo'}</span><p className="mt-1 text-xs text-muted-foreground">{movement.notes || 'Sin notas'} · {dateTime(movement.createdAt)}</p></div><span className="font-semibold tabular-nums">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</span></div>)}</div>}</DialogContent></Dialog>
}

function CategoryPicker({ value, categories, valueMode, onChange, onCreated }: { value: string; categories: ProductCategory[]; valueMode?: 'id' | 'name'; onChange: (value: string) => void; onCreated: (category: ProductCategory) => void }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: () => createProductCategory({ name: name.trim().toUpperCase() }), onSuccess: (category) => { onCreated(category); void queryClient.invalidateQueries({ queryKey: ['inventory-categories'] }); setName(''); setError(''); setCreating(false); toast.success('Categoría creada correctamente.') }, onError: (error) => setError(errorMessage(error, 'No se pudo crear la categoría.')) })
  const resolvedValueMode = valueMode ?? (value !== 'none' && Number.isNaN(Number(value)) ? 'name' : 'id')
  return <div className="space-y-2"><Label>Categoría</Label><div className="flex gap-2"><Select value={value} onValueChange={onChange}><SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Sin categoría" /></SelectTrigger><SelectContent><SelectItem value="none">Sin categoría</SelectItem>{categories.filter((category) => category.isActive).map((category) => <SelectItem key={category.id} value={resolvedValueMode === 'name' ? category.name : String(category.id)}>{category.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="sm" onClick={() => setCreating((current) => !current)} aria-expanded={creating}> <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva</span></Button></div>{creating && <div className="flex gap-2"><Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de categoría" /><Button type="button" size="sm" disabled={mutation.isPending || !name.trim()} onClick={() => { setError(''); mutation.mutate() }}>{mutation.isPending ? <RefreshCw className="animate-spin" /> : 'Crear'}</Button></div>}{error && <p className="text-xs text-destructive">{error}</p>}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 rounded border-input accent-primary" />{label}</label> }
function productForm(product: Product | null): ProductPayload { return { name: product?.name ?? '', description: product?.description ?? undefined, sku: product?.sku ?? undefined, categoryId: product?.categoryId ?? undefined, price: product?.price ?? 0, cost: product?.cost ?? undefined, stock: product?.stock ?? 0, minStock: product?.minStock ?? 0, isActive: product?.isActive ?? true } }
function serviceCategoryName(category: Service['category'], categories: ProductCategory[]) { if (!category) return '—'; return categories.find((item) => String(item.id) === String(category))?.name ?? category }
function serviceForm(service: Service | null): ServicePayload { return { name: service?.name ?? '', description: service?.description ?? undefined, price: service?.price ?? 0, duration: service?.duration ?? undefined, category: service?.category ?? undefined, isActive: service?.isActive ?? true } }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <Card><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><AlertCircle className="size-8 text-muted-foreground" /><p className="font-medium">No se pudo cargar el inventario</p><p className="text-sm text-muted-foreground">Verifica tu conexión e inténtalo nuevamente.</p><Button variant="outline" onClick={onRetry}><RefreshCw /> Reintentar</Button></CardContent></Card> }
function InventorySkeleton() { return <div className="space-y-8"><div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-full max-w-xl" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}</div><Skeleton className="h-10 w-72" /><Skeleton className="h-96 w-full rounded-xl" /></div> }
