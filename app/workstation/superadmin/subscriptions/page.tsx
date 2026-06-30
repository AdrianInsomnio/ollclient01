'use client'

  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
  import {
    getSuperAdminSubscriptions,
    createSuperAdminSubscription,
    updateSuperAdminSubscription,
    deleteSuperAdminSubscription,
    getSuperAdminSubscriptionsByOrganization,
    type Subscription,
    type CreateSubscriptionPayload,
    type UpdateSubscriptionPayload,
  } from '@/lib/api/superadmin'
  import { Button } from '@/components/ui/button'
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from
  '@/components/ui/dialog'
  import { Input } from '@/components/ui/input'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
  from '@/components/ui/table'
  import { Edit, Trash2, Plus, Calendar, CreditCard } from 'lucide-react'
  import { useState } from 'react'

  export default function SuperAdminSubscriptionsPage() {
    const queryClient = useQueryClient()
    const { data: subs = [], isLoading, isError } = useQuery({
      queryKey: ['superadmin-subscriptions'],
      queryFn: getSuperAdminSubscriptions,
    })

    /* ---------- CREATE ---------- */
    const [createOpen, setCreateOpen] = useState(false)
    const [createPlanId, setCreatePlanId] = useState('')
    const [createOrgId, setCreateOrgId] = useState('')
    const [createStartDate, setStartDate] = useState('')
    const [createEndDate, setEndDate] = useState('')
    const [createIsActive, setIsActive] = useState(true)
    const [createPaymentMethod, setPaymentMethod] = useState('')

    const createMutation = useMutation({
      mutationFn: (data: CreateSubscriptionPayload) =>
        createSuperAdminSubscription(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['superadmin-subscriptions'] })
        setCreateOpen(false)
        // reset form
        setCreatePlanId('')
        setCreateOrgId('')
        setStartDate('')
        setEndDate('')
        setIsActive(true)
        setPaymentMethod('')
      },
    })

    /* ---------- UPDATE ---------- */
    const [editOpen, setEditOpen] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)
    const [editPlanId, setEditPlanId] = useState('')
    const [editOrgId, setEditOrgId] = useState('')
    const [editStartDate, setEditStartDate] = useState('')
    const [editEndDate, setEditEndDate] = useState('')
    const [editIsActive, setEditIsActive] = useState(false)
    const [editPaymentMethod, setEditPaymentMethod] = useState('')

    const updateMutation = useMutation({
      mutationFn: ({
        id,
        data,
      }: {
        id: number
        data: UpdateSubscriptionPayload
      }) => updateSuperAdminSubscription(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['superadmin-subscriptions'] })
        setEditOpen(false)
      },
    })

    /* ---------- DELETE ---------- */
    const deleteMutation = useMutation({mutationFn: (id: number) => deleteSuperAdminSubscription(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin-subscriptions'] }),
    })

    const handleDelete = (id: number) => {
      if (window.confirm('¿Eliminar esta suscripción?')) {
        deleteMutation.mutate(id)
      }
    }

    if (isLoading) return <p className="text-center py-8">Cargando…</p>
    if (isError) return <p className="text-center text-red-500 py-8">Error al
    cargar las suscripciones</p>

    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Suscripciones</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nueva suscripción
            </Button>
          </div>
        </div>

        {/* ----- CREATE DIALOG ----- */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><button className="hidden" /></DialogTrigger>
          <DialogContent className="w-115">
            <DialogHeader>
              <DialogTitle>Nueva suscripción</DialogTitle>
              <DialogDescription>Asigna un plan a una organización y define las
              fechas de vigencia.</DialogDescription>
            </DialogHeader>
            <form onSubmit={e => {
              e.preventDefault()
              const payload: CreateSubscriptionPayload = {
                planId: parseInt(createPlanId),
                organizationId: parseInt(createOrgId),
                startDate: createStartDate,
                endDate: createEndDate || null,
                isActive: createIsActive,
                paymentMethod: createPaymentMethod || undefined,
              }
              createMutation.mutate(payload)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Plan ID</label>
                  <Input
                    type="number"
                    value={createPlanId}
                    onChange={e => setCreatePlanId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Organización
                  ID</label>
                  <Input
                    type="number"
                    value={createOrgId}
                    onChange={e => setCreateOrgId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Fecha de
                  inicio</label>
                  <Input
                    type="date"
                    value={createStartDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-md">Fecha de fin
                  (opcional)</label>
                  <Input
                    type="date"
                    value={createEndDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={createIsActive}
                      onChange={e => setIsActive(e.target.checked)}
                    />
                    Activo
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium">Método de
                  pago</label>
                  <Input
                    value={createPaymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    placeholder="ej. tarjeta, transferencia"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Crear</Button>
                <Button variant="outline" onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ----- EDIT DIALOG ----- */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild><button className="hidden" /></DialogTrigger>
          <DialogContent className="w-115">
            <DialogHeader>
              <DialogTitle>Editar suscripción</DialogTitle>
              <DialogDescription>Modifica los datos de la suscripción
              seleccionada.</DialogDescription>
            </DialogHeader>
            <form onSubmit={e => {
              e.preventDefault()
              if (editId === null) return
              const payload: UpdateSubscriptionPayload = {}
              if (editPlanId) payload.planId = parseInt(editPlanId)
              if (editOrgId) payload.organizationId = parseInt(editOrgId)
              if (editStartDate) payload.startDate = editStartDate
              if (editEndDate !== '') payload.endDate = editEndDate || null
              if (editIsActive !== undefined) payload.isActive = editIsActive
              if (editPaymentMethod) payload.paymentMethod = editPaymentMethod
              updateMutation.mutate({ id: editId, data: payload })
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Plan ID</label>
                  <Input
                    type="number"
                    value={editPlanId}
                    onChange={e => setEditPlanId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Organización
                  ID</label>
                  <Input
                    type="number"
                    value={editOrgId}
                    onChange={e => setEditOrgId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-md">Fecha de inicio</
                  label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-md">Fecha de fin
                  (opcional)</label>
                  <Input
                    type="date"
                    value={editEndDate}
                    onChange={e => setEditEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={e => setEditIsActive(e.target.checked)}
                    />
                    Activo
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium">Método de
                  pago</label>
                  <Input
                    value={editPaymentMethod}
                    onChange={e => setEditPaymentMethod(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Guardar</Button>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ----- TABLE ----- */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan ID</TableHead>
              <TableHead>Org ID</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.planId}</TableCell>
                <TableCell>{s.organizationId}</TableCell>
                <TableCell>{new Date(s.startDate).toLocaleDateString()}</
                TableCell>
                <TableCell>
                  {s.endDate ? new Date(s.endDate).toLocaleDateString() : ' — '}
                </TableCell>
                <TableCell>{s.isActive ? 'Sí' : 'No'}</TableCell>
                <TableCell>{s.paymentMethod ?? ' — '}</TableCell>
                <TableCell className="flex justify-center space-x-2">
                  <button
                    onClick={() => {
                      setEditId(s.id)
                      setEditPlanId(s.planId.toString())
                      setEditOrgId(s.organizationId.toString())
                      setEditStartDate(s.startDate)
                      setEditEndDate(s.endDate ?? '')
                      setEditIsActive(s.isActive)
                      setEditPaymentMethod(s.paymentMethod ?? '')
                      setEditOpen(true)
                    }}
                    className="hover:text-primary-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }