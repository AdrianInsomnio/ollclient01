'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Building2,
  Check,
  CircleAlert,
  Edit3,
  Hammer,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react'

import { ApiError } from '@/lib/api-client'
import {
  addConsultorioEquipment,
  createConsultorio,
  createEquipment,
  getConsultorios,
  getEquipment,
  removeConsultorioEquipment,
  updateConsultorio,
  updateConsultorioEquipment,
  updateConsultorioStatus,
  updateEquipment,
  type Consultorio,
  type ConsultorioEquipment,
  type ConsultorioPayload,
  type ConsultorioStatus,
  type Equipment,
  type EquipmentPayload,
  type EquipmentStatus,
} from '@/lib/api/consultorios'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const consultorioStatusLabels: Record<ConsultorioStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  MAINTENANCE: 'Mantenimiento',
}

const equipmentStatusLabels: Record<EquipmentStatus, string> = {
  AVAILABLE: 'Disponible',
  MAINTENANCE: 'Mantenimiento',
  OUT_OF_SERVICE: 'Fuera de servicio',
}

const emptyConsultorioForm: ConsultorioPayload = { name: '', description: '', size: '' }
const emptyEquipmentForm: EquipmentPayload = { name: '', description: '' }

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 409) {
    return 'No se pudo guardar porque ya existe un registro con esos datos.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function ConsultorioStatusBadge({ status }: { status: ConsultorioStatus }) {
  const variant = status === 'ACTIVE' ? 'success' : status === 'MAINTENANCE' ? 'warning' : 'neutral'
  return <Badge variant={variant}>{consultorioStatusLabels[status]}</Badge>
}

function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const variant = status === 'AVAILABLE' ? 'success' : status === 'MAINTENANCE' ? 'warning' : 'destructive'
  return <Badge variant={variant}>{equipmentStatusLabels[status]}</Badge>
}

function LoadingRows() {
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className='rounded-xl bg-white p-5 ring-1 ring-foreground/10'>
          <div className='animate-pulse space-y-4'>
            <div className='flex justify-between gap-4'>
              <div className='h-5 w-40 rounded bg-muted' />
              <div className='h-5 w-20 rounded-full bg-muted' />
            </div>
            <div className='h-4 w-3/4 rounded bg-muted' />
            <div className='h-16 rounded-lg bg-muted/70' />
            <div className='flex gap-2'>
              <div className='h-8 w-24 rounded bg-muted' />
              <div className='h-8 w-28 rounded bg-muted' />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Building2
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className='rounded-xl border border-dashed bg-white px-6 py-12 text-center'>
      <div className='mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground'>
        <Icon className='size-5' />
      </div>
      <h3 className='text-sm font-semibold'>{title}</h3>
      <p className='mx-auto mt-1 max-w-md text-sm text-muted-foreground'>{description}</p>
      {action && <div className='mt-5'>{action}</div>}
    </div>
  )
}

