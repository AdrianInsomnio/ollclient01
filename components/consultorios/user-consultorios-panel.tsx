'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Building2, CheckCircle2, Clock3, Loader2, LogOut, RefreshCw, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api-client'
import { assignConsultorio, getConsultations, getOpenConsultations, releaseConsultorio, type Consultation } from '@/lib/api/consultations'
import { getAvailableConsultorios, getConsultorios, type Consultorio, type ConsultorioStatus } from '@/lib/api/consultorios'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const statusLabels: Record<ConsultorioStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  MAINTENANCE: 'En mantenimiento',
}

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function formatTime(value?: string | null) {
  if (!value) return 'Sin horario'
  return new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function currentConsultation(consultorioId: number, consultations: Consultation[]) {
  const now = Date.now()
  return consultations.find((consultation) => {
    if (consultation.consultorioId !== consultorioId || consultation.status !== 'OPEN') return false
    const start = consultation.startAt ? new Date(consultation.startAt).getTime() : -Infinity
    const end = consultation.endAt ? new Date(consultation.endAt).getTime() : Infinity
    return start <= now && now < end
  })
}

function statusVariant(status: ConsultorioStatus) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'MAINTENANCE') return 'warning' as const
  return 'neutral' as const
}

const equipmentStatusLabels = {
  AVAILABLE: 'Disponible',
  MAINTENANCE: 'En mantenimiento',
  OUT_OF_SERVICE: 'Fuera de servicio',
} as const

