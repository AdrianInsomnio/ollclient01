'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assignConsultorio, getOpenConsultations, startConsultation, type Consultation } from '@/lib/api/consultations'
import { getAvailableConsultorios } from '@/lib/api/consultorios'
import { getPetHistory } from '@/lib/api/pets'
import type { PetHistory } from '@/lib/api/pets'
import { useAuthStore } from '@/lib/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity, AlertTriangle, ArrowRight, CalendarClock, Check, ChevronRight,
  Clock3, PawPrint, RefreshCw, Stethoscope, Thermometer, UserRound, Weight, X, Loader2,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

type QueuePet = NonNullable<Consultation['pet']> & {
  sex?: string | null
  birthDate?: string | null
  weight?: number | null
}
type QueueConsultation = Consultation & { pet?: QueuePet }

function sexLabel(value?: string | null) {
  if (!value) return null
  const normalized = value.toUpperCase()
  if (normalized === 'M' || normalized === 'MALE' || normalized === 'MACHO') return 'Macho'
  if (normalized === 'F' || normalized === 'FEMALE' || normalized === 'HEMBRA') return 'Hembra'
  return value
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '🐾'
}

function ageLabel(value?: string | null) {
  if (!value) return null
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 0) return null
  if (months < 12) return months <= 1 ? '1 mes' : months + ' meses'
  const years = Math.floor(months / 12)
  const remainder = months % 12
  return years + (years === 1 ? ' año' : ' años') + (remainder ? ' y ' + remainder + ' m' : '')
}

function waitLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes >= 60) return Math.floor(minutes / 60) + ' h ' + (minutes % 60) + ' min'
  return String(minutes).padStart(2, '0') + ' min'
}

function statusFor(consultation: Consultation) {
  if (consultation.status === 'CLOSED') return 'Atendida'
  if (consultation.consultorioId || consultation.veterinarianId) return 'En atención'
  if (consultation.priority === 'SCHEDULED') return 'Programada'
  return 'En espera'
}

function priorityLabel(priority: Consultation['priority']) {
  if (priority === 'URGENT') return 'Urgente'
  if (priority === 'SCHEDULED') return 'Programado'
  return 'Normal'
}

