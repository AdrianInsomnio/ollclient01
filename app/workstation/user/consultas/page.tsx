'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Filter, List, PawPrint, PlusCircle, Search, Stethoscope, UserRound, X } from 'lucide-react'
import { getConsultations, type Consultation } from '@/lib/api/consultations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 6

type ConsultationWithDoctor = Consultation & {
  doctor?: { name?: string; username?: string } | string
  veterinarian?: { name?: string; username?: string } | string
  vet?: { name?: string; username?: string } | string
}

function dateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return date.toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getDoctorName(consultation: Consultation): string {
  const item = consultation as ConsultationWithDoctor
  const candidate = item.doctor || item.veterinarian || item.vet
  if (typeof candidate === 'string' && candidate.trim()) return candidate
  if (candidate && typeof candidate === 'object') return candidate.name || candidate.username || 'Veterinario asignado'
  if (consultation.vetId) return `Veterinario #${consultation.vetId}`
  return 'Sin veterinario asignado'
}

function getStatus(status: Consultation['status']) {
  return status === 'OPEN'
    ? { label: 'Abierta', className: 'border-blue-200 bg-blue-50 text-blue-700' }
    : { label: 'Cerrada', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
}

function getInitials(value: string) {
  return value.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export default function ConsultationsPage() {
  const [view, setView] = useState<'cards' | 'timeline'>('cards')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [doctor, setDoctor] = useState('')
  const [page, setPage] = useState(1)

  const { data: consultations = [], isLoading, isError, refetch } = useQuery({ queryKey: ['consultations'], queryFn: getConsultations })

  const filteredConsultations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return consultations.filter((consultation) => {
      const consultationDate = dateKey(consultation.createdAt)
      const haystack = [consultation.id, consultation.client?.name, consultation.pet?.name, consultation.pet?.species, consultation.symptoms, consultation.notes, getDoctorName(consultation)].filter(Boolean).join(' ').toLowerCase()
      return (!query || haystack.includes(query)) && (!fromDate || consultationDate >= fromDate) && (!toDate || consultationDate <= toDate) && (!doctor || getDoctorName(consultation).toLowerCase().includes(doctor.trim().toLowerCase()))
    })
  }, [consultations, search, fromDate, toDate, doctor])

  const totalPages = Math.max(1, Math.ceil(filteredConsultations.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleConsultations = filteredConsultations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const timelineGroups = useMemo(() => {
    const groups = new Map<string, Consultation[]>()
    for (const consultation of visibleConsultations) {
      const key = dateKey(consultation.historyStartedAt || consultation.startAt || consultation.createdAt)
      groups.set(key, [...(groups.get(key) || []), consultation])
    }
    return [...groups.entries()]
  }, [visibleConsultations])
  const hasFilters = Boolean(search || fromDate || toDate || doctor)
  const clearFilters = () => { setSearch(''); setFromDate(''); setToDate(''); setDoctor(''); setPage(1) }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/workstation/user/consultas/nuevo"><Button className="w-full gap-2 md:w-auto"><PlusCircle className="h-4 w-4" />Nueva Consulta</Button></Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-semibold tracking-tight">Historial de consultas</h1><p className="text-sm text-muted-foreground">Elige cómo quieres revisar las atenciones anteriores.</p></div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="group" aria-label="Formato de visualización">
          <Button type="button" size="sm" variant={view === 'cards' ? 'default' : 'ghost'} aria-pressed={view === 'cards'} onClick={() => setView('cards')}><List className="mr-2 h-4 w-4" />Tarjetas</Button>
          <Button type="button" size="sm" variant={view === 'timeline' ? 'default' : 'ghost'} aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}><CalendarDays className="mr-2 h-4 w-4" />Línea de tiempo</Button>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm"><CardHeader className="pb-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4 text-blue-600" />Filtros de consultas</CardTitle>{hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-2 h-4 w-4" />Limpiar filtros</Button>}</div></CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2"><label htmlFor="consultation-search" className="text-sm font-medium">Buscar</label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="consultation-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Paciente, mascota, motivo o doctor..." className="pl-9" /></div></div>
          <div className="space-y-2"><label htmlFor="consultation-from" className="text-sm font-medium">Desde</label><div className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="consultation-from" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1) }} className="pl-9" /></div></div>
          <div className="space-y-2"><label htmlFor="consultation-to" className="text-sm font-medium">Hasta</label><div className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="consultation-to" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1) }} className="pl-9" /></div></div>
          <div className="space-y-2 md:col-span-2 lg:col-span-4"><label htmlFor="consultation-doctor" className="text-sm font-medium">Doctor que atendió</label><div className="relative md:max-w-sm"><Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="consultation-doctor" value={doctor} onChange={(event) => { setDoctor(event.target.value); setPage(1) }} placeholder="Buscar por nombre del doctor..." className="pl-9" /></div></div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Atenciones registradas</h2><p className="text-sm text-muted-foreground">{filteredConsultations.length} resultado{filteredConsultations.length === 1 ? '' : 's'} encontrado{filteredConsultations.length === 1 ? '' : 's'}</p></div>{filteredConsultations.length > 0 && <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>}</div>

      {isLoading ? <div className="grid gap-4 md:grid-cols-2"><Card className="h-48 animate-pulse bg-muted/40" /><Card className="h-48 animate-pulse bg-muted/40" /></div> : isError ? <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><p className="text-sm text-red-600">No se pudieron cargar las consultas.</p><Button variant="outline" onClick={() => refetch()}>Intentar nuevamente</Button></CardContent></Card> : visibleConsultations.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Search className="h-5 w-5 text-muted-foreground" /></div><p className="font-medium">No encontramos consultas</p><p className="max-w-sm text-sm text-muted-foreground">Prueba con otros filtros o registra una nueva consulta.</p>{hasFilters && <Button variant="outline" onClick={clearFilters}>Quitar filtros</Button>}</CardContent></Card> : view === 'cards' ? <div className="grid gap-4 md:grid-cols-2">{visibleConsultations.map((consultation) => { const status = getStatus(consultation.status); const petName = consultation.pet?.name || 'Mascota sin nombre'; const clientName = consultation.client?.name || 'Cliente sin nombre'; const doctorName = getDoctorName(consultation); return <Link key={consultation.id} href={`/workstation/user/consultas/${consultation.id}`} className="group"><Card className="h-full border-border/80 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-md"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><span className="font-semibold">{getInitials(petName) || <PawPrint className="h-5 w-5" />}</span></div><div className="min-w-0"><CardTitle className="truncate text-base">{petName}</CardTitle><p className="truncate text-sm text-muted-foreground">{clientName}</p></div></div><Badge variant="outline" className={status.className}>{status.label}</Badge></div></CardHeader><CardContent className="space-y-3 pt-0"><div className="grid grid-cols-2 gap-3 text-sm"><div className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4 text-blue-600" /><span>{formatDate(consultation.createdAt)}</span></div><div className="flex items-center gap-2 text-muted-foreground"><Stethoscope className="h-4 w-4 text-emerald-600" /><span className="truncate">{doctorName}</span></div></div><div className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground"><UserRound className="h-4 w-4" /><span className="truncate">{consultation.symptoms || consultation.notes || 'Consulta general'}</span></div></CardContent></Card></Link> })}</div> : <div className="rounded-xl border bg-card p-4 sm:p-6"><div className="space-y-8">{timelineGroups.map(([key, items]) => <section key={key || 'sin-fecha'} className="relative pl-8 sm:pl-10"><div className="absolute bottom-0 left-2 top-8 w-px bg-slate-200 sm:left-3" /><div className="relative mb-4 flex items-center gap-3"><span className="absolute -left-[1.55rem] size-5 rounded-full border-4 border-background bg-primary sm:-left-[1.65rem]" /><h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">{key ? formatDate(`${key}T12:00:00`) : 'Fecha no disponible'}</h3></div><div className="space-y-3">{items.map((consultation) => <Link key={consultation.id} href={`/workstation/user/consultas/${consultation.id}`} className="group relative block rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"><span className="absolute -left-[2rem] top-5 size-3 rounded-full border-2 border-primary bg-background sm:-left-[2.1rem]" /><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold tabular-nums text-primary">{new Date(consultation.historyStartedAt || consultation.startAt || consultation.createdAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}</span><span className="font-semibold">{consultation.pet?.name || 'Mascota sin nombre'}</span><Badge variant="outline" className={getStatus(consultation.status).className}>{getStatus(consultation.status).label}</Badge></div><p className="mt-1 text-sm text-muted-foreground">Cliente: {consultation.client?.name || 'Cliente sin nombre'} · {getDoctorName(consultation)}</p><p className="mt-2 text-sm text-muted-foreground">{consultation.symptoms || consultation.notes || 'Consulta general'}</p></div><ChevronRight className="hidden size-5 text-muted-foreground group-hover:translate-x-0.5 sm:block" /></div></Link>)}</div></section>)}</div></div>}

      {totalPages > 1 && <div className="flex items-center justify-center gap-2 pt-2"><Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Anterior</span></Button><div className="flex items-center gap-1">{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <Button key={pageNumber} variant={pageNumber === currentPage ? 'default' : 'outline'} size="sm" className="h-9 w-9 p-0" onClick={() => setPage(pageNumber)} aria-label={`Página ${pageNumber}`}>{pageNumber}</Button>)}</div><Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} aria-label="Página siguiente"><span className="hidden sm:inline">Siguiente</span><ChevronRight className="h-4 w-4" /></Button></div>}
    </div>
  )
}