export function UserConsultoriosPanel() {
  const queryClient = useQueryClient()
  const [assigningRoom, setAssigningRoom] = useState<Consultorio | null>(null)
  const [releaseTarget, setReleaseTarget] = useState<{ room: Consultorio; consultation: Consultation } | null>(null)
  const [selectedConsultationId, setSelectedConsultationId] = useState('')
  const [startAt, setStartAt] = useState(() => toLocalInput(new Date()))
  const [endAt, setEndAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60_000)))

  const roomsQuery = useQuery({ queryKey: ['consultorios'], queryFn: getConsultorios })
  const consultationsQuery = useQuery({ queryKey: ['consultations'], queryFn: getConsultations })
  const queueQuery = useQuery({ queryKey: ['consultations-open'], queryFn: getOpenConsultations })

  const availabilityQuery = useQuery({
    queryKey: ['consultorios-available', startAt, endAt],
    queryFn: () => getAvailableConsultorios(new Date(startAt).toISOString(), new Date(endAt).toISOString()),
    enabled: Boolean(assigningRoom && startAt && endAt && new Date(startAt) < new Date(endAt)),
  })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['consultorios'] }),
      queryClient.invalidateQueries({ queryKey: ['consultations'] }),
      queryClient.invalidateQueries({ queryKey: ['consultations-open'] }),
      queryClient.invalidateQueries({ queryKey: ['consultorios-available'] }),
    ])
  }

  const assignMutation = useMutation({
    mutationFn: () => assignConsultorio(Number(selectedConsultationId), {
      consultorioId: assigningRoom!.id,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
    }),
    onSuccess: async () => {
      toast.success('Consultorio asignado correctamente.')
      setAssigningRoom(null)
      await refresh()
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('El consultorio seleccionado ya está ocupado en ese horario. Selecciona otro consultorio.')
        return
      }
      toast.error(error instanceof Error ? error.message : 'No se pudo asignar el consultorio.')
    },
  })

  const releaseMutation = useMutation({
    mutationFn: () => releaseConsultorio(releaseTarget!.consultation.id),
    onSuccess: async () => {
      toast.success('Consultorio liberado correctamente.')
      setReleaseTarget(null)
      await refresh()
    },
    onError: () => toast.error('No se pudo liberar el consultorio.'),
  })

  const consultations = useMemo(() => consultationsQuery.data ?? [], [consultationsQuery.data])
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data])
  const queueConsultations = useMemo(
    () => (queueQuery.data ?? []).filter((consultation) => !consultation.consultorioId),
    [queueQuery.data],
  )
  const summary = useMemo(() => rooms.reduce((result, room) => {
    const occupied = room.status === 'ACTIVE' && Boolean(currentConsultation(room.id, consultations))
    if (room.status !== 'ACTIVE') result.maintenance += 1
    else if (occupied) result.occupied += 1
    else result.available += 1
    return result
  }, { available: 0, occupied: 0, maintenance: 0 }), [rooms, consultations])

  const openAssignment = (room: Consultorio) => {
    setAssigningRoom(room)
    const candidate = queueConsultations[0]
    setSelectedConsultationId(candidate ? String(candidate.id) : '')
    const now = new Date()
    setStartAt(toLocalInput(now))
    setEndAt(toLocalInput(new Date(now.getTime() + 60 * 60_000)))
  }

  const closeAssignment = () => {
    if (!assignMutation.isPending) setAssigningRoom(null)
  }

  if (roomsQuery.isLoading || consultationsQuery.isLoading || queueQuery.isLoading) {
    return <ConsultoriosSkeleton />
  }

  if (roomsQuery.isError || consultationsQuery.isError || queueQuery.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <AlertCircle className="size-8 text-muted-foreground" />
          <div><p className="font-medium">No se pudieron cargar los consultorios</p><p className="text-sm text-muted-foreground">Verifica tu conexión e inténtalo nuevamente.</p></div>
          <Button variant="outline" onClick={() => { void roomsQuery.refetch(); void consultationsQuery.refetch(); void queueQuery.refetch() }}><RefreshCw /> Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-muted-foreground">Operación</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Consultorios</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Consulta la disponibilidad de los consultorios y asigna una sala a cada atención.</p></div>
          <Button variant="outline" onClick={() => void refresh()} disabled={roomsQuery.isFetching}><RefreshCw className={roomsQuery.isFetching ? 'animate-spin' : ''} /> Actualizar</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Disponibles" value={summary.available} icon={<CheckCircle2 className="size-4" />} tone="text-emerald-600" />
        <SummaryCard label="Ocupados" value={summary.occupied} icon={<UserRound className="size-4" />} tone="text-blue-600" />
        <SummaryCard label="En mantenimiento" value={summary.maintenance} icon={<Building2 className="size-4" />} tone="text-amber-600" />
      </div>

      {rooms.length === 0 ? (
        <Card><CardContent className="py-14 text-center"><Building2 className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Todavía no hay consultorios configurados</p><p className="mt-1 text-sm text-muted-foreground">Solicita a un administrador que configure los espacios de la clínica.</p></CardContent></Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => <RoomCard key={room.id} room={room} consultation={currentConsultation(room.id, consultations)} onAssign={() => openAssignment(room)} onRelease={(consultation) => setReleaseTarget({ room, consultation })} />)}
        </div>
      )}

      <Dialog open={Boolean(assigningRoom)} onOpenChange={(open) => !open && closeAssignment()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Asignar atención</DialogTitle><DialogDescription>Selecciona una consulta de la cola y define el horario de uso de {assigningRoom?.name}.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <label className="space-y-2 text-sm font-medium">Consulta
              <select value={selectedConsultationId} onChange={(event) => setSelectedConsultationId(event.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Selecciona una consulta de la cola</option>
                {queueConsultations.map((consultation) => <option key={consultation.id} value={consultation.id}>#{consultation.id} · {consultation.pet?.name ?? 'Mascota'} · {consultation.client?.name ?? 'Cliente'}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Inicio<Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label><label className="space-y-2 text-sm font-medium">Finalización<Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label></div>
            {availabilityQuery.isFetching && <p className="text-sm text-muted-foreground">Comprobando disponibilidad…</p>}
            {availabilityQuery.data && !availabilityQuery.data.some((room) => room.id === assigningRoom?.id) && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Este consultorio no está disponible en el horario elegido.</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={closeAssignment}>Cancelar</Button><Button onClick={() => assignMutation.mutate()} disabled={!selectedConsultationId || !assigningRoom || !startAt || !endAt || new Date(startAt) >= new Date(endAt) || assignMutation.isPending || (availabilityQuery.data ? !availabilityQuery.data.some((room) => room.id === assigningRoom.id) : false)}>{assignMutation.isPending && <Loader2 className="animate-spin" />} Asignar consultorio</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(releaseTarget)} onOpenChange={(open) => !open && setReleaseTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Liberar consultorio?</AlertDialogTitle><AlertDialogDescription>Se quitará la asignación de {releaseTarget?.room.name} de esta consulta. La consulta seguirá disponible en la cola.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={releaseMutation.isPending}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); releaseMutation.mutate() }} disabled={releaseMutation.isPending}>{releaseMutation.isPending && <Loader2 className="animate-spin" />} Liberar consultorio</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3"><div className={`rounded-md bg-muted p-2 ${tone}`}>{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold tracking-tight">{value}</p></div></CardContent></Card>
}

function RoomCard({ room, consultation, onAssign, onRelease }: { room: Consultorio; consultation?: Consultation; onAssign: () => void; onRelease: (consultation: Consultation) => void }) {
  const occupied = room.status === 'ACTIVE' && Boolean(consultation)
  return <Card className="gap-0 py-0"><CardHeader className="border-b px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate text-base">{room.name}</CardTitle><CardDescription className="mt-1">{room.size || 'Tamaño no indicado'}</CardDescription></div><Badge variant={occupied ? 'info' : statusVariant(room.status)}>{occupied ? 'Ocupado' : statusLabels[room.status]}</Badge></div></CardHeader><CardContent className="space-y-5 px-5 py-5">{occupied && consultation ? <div className="space-y-3"><div className="flex items-center gap-2 text-sm font-medium"><UserRound className="size-4 text-muted-foreground" />{consultation.pet?.name ?? 'Mascota'}<span className="font-normal text-muted-foreground">· {consultation.client?.name ?? 'Cliente'}</span></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />{formatTime(consultation.startAt)} — {formatTime(consultation.endAt)}</div><Button variant="outline" className="w-full" onClick={() => onRelease(consultation)}><LogOut /> Liberar consultorio</Button></div> : <div className="space-y-3"><p className="text-sm text-muted-foreground">{room.status === 'ACTIVE' ? 'Listo para recibir una atención.' : 'No puede recibir nuevas atenciones.'}</p><Button className="w-full" onClick={onAssign} disabled={room.status !== 'ACTIVE'}>Asignar atención</Button></div>}<div className="border-t pt-4"><p className="mb-3 text-sm font-medium">Equipamiento</p>{room.equipment?.length ? <div className="space-y-2">{room.equipment.map((association) => <div key={association.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm"><div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate">{association.equipment.name}</span><span className="shrink-0 text-muted-foreground">x{association.quantity}</span></div><div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{equipmentStatusLabels[association.status]}</span>{association.notes && <span className="truncate" title={association.notes}>{association.notes}</span>}</div></div>)}</div> : <p className="text-sm text-muted-foreground">Sin equipamiento asociado.</p>}</div></CardContent></Card>
}

function ConsultoriosSkeleton() {
  return <div className="space-y-8"><div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-full max-w-xl" /></div><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}</div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-56 rounded-xl" />)}</div></div>
}
