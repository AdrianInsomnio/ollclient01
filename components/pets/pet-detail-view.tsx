'use client'

import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  getPet,
  getPetHistory,
  type PetHistoryItem,
} from '@/lib/api/pets'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Building2,
  PawPrint,
  Edit,
  Stethoscope,
  IdCard,
  AlertTriangle,
  Syringe,
  Pill,
  Scissors,
  FileText,
  Calendar,
  User,
  Scale,
  Cake,
  Activity,
  ShoppingBag,
  Microscope,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { EditPetDialog } from '@/components/pets/edit-pet-dialog'
import {
  assignConsultorio,
  openConsultation,
  setVeterinarianAvailability,
} from '@/lib/api/consultations'
import { getAvailableConsultorios } from '@/lib/api/consultorios'
import { useAuthStore } from '@/lib/auth-store'

// =====================================================================
// Helpers de presentación (sin nuevos componentes)
// =====================================================================

type ItemKind = PetHistoryItem['type']
type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral'

const itemMeta: Record<
  ItemKind,
  { label: string; Icon: typeof Calendar; dot: string; ring: string; badge: BadgeVariant }
> = {
  consultation: {
    label: 'Consulta',
    Icon: Stethoscope,
    dot: 'bg-blue-500',
    ring: 'ring-blue-100',
    badge: 'info',
  },
  vaccination: {
    label: 'Vacuna',
    Icon: Syringe,
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-100',
    badge: 'success',
  },
  sale: {
    label: 'Venta',
    Icon: ShoppingBag,
    dot: 'bg-amber-500',
    ring: 'ring-amber-100',
    badge: 'warning',
  },
  study: {
    label: 'Estudio',
    Icon: Microscope,
    dot: 'bg-violet-500',
    ring: 'ring-violet-100',
    badge: 'secondary',
  },
}

function computeAge(birthDate?: string): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '—'
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--
  if (years < 1) {
    const months = Math.max(
      0,
      (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth()) -
        (now.getDate() < birth.getDate() ? 1 : 0),
    )
    return months <= 1 ? '1 mes' : `${months} meses`
  }
  return years === 1 ? '1 año' : `${years} años`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function statusFromHistory(history?: {
  consultations: PetHistoryItem[]
}): { label: string; variant: BadgeVariant } {
  if (!history) return { label: 'Sin historial', variant: 'neutral' }
  const last = history.consultations[0]
  if (!last) return { label: 'Sin consultas', variant: 'neutral' }
  const ageDays = Math.floor(
    (Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24),
  )
  if (ageDays <= 30) return { label: 'Al día', variant: 'success' }
  if (ageDays <= 180) return { label: 'Control pendiente', variant: 'warning' }
  return { label: 'Sin control', variant: 'destructive' }
}

// =====================================================================
// Subcomponentes locales (presentacionales, sin estado)
// =====================================================================

function InfoChip({
  Icon,
  label,
  value,
}: {
  Icon: typeof Scale
  label: string
  value: string
}) {
  return (
    <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground font-normal">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </Badge>
  )
}