function VetQueueCard({ consultation, onSelect, onCall, calling, canCall, canContinue }: { consultation: QueueConsultation; onSelect: () => void; onCall: () => void; calling: boolean; canCall: boolean; canContinue: boolean }) {
  const pet = consultation.pet
  const petName = pet?.name || 'Paciente #' + consultation.petId
  const waiting = !consultation.consultorioId && !consultation.veterinarianId
  const hasTriage = Boolean(consultation.weight || consultation.temperature || consultation.symptoms)
  const detailHref = '/workstation/vet/consultas/' + consultation.id
  return (
    <article className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-slate-950/[0.025] transition hover:border-teal-200 hover:shadow-md sm:p-5">
      <button type="button" tabIndex={0} aria-label={'Ver detalle clínico de ' + petName} onClick={onSelect} className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2" />
      <div className="pointer-events-none relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="size-12 rounded-xl bg-teal-50 text-teal-800">
          <AvatarFallback className="rounded-xl bg-teal-50 text-sm font-semibold">{initials(petName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{petName}</h2>
            <Badge variant="outline" className={consultation.priority === 'URGENT' ? 'border-red-200 bg-red-50 text-red-700' : consultation.priority === 'SCHEDULED' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}>
              {consultation.priority === 'URGENT' && <AlertTriangle className="mr-1 size-3" />}{priorityLabel(consultation.priority)}
            </Badge>
            <Badge variant="outline" className={consultation.consultorioId || consultation.veterinarianId ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600'}>{statusFor(consultation)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {[pet?.species, pet?.breed, ageLabel(pet?.birthDate), sexLabel(pet?.sex)].filter(Boolean).join(' · ') || 'Datos de paciente no disponibles'}
          </p>
          <div className="grid gap-x-5 gap-y-1 text-sm sm:grid-cols-2">
            <p className="flex min-w-0 items-center gap-1.5 text-slate-600"><UserRound className="size-3.5 shrink-0 text-teal-700"/><span className="truncate">Tutor: {consultation.client?.name || 'Cliente #' + consultation.clientId}</span></p>
            <p className="flex min-w-0 items-center gap-1.5 text-slate-600"><Stethoscope className="size-3.5 shrink-0 text-teal-700"/><span className="truncate">{consultation.notes || consultation.symptoms || 'Motivo no indicado'}</span></p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs">
            <span className={'inline-flex items-center gap-1.5 ' + (hasTriage ? 'text-teal-800' : 'text-muted-foreground')}>
              {hasTriage ? <Check className="size-3.5"/> : <Activity className="size-3.5"/>}{hasTriage ? 'Triaje registrado' : 'Triaje pendiente'}
            </span>
            {waiting && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 className="size-3.5"/>{waitLabel(consultation.createdAt)} en espera</span>}
            {consultation.consultorio?.name && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><PawPrint className="size-3.5"/>Box {consultation.consultorio.name}</span>}
            {consultation.weight != null && <span className="inline-flex items-center gap-1.5 text-slate-600"><Weight className="size-3.5 text-teal-700"/>{consultation.weight} kg</span>}
            {consultation.temperature != null && <span className="inline-flex items-center gap-1.5 text-slate-600"><Thermometer className="size-3.5 text-teal-700"/>{consultation.temperature} °C</span>}
          </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center justify-between gap-3 border-t pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          {canCall ? <Button type="button" size="sm" className="bg-teal-700 text-white hover:bg-teal-800" aria-label={(consultation.consultorioId ? 'Iniciar atención de ' : 'Llamar a consultorio para ') + petName} disabled={calling} onClick={(event) => { event.stopPropagation(); onCall() }}>
            {calling ? <><Loader2 className="mr-1 size-4 animate-spin"/>{consultation.consultorioId ? 'Iniciando...' : 'Asignando consultorio...'}</> : <>{consultation.consultorioId ? 'Iniciar atención' : 'Llamar a consultorio'}<ChevronRight className="ml-1 size-4"/></>}
          </Button> : canContinue ? <Button asChild size="sm" variant="outline" onClick={(event) => event.stopPropagation()}><Link href={detailHref}>Continuar atención<ChevronRight className="ml-1 size-4"/></Link></Button> : <span className="text-xs text-muted-foreground">Asignado a otro veterinario</span>}
          <span className="text-xs text-muted-foreground sm:pr-1">Ingresó {new Date(consultation.createdAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </article>
  )
}

function HistoryRows({ history, excludeId }: { history: PetHistory; excludeId: string | number }) {
  const recent = useMemo(() => [...(history.consultations ?? [])].filter((entry) => Number(entry.id) !== Number(excludeId)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4), [history.consultations, excludeId])
  if (!recent.length) return <p className="py-3 text-sm text-muted-foreground">No hay atenciones anteriores registradas.</p>
  return <div className="divide-y divide-slate-100">
    {recent.map((entry, index) => <div key={entry.id ?? entry.date + index} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr]">
      <time className="text-xs font-medium text-muted-foreground">{new Date(entry.date).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })}</time>
      <div><p className="text-sm font-medium text-slate-900">{entry.serviceType || (entry.type === 'consultation' ? 'Consulta veterinaria' : entry.type)}</p><p className="mt-0.5 text-sm text-slate-600">{entry.description}</p>{entry.professional && <p className="mt-1 text-xs text-muted-foreground">{entry.professional}</p>}{entry.diagnosis && <p className="mt-1 text-xs text-slate-600">Diagnóstico: {entry.diagnosis}</p>}{entry.status && <Badge variant="outline" className="mt-1 text-[10px]">{entry.status === 'CLOSED' ? 'Finalizada' : 'En curso'}</Badge>}</div>
    </div>)}
  </div>
}

export default function VetQueuePage() {
  const tenantId = useAuthStore((state) => state.tenantId ?? 'unknown')
  const userId = useAuthStore((state) => state.user?.id)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<QueueConsultation | null>(null)
  const [callTarget, setCallTarget] = useState<QueueConsultation | null>(null)
  const [consultorioId, setConsultorioId] = useState('')
  const [callSlot, setCallSlot] = useState({ startAt: '', endAt: '' })
  const [callError, setCallError] = useState('')
  const { data: consultations, isLoading, isError, refetch } = useQuery({
    queryKey: ['consultations-open', tenantId],
    queryFn: getOpenConsultations,
  })
  const availableConsultoriosQuery = useQuery({
    queryKey: ['available-consultorios', tenantId, callSlot.startAt, callSlot.endAt],
    queryFn: () => getAvailableConsultorios(callSlot.startAt, callSlot.endAt),
    enabled: Boolean(callTarget && callSlot.startAt && callSlot.endAt),
    staleTime: 15_000,
  })
  const openCallDialog = (consultation: QueueConsultation) => {
    const start = new Date()
    const end = new Date(start.getTime() + 60 * 60_000)
    setCallSlot({ startAt: start.toISOString(), endAt: end.toISOString() })
    setConsultorioId('')
    setCallError('')
    setCallTarget(consultation)
  }
  const callMutation = useMutation({
    mutationFn: async ({ consultationId, roomId, startAt, endAt }: { consultationId: string | number; roomId?: number; startAt?: string; endAt?: string }) => {
      if (roomId && startAt && endAt) {
        await assignConsultorio(consultationId, { consultorioId: roomId, startAt, endAt })
      }
      return startConsultation(consultationId)
    },
    onSuccess: async (updated) => {
      setCallTarget(null)
      setCallError('')
      queryClient.setQueryData(['consultation', String(updated.id)], updated)
      queryClient.setQueryData<Consultation[]>(['consultations-open', tenantId], (current) =>
        current?.map((item) => Number(item.id) === Number(updated.id) ? updated : item),
      )
      setSelected(updated as QueueConsultation)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consultations-open'] }),
        queryClient.invalidateQueries({ queryKey: ['my-consultations'] }),
          queryClient.invalidateQueries({ queryKey: ['veterinarian-availability'] }),
          queryClient.invalidateQueries({ queryKey: ['pet-history', tenantId, updated.petId] }),
          queryClient.invalidateQueries({ queryKey: ['available-consultorios'] }),
        ])
      toast.success(updated.consultorioId ? 'Atención iniciada en ' + updated.consultorio?.name : 'Paciente llamado')
      router.push('/workstation/vet/consultas/' + updated.id)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar la atención. Puedes reintentar.'
      setCallError(message)
      toast.error(message)
    },
  })
  const historyQuery = useQuery({
    queryKey: ['pet-history', tenantId, selected?.petId],
    queryFn: () => getPetHistory(selected!.petId),
    enabled: Boolean(selected?.petId),
    staleTime: 5 * 60_000,
    retry: 1,
  })
  const selectedTriage = selected && Boolean(selected.weight || selected.temperature || selected.symptoms)
  const selectedStatus = selected ? statusFor(selected) : ''
  const detailHref = selected ? '/workstation/vet/consultas/' + selected.id : '#'
  const recentActivity = useMemo(() => {
    if (!selected) return []
    const historyEntry = historyQuery.data?.consultations.find((entry) => Number(entry.id) === Number(selected.id))
    const logged = (historyEntry?.activities ?? []).filter((activity) => ['CONSULTATION_STARTED', 'CONSULTATION_ENDED'].includes(activity.action))
    return [
      { label: 'Ingreso a la cola', time: new Date(selected.createdAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) },
      ...logged.map((activity) => ({
        label: activity.action === 'CONSULTATION_STARTED' ? 'Atención iniciada' : 'Atención finalizada',
        time: new Date(activity.createdAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }),
      })),
    ]
  }, [selected, historyQuery.data])

  return <div className="space-y-6">
    <header className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Atención veterinaria</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Cola clínica</h1>
      <p className="text-sm text-muted-foreground">Consultas abiertas y pacientes que esperan atención.</p>
    </header>
    <Card className="gap-0 border-gray-200 shadow-sm shadow-slate-950/[0.025]">
      <CardHeader className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-teal-700"/>Consultas abiertas <span className="ml-auto rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{consultations?.length ?? '—'}</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">
        {isLoading ? <div role="status" aria-label="Cargando cola" className="space-y-3"><Skeleton className="h-32 w-full"/><Skeleton className="h-32 w-full"/><Skeleton className="h-32 w-full"/></div>
          : isError ? <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>No se pudo cargar la cola clínica.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}><RefreshCw className="mr-2 size-4"/>Reintentar</Button></div>
          : !consultations?.length ? <div className="rounded-lg border border-dashed border-slate-200 px-5 py-12 text-center"><div className="mx-auto flex size-11 items-center justify-center rounded-full bg-teal-50 text-teal-800"><PawPrint className="size-5"/></div><p className="mt-4 font-medium text-slate-900">No hay pacientes en espera</p><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Los nuevos pacientes aparecerán aquí cuando sean asignados a tu cola.</p></div>
          : consultations.map((consultation) => <VetQueueCard
              key={consultation.id}
              consultation={consultation as QueueConsultation}
              onSelect={() => setSelected(consultation as QueueConsultation)}
                onCall={() => consultation.consultorioId ? callMutation.mutate({ consultationId: consultation.id }) : openCallDialog(consultation as QueueConsultation)}
                calling={callMutation.isPending && Number(callMutation.variables?.consultationId) === Number(consultation.id)}
              canCall={!consultation.veterinarianId}
              canContinue={Number(consultation.veterinarianId) === Number(userId)}
            />)
        }
      </CardContent>
    </Card>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:w-[calc(100%-2rem)]">
        {selected && <>
          <DialogHeader className="border-b border-slate-100 px-5 py-5 pr-12 sm:px-7">
            <div className="flex items-start gap-3">
              <Avatar className="size-12 rounded-xl bg-teal-50 text-teal-800"><AvatarFallback className="rounded-xl bg-teal-50 font-semibold">{initials(selected.pet?.name ?? '')}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><DialogTitle className="text-xl">{selected.pet?.name || 'Paciente #' + selected.petId}</DialogTitle><DialogDescription className="mt-1">{[selected.pet?.species, selected.pet?.breed, ageLabel(selected.pet?.birthDate), sexLabel(selected.pet?.sex)].filter(Boolean).join(' · ')}</DialogDescription><p className="mt-1 text-sm text-slate-600">Tutor: {selected.client?.name || 'Cliente #' + selected.clientId}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800">{selectedStatus}</Badge><Badge variant="outline" className={selected.priority === 'URGENT' ? 'border-red-200 bg-red-50 text-red-700' : selected.priority === 'SCHEDULED' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}>{priorityLabel(selected.priority)}</Badge></div></div>
            </div>
          </DialogHeader>
          <ScrollArea className="min-h-0 flex-1"><div className="space-y-6 px-5 py-5 sm:px-7">
            <section aria-labelledby="current-care-title"><h3 id="current-care-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Atención actual</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Motivo" value={selected.notes || selected.symptoms}/><Info label="Ingreso" value={new Date(selected.createdAt).toLocaleString('es-UY')}/>{selected.weight != null && <Info label="Peso" value={selected.weight + ' kg'} icon={<Weight className="size-4"/>}/>}{selected.temperature != null && <Info label="Temperatura" value={selected.temperature + ' °C'} icon={<Thermometer className="size-4"/>}/>}{selected.veterinarianId && <Info label="Veterinario asignado" value={historyQuery.data?.consultations.find((entry) => Number(entry.id) === Number(selected.id))?.professional || selected.veterinarian?.username || 'Veterinario #' + selected.veterinarianId}/>}{selected.consultorio?.name && <Info label="Consultorio / Box" value={selected.consultorio.name}/>}<Info label="Triaje" value={selectedTriage ? 'Datos registrados' : 'Pendiente'} icon={<Activity className="size-4"/>}/>
            </div></section>
            <Separator/>
            <section aria-labelledby="today-activity-title"><h3 id="today-activity-title" className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"><Activity className="size-4 text-teal-700"/>Actividad de hoy</h3><ol className="space-y-0">{recentActivity.map((item, index) => <li key={item.label} className="relative flex gap-3 pb-4 last:pb-0"><span className="relative mt-1 flex size-3 shrink-0 items-center justify-center rounded-full border-2 border-teal-600 bg-white">{index < recentActivity.length - 1 && <span className="absolute top-2.5 h-8 w-px bg-teal-100"/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3"><p className="text-sm font-medium text-slate-900">{item.label}</p>{item.time && <time className="text-xs tabular-nums text-muted-foreground">{item.time}</time>}</div>{item.detail && <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>}</div></li>)}</ol></section>
            <Separator/>
            <section aria-labelledby="recent-history-title"><div className="mb-2 flex items-center justify-between gap-3"><h3 id="recent-history-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"><CalendarClock className="size-4 text-teal-700"/>Últimas atenciones</h3><span className="text-xs text-muted-foreground">Máximo 4 registros</span></div>
              {historyQuery.isLoading ? <div role="status" aria-label="Cargando historial reciente" className="space-y-3 py-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div> : historyQuery.isError ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>No pudimos cargar el historial reciente.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void historyQuery.refetch()}><RefreshCw className="mr-2 size-4"/>Reintentar</Button></div> : <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-2"><HistoryRows history={historyQuery.data!} excludeId={selected.id}/></div>}
              <Button asChild variant="outline" className="mt-3 w-full justify-between"><Link href={`/workstation/vet/mascotas/${selected.petId}`}><span>Ver ficha médica completa</span><ArrowRight className="size-4"/></Link></Button>
            </section>
          </div></ScrollArea>
          <DialogFooter className="flex-row flex-wrap justify-end border-t border-slate-100 px-5 py-4 sm:px-7">
            <Button variant="ghost" onClick={() => setSelected(null)}><X className="mr-1 size-4"/>Cerrar</Button>
              {!selected.veterinarianId ? <Button className="bg-teal-700 text-white hover:bg-teal-800" onClick={() => selected.consultorioId ? callMutation.mutate({ consultationId: selected.id }) : openCallDialog(selected)} disabled={callMutation.isPending}>{callMutation.isPending ? <><Loader2 className="mr-1 size-4 animate-spin"/>{selected.consultorioId ? 'Iniciando...' : 'Asignando consultorio...'}</> : <>{selected.consultorioId ? 'Iniciar atención' : 'Llamar a consultorio'}<ChevronRight className="ml-1 size-4"/></>}</Button> : Number(selected.veterinarianId) === Number(userId) ? <Button asChild className="bg-teal-700 text-white hover:bg-teal-800"><Link href={detailHref}>Continuar atención<ChevronRight className="ml-1 size-4"/></Link></Button> : null}
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(callTarget)} onOpenChange={(open) => {
        if (!open && callMutation.isPending) return
        if (!open) setCallTarget(null)
      }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Stethoscope className="size-5 text-teal-700"/>Llamar a consultorio</DialogTitle>
            <DialogDescription>
              {callTarget ? `Selecciona un consultorio disponible para iniciar la atención de ${callTarget.pet?.name || 'este paciente'}.` : 'Selecciona un consultorio disponible.'} La reserva será por una hora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="queue-available-consultorio" className="text-sm font-medium">Consultorio disponible</label>
            {availableConsultoriosQuery.isLoading ? <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Buscando consultorios...</div>
              : availableConsultoriosQuery.isError ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>No se pudieron cargar los consultorios disponibles.</p><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void availableConsultoriosQuery.refetch()}><RefreshCw className="mr-2 size-4"/>Reintentar</Button></div>
              : (availableConsultoriosQuery.data?.length ?? 0) === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No hay consultorios disponibles para la próxima hora.</p>
              : <select id="queue-available-consultorio" value={consultorioId} onChange={(event) => setConsultorioId(event.target.value)} disabled={callMutation.isPending} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Seleccionar consultorio...</option>{availableConsultoriosQuery.data?.map((consultorio) => <option key={consultorio.id} value={consultorio.id}>{consultorio.name}{consultorio.size ? ` · ${consultorio.size}` : ''}</option>)}</select>}
            {callError && <p role="alert" className="text-sm text-destructive">{callError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCallTarget(null)} disabled={callMutation.isPending}>Cancelar</Button>
            <Button type="button" onClick={() => callTarget && callMutation.mutate({ consultationId: callTarget.id, roomId: Number(consultorioId), startAt: callSlot.startAt, endAt: callSlot.endAt })} disabled={!callTarget || !consultorioId || callMutation.isPending || availableConsultoriosQuery.isLoading || availableConsultoriosQuery.isError}>
              {callMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin"/>}{callMutation.isPending ? 'Iniciando...' : 'Iniciar atención'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  </div>
}

function Info({ label, value, icon }: { label: string; value?: string | null; icon?: ReactNode }) {
  if (!value) return null
  return <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p></div>
}