export function AdminConsultoriosPanel() {
  const [consultorios, setConsultorios] = useState<Consultorio[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const [consultorioDialogOpen, setConsultorioDialogOpen] = useState(false)
  const [editingConsultorio, setEditingConsultorio] = useState<Consultorio | null>(null)
  const [consultorioForm, setConsultorioForm] = useState<ConsultorioPayload>(emptyConsultorioForm)

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusConsultorio, setStatusConsultorio] = useState<Consultorio | null>(null)
  const [statusValue, setStatusValue] = useState<ConsultorioStatus>('ACTIVE')

  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [equipmentForm, setEquipmentForm] = useState<EquipmentPayload>(emptyEquipmentForm)

  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [managedConsultorioId, setManagedConsultorioId] = useState<number | null>(null)
  const [editingAssociation, setEditingAssociation] = useState<ConsultorioEquipment | null>(null)
  const [associationForm, setAssociationForm] = useState({
    equipmentId: '',
    quantity: '1',
    status: 'AVAILABLE' as EquipmentStatus,
    notes: '',
  })

  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setPageError(null)
    try {
      const [consultorioData, equipmentData] = await Promise.all([getConsultorios(), getEquipment()])
      setConsultorios(consultorioData)
      setEquipment(equipmentData)
    } catch (error) {
      setPageError(errorMessage(error, 'No se pudo cargar la configuración de consultorios.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const managedConsultorio = useMemo(
    () => consultorios.find((item) => item.id === managedConsultorioId) ?? null,
    [consultorios, managedConsultorioId],
  )

  const equipmentAssociationCounts = useMemo(() => {
    const counts = new Map<number, number>()
    consultorios.forEach((consultorio) => {
      consultorio.equipment?.forEach((association) => {
        counts.set(association.equipmentId, (counts.get(association.equipmentId) ?? 0) + 1)
      })
    })
    return counts
  }, [consultorios])

  const availableEquipment = useMemo(() => {
    if (!managedConsultorio) return []
    const linkedIds = new Set(managedConsultorio.equipment?.map((item) => item.equipmentId))
    return equipment.filter((item) => item.isActive && !linkedIds.has(item.id))
  }, [equipment, managedConsultorio])

  const openNewConsultorio = () => {
    setEditingConsultorio(null)
    setConsultorioForm({ ...emptyConsultorioForm })
    setConsultorioDialogOpen(true)
  }

  const openEditConsultorio = (consultorio: Consultorio) => {
    setEditingConsultorio(consultorio)
    setConsultorioForm({
      name: consultorio.name,
      description: consultorio.description ?? '',
      size: consultorio.size ?? '',
    })
    setConsultorioDialogOpen(true)
  }

  const openStatusDialog = (consultorio: Consultorio) => {
    setStatusConsultorio(consultorio)
    setStatusValue(consultorio.status)
    setStatusDialogOpen(true)
  }

  const openNewEquipment = () => {
    setEditingEquipment(null)
    setEquipmentForm({ ...emptyEquipmentForm })
    setEquipmentDialogOpen(true)
  }

  const openEditEquipment = (item: Equipment) => {
    setEditingEquipment(item)
    setEquipmentForm({ name: item.name, description: item.description ?? '' })
    setEquipmentDialogOpen(true)
  }

  const openManageEquipment = (consultorio: Consultorio) => {
    setManagedConsultorioId(consultorio.id)
    setEditingAssociation(null)
    setAssociationForm({ equipmentId: '', quantity: '1', status: 'AVAILABLE', notes: '' })
    setManageDialogOpen(true)
  }

  const handleConsultorioSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!consultorioForm.name.trim()) {
      toast.error('El nombre del consultorio es obligatorio.')
      return
    }
    setSubmitting(true)
    try {
      if (editingConsultorio) {
        await updateConsultorio(editingConsultorio.id, {
          name: consultorioForm.name.trim(),
          description: consultorioForm.description?.trim(),
          size: consultorioForm.size?.trim(),
        })
        toast.success('Consultorio actualizado.')
      } else {
        await createConsultorio({
          name: consultorioForm.name.trim(),
          description: consultorioForm.description?.trim(),
          size: consultorioForm.size?.trim(),
        })
        toast.success('Consultorio creado.')
      }
      setConsultorioDialogOpen(false)
      await loadData(true)
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar el consultorio.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!statusConsultorio) return
    setSubmitting(true)
    try {
      await updateConsultorioStatus(statusConsultorio.id, statusValue)
      toast.success('Estado del consultorio actualizado.')
      setStatusDialogOpen(false)
      await loadData(true)
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cambiar el estado.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEquipmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!equipmentForm.name.trim()) {
      toast.error('El nombre del equipamiento es obligatorio.')
      return
    }
    setSubmitting(true)
    try {
      if (editingEquipment) {
        await updateEquipment(editingEquipment.id, {
          name: equipmentForm.name.trim(),
          description: equipmentForm.description?.trim(),
        })
        toast.success('Equipamiento actualizado.')
      } else {
        await createEquipment({
          name: equipmentForm.name.trim(),
          description: equipmentForm.description?.trim(),
        })
        toast.success('Equipamiento creado.')
      }
      setEquipmentDialogOpen(false)
      await loadData(true)
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar el equipamiento.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEquipmentToggle = async (item: Equipment) => {
    setSubmitting(true)
    try {
      await updateEquipment(item.id, { isActive: !item.isActive })
      toast.success(item.isActive ? 'Equipamiento desactivado.' : 'Equipamiento activado.')
      await loadData(true)
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cambiar el estado del equipamiento.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssociationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!managedConsultorio) return
    const equipmentId = Number(associationForm.equipmentId)
    const quantity = Number(associationForm.quantity)
    if (!editingAssociation && !equipmentId) {
      toast.error('Selecciona un equipamiento.')
      return
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error('La cantidad debe ser un entero mayor o igual a 1.')
      return
    }
    setSubmitting(true)
    try {
      if (editingAssociation) {
        await updateConsultorioEquipment(managedConsultorio.id, editingAssociation.equipmentId, {
          quantity,
          status: associationForm.status,
          notes: associationForm.notes.trim(),
        })
        toast.success('Asociación actualizada.')
      } else {
        await addConsultorioEquipment(managedConsultorio.id, {
          equipmentId,
          quantity,
          status: associationForm.status,
          notes: associationForm.notes.trim(),
        })
        toast.success('Equipamiento asociado.')
      }
      setEditingAssociation(null)
      setAssociationForm({ equipmentId: '', quantity: '1', status: 'AVAILABLE', notes: '' })
      await loadData(true)
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar la asociación.'))
    } finally {
      setSubmitting(false)
    }
  }

  const startEditingAssociation = (association: ConsultorioEquipment) => {
    setEditingAssociation(association)
    setAssociationForm({
      equipmentId: String(association.equipmentId),
      quantity: String(association.quantity),
      status: association.status,
      notes: association.notes ?? '',
    })
  }

  const handleRemoveAssociation = async (association: ConsultorioEquipment) => {
    if (!managedConsultorio) return
    if (!window.confirm(`¿Quitar ${association.equipment.name} de ${managedConsultorio.name}?`)) return
    setSubmitting(true)
    try {
      await removeConsultorioEquipment(managedConsultorio.id, association.equipmentId)
      toast.success('Asociación quitada.')
      await loadData(true)
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo quitar la asociación.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='space-y-8'>
        <PageHeader onRefresh={() => undefined} refreshing onNewConsultorio={() => undefined} onNewEquipment={() => undefined} />
        <LoadingRows />
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      <PageHeader
        onRefresh={() => void loadData(true)}
        refreshing={refreshing}
        onNewConsultorio={openNewConsultorio}
        onNewEquipment={openNewEquipment}
      />

      {pageError && (
        <div className='flex items-start justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          <div className='flex items-start gap-3'>
            <CircleAlert className='mt-0.5 size-4 shrink-0' />
            <span>{pageError}</span>
          </div>
          <Button variant='outline' size='sm' onClick={() => void loadData(true)}>Reintentar</Button>
        </div>
      )}

      <section className='space-y-4'>
        <SectionHeading
          icon={Building2}
          title='Consultorios'
          description='Espacios disponibles para organizar la atención de la clínica.'
        />
        {consultorios.length === 0 ? (
          <EmptyState
            icon={Building2}
            title='Todavía no hay consultorios'
            description='Crea el primer espacio para empezar a organizar la atención veterinaria.'
            action={<Button onClick={openNewConsultorio}><Plus /> Nuevo consultorio</Button>}
          />
        ) : (
          <div className='grid gap-4 lg:grid-cols-2'>
            {consultorios.map((consultorio) => (
              <ConsultorioCard
                key={consultorio.id}
                consultorio={consultorio}
                onEdit={() => openEditConsultorio(consultorio)}
                onStatus={() => openStatusDialog(consultorio)}
                onEquipment={() => openManageEquipment(consultorio)}
              />
            ))}
          </div>
        )}
      </section>

      <section className='space-y-4'>
        <SectionHeading
          icon={Package}
          title='Equipamiento'
          description='Catálogo de equipamiento disponible para los consultorios de la clínica.'
        />
        {equipment.length === 0 ? (
          <EmptyState
            icon={Package}
            title='Todavía no hay equipamiento'
            description='Registra elementos como ecógrafos, balanzas o instrumental para asociarlos a los consultorios.'
            action={<Button onClick={openNewEquipment}><Plus /> Nuevo equipamiento</Button>}
          />
        ) : (
          <div className='overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10'>
            <div className='hidden grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_150px_140px_120px] gap-4 border-b bg-muted/30 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid'>
              <span>Nombre</span><span>Descripción</span><span>Estado</span><span>Consultorios</span><span className='text-right'>Acciones</span>
            </div>
            <div className='divide-y'>
              {equipment.map((item) => (
                <EquipmentRow
                  key={item.id}
                  item={item}
                  associationCount={equipmentAssociationCounts.get(item.id) ?? 0}
                  disabled={submitting}
                  onEdit={() => openEditEquipment(item)}
                  onToggle={() => void handleEquipmentToggle(item)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <Dialog open={consultorioDialogOpen} onOpenChange={(open) => !submitting && setConsultorioDialogOpen(open)}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{editingConsultorio ? 'Editar consultorio' : 'Nuevo consultorio'}</DialogTitle>
            <DialogDescription>Completa los datos básicos del espacio. La clínica se determina por tu sesión.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConsultorioSubmit} className='space-y-4'>
            <Field label='Nombre' required>
              <Input autoFocus value={consultorioForm.name} onChange={(event) => setConsultorioForm((current) => ({ ...current, name: event.target.value }))} placeholder='Consultorio 1' />
            </Field>
            <Field label='Descripción'>
              <Textarea value={consultorioForm.description} onChange={(event) => setConsultorioForm((current) => ({ ...current, description: event.target.value }))} placeholder='Consultorio general' rows={3} />
            </Field>
            <Field label='Tamaño'>
              <Input value={consultorioForm.size} onChange={(event) => setConsultorioForm((current) => ({ ...current, size: event.target.value }))} placeholder='12 m²' />
            </Field>
            <DialogFooter>
              <Button type='button' variant='outline' disabled={submitting} onClick={() => setConsultorioDialogOpen(false)}>Cancelar</Button>
              <Button type='submit' disabled={submitting}>{submitting && <Loader2 className='animate-spin' />} {editingConsultorio ? 'Guardar cambios' : 'Crear consultorio'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={(open) => !submitting && setStatusDialogOpen(open)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Cambiar estado</DialogTitle>
            <DialogDescription>{statusConsultorio?.name} dejará de recibir nuevas atenciones si queda inactivo o en mantenimiento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStatusSubmit} className='space-y-4'>
            <Field label='Estado'>
              <select className='h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50' value={statusValue} onChange={(event) => setStatusValue(event.target.value as ConsultorioStatus)}>
                <option value='ACTIVE'>Activo</option>
                <option value='INACTIVE'>Inactivo</option>
                <option value='MAINTENANCE'>Mantenimiento</option>
              </select>
            </Field>
            <DialogFooter>
              <Button type='button' variant='outline' disabled={submitting} onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
              <Button type='submit' disabled={submitting}>{submitting && <Loader2 className='animate-spin' />} Confirmar cambio</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={equipmentDialogOpen} onOpenChange={(open) => !submitting && setEquipmentDialogOpen(open)}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{editingEquipment ? 'Editar equipamiento' : 'Nuevo equipamiento'}</DialogTitle>
            <DialogDescription>El equipamiento pertenece a la clínica y puede asociarse a uno o más consultorios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEquipmentSubmit} className='space-y-4'>
            <Field label='Nombre' required>
              <Input autoFocus value={equipmentForm.name} onChange={(event) => setEquipmentForm((current) => ({ ...current, name: event.target.value }))} placeholder='Ecógrafo' />
            </Field>
            <Field label='Descripción'>
              <Textarea value={equipmentForm.description} onChange={(event) => setEquipmentForm((current) => ({ ...current, description: event.target.value }))} placeholder='Ecógrafo portátil' rows={3} />
            </Field>
            <DialogFooter>
              <Button type='button' variant='outline' disabled={submitting} onClick={() => setEquipmentDialogOpen(false)}>Cancelar</Button>
              <Button type='submit' disabled={submitting}>{submitting && <Loader2 className='animate-spin' />} {editingEquipment ? 'Guardar cambios' : 'Crear equipamiento'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={(open) => !submitting && setManageDialogOpen(open)}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Gestionar equipamiento</DialogTitle>
            <DialogDescription>{managedConsultorio?.name} · agrega, edita o quita asociaciones.</DialogDescription>
          </DialogHeader>

          <div className='space-y-3'>
            {managedConsultorio?.equipment?.length ? managedConsultorio.equipment.map((association) => (
              <div key={association.id} className='flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <p className='truncate text-sm font-medium'>{association.equipment.name}</p>
                    <EquipmentStatusBadge status={association.status} />
                  </div>
                  <p className='mt-1 text-xs text-muted-foreground'>Cantidad: {association.quantity}{association.notes ? ` · ${association.notes}` : ''}</p>
                </div>
                <div className='flex shrink-0 gap-2'>
                  <Button type='button' variant='outline' size='sm' onClick={() => startEditingAssociation(association)}><Edit3 /> Editar</Button>
                  <Button type='button' variant='ghost' size='sm' disabled={submitting} onClick={() => void handleRemoveAssociation(association)}><Trash2 /> Quitar</Button>
                </div>
              </div>
            )) : (
              <div className='rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground'>Este consultorio todavía no tiene equipamiento asociado.</div>
            )}
          </div>

          <form onSubmit={handleAssociationSubmit} className='space-y-4 rounded-xl border bg-background p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h3 className='text-sm font-semibold'>{editingAssociation ? 'Editar asociación' : 'Agregar equipamiento'}</h3>
                <p className='text-xs text-muted-foreground'>El equipamiento global no se elimina al quitarlo aquí.</p>
              </div>
              {editingAssociation && <Button type='button' variant='ghost' size='sm' onClick={() => { setEditingAssociation(null); setAssociationForm({ equipmentId: '', quantity: '1', status: 'AVAILABLE', notes: '' }) }}>Cancelar edición</Button>}
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label='Equipamiento' required>
                <select disabled={Boolean(editingAssociation)} className='h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60' value={associationForm.equipmentId} onChange={(event) => setAssociationForm((current) => ({ ...current, equipmentId: event.target.value }))}>
                  <option value=''>Selecciona un equipo</option>
                  {availableEquipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  {editingAssociation && <option value={editingAssociation.equipmentId}>{editingAssociation.equipment.name}</option>}
                </select>
              </Field>
              <Field label='Cantidad' required>
                <Input type='number' min={1} step={1} value={associationForm.quantity} onChange={(event) => setAssociationForm((current) => ({ ...current, quantity: event.target.value }))} />
              </Field>
              <Field label='Estado'>
                <select className='h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50' value={associationForm.status} onChange={(event) => setAssociationForm((current) => ({ ...current, status: event.target.value as EquipmentStatus }))}>
                  <option value='AVAILABLE'>Disponible</option>
                  <option value='MAINTENANCE'>Mantenimiento</option>
                  <option value='OUT_OF_SERVICE'>Fuera de servicio</option>
                </select>
              </Field>
              <Field label='Notas'>
                <Input value={associationForm.notes} onChange={(event) => setAssociationForm((current) => ({ ...current, notes: event.target.value }))} placeholder='Equipo portátil' />
              </Field>
            </div>
            <div className='flex justify-end'>
              <Button type='submit' disabled={submitting || (!editingAssociation && availableEquipment.length === 0)}>{submitting && <Loader2 className='animate-spin' />} {editingAssociation ? 'Guardar asociación' : 'Agregar asociación'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PageHeader({
  onRefresh,
  refreshing,
  onNewConsultorio,
  onNewEquipment,
}: {
  onRefresh: () => void
  refreshing: boolean
  onNewConsultorio: () => void
  onNewEquipment: () => void
}) {
  return (
    <div className='flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between'>
      <div>
        <div className='mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
          <Settings2 className='size-3.5' /> Configuración de clínica
        </div>
        <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Consultorios</h1>
        <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>Administra los consultorios, su estado y el equipamiento disponible.</p>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button variant='outline' size='sm' onClick={onNewEquipment}><Plus /> Nuevo equipamiento</Button>
        <Button size='sm' onClick={onNewConsultorio}><Plus /> Nuevo consultorio</Button>
        <Button variant='outline' size='sm' onClick={onRefresh} disabled={refreshing} aria-label='Actualizar datos'>
          <RefreshCw className={cn(refreshing && 'animate-spin')} /> Actualizar
        </Button>
      </div>
    </div>
  )
}

function SectionHeading({ icon: Icon, title, description }: { icon: typeof Building2; title: string; description: string }) {
  return (
    <div className='flex items-start gap-3'>
      <div className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'><Icon className='size-4' /></div>
      <div><h2 className='text-lg font-semibold'>{title}</h2><p className='text-sm text-muted-foreground'>{description}</p></div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className='space-y-2'><Label>{label}{required && <span className='ml-1 text-destructive'>*</span>}</Label>{children}</div>
}

function ConsultorioCard({
  consultorio,
  onEdit,
  onStatus,
  onEquipment,
}: {
  consultorio: Consultorio
  onEdit: () => void
  onStatus: () => void
  onEquipment: () => void
}) {
  const equipmentNames = consultorio.equipment?.slice(0, 3).map((item) => item.equipment.name) ?? []
  const remaining = Math.max((consultorio.equipment?.length ?? 0) - equipmentNames.length, 0)
  return (
    <Card className='gap-0 py-0'>
      <CardHeader className='border-b px-5 py-4'>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'><CardTitle className='truncate text-base'>{consultorio.name}</CardTitle><CardDescription className='mt-1'>{consultorio.description || 'Sin descripción'}</CardDescription></div>
          <ConsultorioStatusBadge status={consultorio.status} />
        </div>
      </CardHeader>
      <CardContent className='space-y-4 px-5 py-4'>
        <div className='grid grid-cols-2 gap-4 text-sm sm:grid-cols-3'>
          <Meta label='Tamaño' value={consultorio.size || 'Sin indicar'} />
          <Meta label='Equipos' value={String(consultorio.equipment?.length ?? 0)} />
          <Meta label='Actualizado' value={formatDate(consultorio.updatedAt)} />
        </div>
        <div className='flex min-h-8 items-center gap-2 text-xs text-muted-foreground'>
          <Package className='size-3.5 shrink-0' />
          {equipmentNames.length ? <span>{equipmentNames.join(', ')}{remaining > 0 ? ` +${remaining}` : ''}</span> : <span>Sin equipamiento asociado</span>}
        </div>
        <div className='flex flex-wrap gap-2 border-t pt-4'>
          <Button variant='outline' size='sm' onClick={onEdit}><Edit3 /> Editar</Button>
          <Button variant='outline' size='sm' onClick={onStatus}><Hammer /> Estado</Button>
          <Button size='sm' onClick={onEquipment}><Package /> Gestionar equipamiento</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EquipmentRow({
  item,
  associationCount,
  disabled,
  onEdit,
  onToggle,
}: {
  item: Equipment
  associationCount: number
  disabled: boolean
  onEdit: () => void
  onToggle: () => void
}) {
  return (
    <div className='grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_150px_140px_120px] md:items-center md:gap-4'>
      <div className='min-w-0'><p className='truncate text-sm font-medium'>{item.name}</p><p className='text-xs text-muted-foreground md:hidden'>{item.description || 'Sin descripción'}</p></div>
      <p className='hidden truncate text-sm text-muted-foreground md:block'>{item.description || 'Sin descripción'}</p>
      <div><span className='mr-2 text-xs text-muted-foreground md:hidden'>Estado:</span><Badge variant={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'Activo' : 'Inactivo'}</Badge></div>
      <p className='text-sm text-muted-foreground'><span className='mr-2 text-xs md:hidden'>Asociado a:</span>{associationCount} {associationCount === 1 ? 'consultorio' : 'consultorios'}</p>
      <div className='flex justify-start gap-1 md:justify-end'>
        <Button variant='ghost' size='icon-sm' onClick={onEdit} aria-label={`Editar ${item.name}`}><Edit3 /></Button>
        <Button variant='ghost' size='icon-sm' disabled={disabled} onClick={onToggle} aria-label={item.isActive ? `Desactivar ${item.name}` : `Activar ${item.name}`}><Check className={cn(!item.isActive && 'text-muted-foreground')} /></Button>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><p className='text-xs text-muted-foreground'>{label}</p><p className='mt-1 truncate font-medium'>{value}</p></div>
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}