function StatCard({
  Icon,
  title,
  items,
  emptyText,
  iconTone,
}: {
  Icon: typeof Syringe
  title: string
  items: string[]
  emptyText: string
  iconTone: string
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((label, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-foreground/90"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                <span className="leading-snug">{label}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineRow({ item }: { item: PetHistoryItem }) {
  const meta = itemMeta[item.type]
  const Icon = meta.Icon
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {/* Línea vertical */}
      <div className="relative flex flex-col items-center">
        <div
          className={`z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background ring-2 ${meta.ring}`}
        >
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
        </div>
        <div className="absolute top-7 h-full w-px bg-border last:hidden" />
      </div>
      {/* Contenido */}
      <div className="flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">
            {formatDate(item.date)}
          </span>
          <Badge variant={meta.badge} className="gap-1">
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm leading-snug text-foreground/90">
          {item.description}
        </p>
        {item.professional && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {item.professional}
          </p>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// Página
// =====================================================================

export function PetDetailView({ audience = 'client' }: { audience?: 'client' | 'vet' }) {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const tenantId = useAuthStore((state) => state.tenantId ?? 'unknown')
  const petId = params.id as string
  const [editOpen, setEditOpen] = useState(false)
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [consultorioId, setConsultorioId] = useState('')
  const [slot, setSlot] = useState({ startAt: '', endAt: '' })
  const [startError, setStartError] = useState('')
  const pendingConsultationId = useRef<string | number | null>(null)

  const { data: pet, isLoading: loadingPet } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(petId),
    enabled: !!petId,
  })

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['petHistory', petId],
    queryFn: () => getPetHistory(petId),
    enabled: !!petId,
  })

  const availableConsultoriosQuery = useQuery({
    queryKey: ['available-consultorios', tenantId, slot.startAt, slot.endAt],
    queryFn: () => getAvailableConsultorios(slot.startAt, slot.endAt),
    enabled: startDialogOpen && Boolean(slot.startAt && slot.endAt),
    staleTime: 15_000,
  })

  const startConsultationMutation = useMutation({
    mutationFn: async () => {
      if (!pet) throw new Error('No se pudo cargar la mascota.')
      if (!consultorioId) throw new Error('Selecciona un consultorio disponible.')

      let consultationId = pendingConsultationId.current
      if (!consultationId) {
        const consultation = await openConsultation({
          clientId: pet.clientId,
          petId: pet.id,
        })
        consultationId = consultation.id
        pendingConsultationId.current = consultationId
      }

      await setVeterinarianAvailability({ available: false })
      const assigned = await assignConsultorio(consultationId, {
        consultorioId: Number(consultorioId),
        startAt: slot.startAt,
        endAt: slot.endAt,
      })
      pendingConsultationId.current = null
      return assigned
    },
    onSuccess: async (consultation) => {
      setStartDialogOpen(false)
      toast.success('Atención iniciada correctamente.')
      queryClient.setQueryData(['consultation', String(consultation.id)], consultation)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consultations-open'] }),
        queryClient.invalidateQueries({ queryKey: ['my-consultations'] }),
        queryClient.invalidateQueries({ queryKey: ['veterinarian-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['available-consultorios'] }),
        queryClient.invalidateQueries({ queryKey: ['petHistory', petId] }),
        queryClient.invalidateQueries({ queryKey: ['pet-history', tenantId, Number(petId)] }),
      ])
      router.push(`/workstation/vet/consultas/${consultation.id}`)
    },
    onError: (error) => {
      setStartError(error instanceof Error ? error.message : 'No se pudo iniciar la atención. Revisa el consultorio e inténtalo de nuevo.')
    },
  })

  const openStartDialog = () => {
    const start = new Date()
    const end = new Date(start.getTime() + 60 * 60_000)
    setSlot({ startAt: start.toISOString(), endAt: end.toISOString() })
    setConsultorioId('')
    setStartError('')
    setStartDialogOpen(true)
  }

  // Derivados puros (memorizados) ---------------------------------------
  const derived = useMemo(() => {
    const age = computeAge(pet?.birthDate)
    const status = statusFromHistory(history)
    const consultations = history?.consultations ?? []
    const vaccinations = history?.vaccinations ?? []
    const sales = history?.sales ?? []
    const studies = history?.studies ?? []

    // Notas clínicas recientes = últimas 3 descripciones de eventos clínicos
    const clinicalNotes = [...consultations, ...studies]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 3)
      .map((n) => `${formatDate(n.date)} — ${n.description}`)

    // El backend actual no expone módulos de alergias / medicamentos /
    // cirugías; los derivamos de los eventos disponibles para mantener
    // la página útil sin inventar datos.
    const allergies: string[] = [] // pendiente de endpoint dedicado
    const activeMedications: string[] = [] // pendiente de endpoint dedicado
    const surgeries: string[] = sales
      .filter((s) => /cirug|quir|surger/i.test(s.description))
      .map((s) => s.description)

    const timeline = [...consultations, ...vaccinations, ...studies, ...sales]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 8)

    return {
      age,
      status,
      allergies,
      activeMedications,
      surgeries,
      vaccinations,
      clinicalNotes,
      timeline,
    }
  }, [pet?.birthDate, history])

  // Estados de carga / vacío -------------------------------------------
  if (loadingPet) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Cargando mascota…</p>
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="space-y-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          Mascota no encontrada
        </p>
        <div className="flex justify-center">
          <Link href={audience === 'vet' ? '/workstation/vet/cola' : '/workstation/user/mascotas'}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const initials = pet.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar
                size="lg"
                className="h-16 w-16 ring-2 ring-primary/15"
              >
                <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                  {initials || <PawPrint className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {pet.name}
                  </h1>
                  <Badge variant={derived.status.variant} className="gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    {derived.status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pet.species}
                  {pet.breed ? ` · ${pet.breed}` : ''}
                  {pet.client?.name ? ` · Tutor: ${pet.client.name}` : ''}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <InfoChip
                    Icon={Cake}
                    label="Edad"
                    value={derived.age}
                  />
                  <InfoChip
                    Icon={Scale}
                    label="Peso"
                    value={pet.weight ? `${pet.weight} kg` : '—'}
                  />
                  <InfoChip
                    Icon={PawPrint}
                    label="Especie"
                    value={pet.species}
                  />
                </div>
              </div>
            </div>
              {audience === 'client' ? <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
              <Link href={`/workstation/user/consultas/nuevo?petId=${pet.id}`}>
                <Button>
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Nueva Consulta
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Link
                href={`/workstation/user/mascotas/${petId}/carnet`}
              >
                <Button variant="outline">
                  <IdCard className="mr-2 h-4 w-4" />
                  Ver Carnet
                </Button>
              </Link>
            </div> : <Button onClick={openStartDialog}>
              <Stethoscope className="mr-2 h-4 w-4" />
              Iniciar nueva atención
            </Button>}
          </div>
        </CardContent>
      </Card>

      {/* ===== Grid de salud ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          Icon={AlertTriangle}
          title="Alertas / Alergias"
          items={derived.allergies}
          emptyText="Sin alergias registradas"
          iconTone="bg-rose-50 text-rose-600"
        />
        <StatCard
          Icon={Syringe}
          title="Vacunas"
          items={derived.vaccinations.map((v) => v.description)}
          emptyText="Sin vacunas registradas"
          iconTone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          Icon={Pill}
          title="Medicamentos Activos"
          items={derived.activeMedications}
          emptyText="Sin medicamentos activos"
          iconTone="bg-blue-50 text-blue-600"
        />
        <StatCard
          Icon={Scissors}
          title="Cirugías"
          items={derived.surgeries}
          emptyText="Sin cirugías registradas"
          iconTone="bg-violet-50 text-violet-600"
        />
      </div>

      {/* ===== Notas clínicas + Timeline ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Notas Clínicas Recientes */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <FileText className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold">
                  Notas Clínicas Recientes
                </CardTitle>
                <CardDescription className="text-xs">
                  Últimos eventos clínicos registrados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {derived.clinicalNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin notas clínicas registradas
              </p>
            ) : (
              <ul className="space-y-3">
                {derived.clinicalNotes.map((note, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border bg-muted/30 px-3 py-2 text-sm leading-snug text-foreground/90"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Timeline de Consultas Recientes */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold">
                  Consultas Recientes
                </CardTitle>
                <CardDescription className="text-xs">
                  Eventos clínicos ordenados por fecha
                </CardDescription>
              </div>
            </div>
            <Badge variant="neutral" className="font-normal">
              {derived.timeline.length}{' '}
              {derived.timeline.length === 1 ? 'evento' : 'eventos'}
            </Badge>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {loadingHistory ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Cargando historial…
              </p>
            ) : derived.timeline.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No hay consultas registradas
              </p>
            ) : (
              <div className="space-y-0">
                {derived.timeline.map((item, idx) => (
                  <TimelineRow
                    key={`${item.date}-${idx}`}
                    item={item}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Acciones inferiores ===== */}
        <div className="flex items-center justify-between">
          <Link href={audience === 'vet' ? '/workstation/vet/cola' : '/workstation/user/mascotas'}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al listado
          </Button>
        </Link>
        <span className="text-xs text-muted-foreground">ID #{pet.id}</span>
      </div>

        {audience === 'client' && <EditPetDialog
          pet={pet}
          open={editOpen}
          onOpenChange={setEditOpen}
        />}

        <Dialog
          open={startDialogOpen}
          onOpenChange={(open) => {
            if (!open && pendingConsultationId.current) return
            setStartDialogOpen(open)
          }}
        >
          <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="size-5 text-primary" />
                Iniciar atención
              </DialogTitle>
              <DialogDescription>
                Selecciona un consultorio disponible para atender a {pet.name}. La reserva será por una hora.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label htmlFor="available-consultorio" className="text-sm font-medium">
                Consultorio disponible
              </label>
              {availableConsultoriosQuery.isLoading ? (
                <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Buscando consultorios disponibles...
                </div>
              ) : availableConsultoriosQuery.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p>No se pudieron cargar los consultorios.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void availableConsultoriosQuery.refetch()}>
                    <RefreshCw className="mr-2 size-4" />Reintentar
                  </Button>
                </div>
              ) : (availableConsultoriosQuery.data?.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No hay consultorios disponibles para la próxima hora.
                </p>
              ) : (
                <select
                  id="available-consultorio"
                  value={consultorioId}
                  onChange={(event) => setConsultorioId(event.target.value)}
                  disabled={startConsultationMutation.isPending}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar consultorio...</option>
                  {availableConsultoriosQuery.data?.map((consultorio) => (
                    <option key={consultorio.id} value={consultorio.id}>
                      {consultorio.name}{consultorio.size ? ` · ${consultorio.size}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {startError && <p role="alert" className="text-sm text-destructive">{startError}</p>}
              {pendingConsultationId.current && (
                <p className="text-xs text-muted-foreground">
                  La atención ya fue creada. Elige un consultorio para completar la asignación sin duplicarla.
                </p>
              )}
            </div>

            <DialogFooter>
              {pendingConsultationId.current && !startConsultationMutation.isPending && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push(`/workstation/vet/consultas/${pendingConsultationId.current}`)}
                >
                  Continuar sin consultorio
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setStartDialogOpen(false)}
                disabled={startConsultationMutation.isPending || Boolean(pendingConsultationId.current)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => startConsultationMutation.mutate()}
                disabled={!consultorioId || startConsultationMutation.isPending || availableConsultoriosQuery.isLoading || availableConsultoriosQuery.isError}
              >
                {startConsultationMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {startConsultationMutation.isPending ? 'Iniciando...' : pendingConsultationId.current ? 'Reintentar asignación' : 'Iniciar atención'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
