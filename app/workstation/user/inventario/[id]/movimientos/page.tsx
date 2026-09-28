'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getProductById, getProductStockMovements, type StockMovement } from '@/lib/api/products'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const dateTime = (value: string) => new Date(value).toLocaleString('es-UY')

function csvCell(value: unknown) { return `"${String(value ?? '').replaceAll('"', '""')}"` }

function downloadCsv(productName: string, movements: StockMovement[]) {
  const header = ['Fecha', 'Tipo', 'Cantidad', 'Motivo', 'Referencia', 'Notas']
  const rows = movements.map((movement) => [dateTime(movement.createdAt), movement.type, movement.quantity, movement.reason, movement.referenceType && movement.referenceId ? `${movement.referenceType} #${movement.referenceId}` : '', movement.notes].map(csvCell).join(','))
  const content = `\uFEFF${[header.map(csvCell).join(','), ...rows].join('\r\n')}`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `movimientos-${productName.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'producto'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ProductMovementsPage() {
  const params = useParams<{ id: string }>()
  const productId = Number(params.id)
  const productQuery = useQuery({ queryKey: ['inventory-product', productId], queryFn: () => getProductById(productId), enabled: Number.isFinite(productId) })
  const movementsQuery = useQuery({ queryKey: ['inventory-product-movements-full', productId], queryFn: () => getProductStockMovements(productId, 10000), enabled: Number.isFinite(productId) })
  const movements = movementsQuery.data ?? []
  const totals = useMemo(() => ({ entries: movements.filter((movement) => movement.quantity > 0).reduce((sum, movement) => sum + movement.quantity, 0), exits: Math.abs(movements.filter((movement) => movement.quantity < 0).reduce((sum, movement) => sum + movement.quantity, 0)) }), [movements])
  if (productQuery.isLoading || movementsQuery.isLoading) return <div className="flex min-h-48 items-center justify-center"><RefreshCw className="size-5 animate-spin text-muted-foreground" /></div>
  if (productQuery.isError || movementsQuery.isError || !productQuery.data) return <Card><CardContent className="py-12 text-center text-sm text-destructive">No se pudo cargar el historial del producto.</CardContent></Card>
  const product = productQuery.data
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Link href="/workstation/user/inventario" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Volver a inventario</Link><p className="text-sm font-medium text-muted-foreground">Historial de movimientos</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{product.name}</h1><p className="mt-1 text-sm text-muted-foreground">{product.sku ? `SKU ${product.sku} · ` : ''}Stock actual: {product.stock}</p></div><Button onClick={() => downloadCsv(product.name, movements)} disabled={!movements.length}><Download /> Exportar CSV</Button></div><div className="grid gap-4 sm:grid-cols-3"><Metric label="Movimientos" value={movements.length} /><Metric label="Unidades ingresadas" value={totals.entries} /><Metric label="Unidades retiradas" value={totals.exits} /></div><Card><CardHeader><CardTitle className="text-base">Historial completo</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Cantidad</TableHead><TableHead>Motivo</TableHead><TableHead>Referencia</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader><TableBody>{movements.length ? movements.map((movement) => <TableRow key={movement.id}><TableCell className="whitespace-nowrap text-sm">{dateTime(movement.createdAt)}</TableCell><TableCell><Badge variant={movement.quantity >= 0 ? 'success' : 'warning'}>{movement.type}</Badge></TableCell><TableCell className="font-semibold tabular-nums">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</TableCell><TableCell>{movement.reason || '—'}</TableCell><TableCell>{movement.referenceType && movement.referenceId ? `${movement.referenceType} #${movement.referenceId}` : '—'}</TableCell><TableCell className="max-w-64 truncate">{movement.notes || '—'}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">No hay movimientos registrados.</TableCell></TableRow>}</TableBody></Table></CardContent></Card></div>
}

function Metric({ label, value }: { label: string; value: number }) { return <Card><CardContent className="py-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card> }
