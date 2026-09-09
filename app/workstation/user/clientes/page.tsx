'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Mail, Phone, Plus, Search, UserRound } from 'lucide-react'
import { getClients, type Client } from '@/lib/api/clients'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 8

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function ClientCard({ client }: { client: Client }) {
  return (
    <Link href={`/workstation/user/clientes/${client.id}`} className="group">
      <Card className="h-full border-border/80 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-semibold text-blue-700">{getInitials(client.name)}</div>
            <div className="min-w-0 flex-1"><h2 className="truncate font-semibold text-foreground">{client.name}</h2><p className="mt-1 text-xs text-muted-foreground">Cliente #{client.id}</p></div>
            <UserRound className="h-4 w-4 shrink-0 text-blue-600" />
          </div>
          <div className="space-y-2 border-t pt-3 text-sm text-muted-foreground">
            {client.phone ? <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" /><span className="truncate">{client.phone}</span></div> : <p className="text-xs">Sin teléfono registrado</p>}
            {client.email ? <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600" /><span className="truncate">{client.email}</span></div> : <p className="text-xs">Sin email registrado</p>}
          </div>
          {client.documentId && <Badge variant="outline" className="w-fit text-xs">CI: {client.documentId}</Badge>}
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ClientesPage() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const { data: clients = [], isLoading, isError, refetch } = useQuery({ queryKey: ['clients'], queryFn: getClients })

  const filteredClients = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return clients
    return clients.filter((client) => [client.name, client.phone, client.email, client.documentId].filter(Boolean).join(' ').toLowerCase().includes(value))
  }, [clients, query])

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight text-gray-900">Clientes</h1><p className="text-sm text-muted-foreground">{isLoading ? 'Cargando clientes…' : `${filteredClients.length} cliente${filteredClients.length === 1 ? '' : 's'} disponible${filteredClients.length === 1 ? '' : 's'}`}</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/workstation/user/clientes/buscar"><Button variant="outline" className="gap-2"><Search className="h-4 w-4" />Búsqueda avanzada</Button></Link><Link href="/workstation/user/clientes/nuevo"><Button className="gap-2"><Plus className="h-4 w-4" />Nuevo Cliente</Button></Link></div>
      </div>

      <Card className="border-border/80 shadow-sm"><CardContent className="p-4"><label htmlFor="client-search" className="mb-2 block text-sm font-medium">Buscar cliente</label><div className="relative max-w-2xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="client-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Nombre, teléfono, email o documento..." className="pl-9" /></div></CardContent></Card>

      {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Card key={index} className="h-48 animate-pulse bg-muted/40" />)}</div> : isError ? <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><p className="text-sm text-red-600">No se pudieron cargar los clientes.</p><Button variant="outline" onClick={() => refetch()}>Intentar nuevamente</Button></CardContent></Card> : visibleClients.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Search className="h-5 w-5 text-muted-foreground" /></div><p className="font-medium">No encontramos clientes</p><p className="text-sm text-muted-foreground">Prueba con otros datos o registra un nuevo cliente.</p>{query ? <Button variant="outline" onClick={() => setQuery('')}>Limpiar búsqueda</Button> : <Link href="/workstation/user/clientes/nuevo"><Button><Plus className="mr-2 h-4 w-4" />Crear Cliente</Button></Link>}</CardContent></Card> : <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleClients.map((client) => <ClientCard key={client.id} client={client} />)}</div><div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row"><p className="text-sm text-muted-foreground">Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredClients.length)} de {filteredClients.length}</p>{totalPages > 1 && <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button><span className="min-w-20 text-center text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></Button></div>}</div></>}
    </div>
  )
}
