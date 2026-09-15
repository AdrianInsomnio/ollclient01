'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { getClient, getClientHistory } from '@/lib/api/clients'
import { createVeterinarySubscription, generateSubscriptionInstallments, getClientInstallments, getClientSubscriptionSummary, getMedicalPlans, type SubscriptionInstallment } from '@/lib/api/subscriptions'
import { prepareInstallmentsForPos } from '@/lib/api/sales'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Phone, Mail, MapPin, User, PawPrint, Edit, CreditCard, CalendarClock, ShieldCheck, Loader2 } from 'lucide-react'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const clientId = params.id as string
  const [editOpen, setEditOpen] = useState(false)
  const [chargeOpen, setChargeOpen] = useState(false)
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>([])
  const [sendingToPos, setSendingToPos] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([])
  const [installmentCount, setInstallmentCount] = useState('1')

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    enabled: !!clientId,
  })

  const { data: history } = useQuery({
    queryKey: ['clientHistory', clientId],
    queryFn: () => getClientHistory(clientId),
    enabled: !!clientId,
  })

  const { data: subscriptionSummary, isLoading: loadingSubscription } = useQuery({
    queryKey: ['clientSubscriptionSummary', clientId],
    queryFn: () => getClientSubscriptionSummary(clientId),
    enabled: !!clientId,
  })

  const { data: pendingInstallments = [] } = useQuery({
    queryKey: ['clientInstallments', clientId, 'PENDING'],
    queryFn: () => getClientInstallments(clientId),
    enabled: !!clientId && !!subscriptionSummary?.subscription,
  })

  const { data: availablePlans = [] } = useQuery({
    queryKey: ['medical-plans', 'ACTIVE'],
    queryFn: () => getMedicalPlans(false),
    enabled: assignOpen,
  })

  const selectedTotal = useMemo(
    () => pendingInstallments
      .filter((installment) => selectedInstallments.includes(installment.id))
      .reduce((sum, installment) => sum + Number(installment.totalAmount), 0),
    [pendingInstallments, selectedInstallments],
  )

  const money = (value: number) => new Intl.NumberFormat('es-UY', {
    style: 'currency', currency: 'UYU', maximumFractionDigits: 2,
  }).format(value)
  const date = (value?: string | null) => value
    ? new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium' }).format(new Date(value))
    : '—'
  const statusVariant = (status?: string) => status === 'ACTIVE' || status === 'PAID'
    ? 'success' as const
    : status === 'SUSPENDED' || status === 'PENDING'
      ? 'warning' as const
      : 'neutral' as const
  const periodicityLabel: Record<string, string> = {
    MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual',
  }
  const clientPets = (history?.pets || []).map((pet) => {
    const item = pet as { id: string | number; name: string; species: string }
    return { ...item, id: Number(item.id) }
  })
  const selectedPlan = availablePlans.find((plan) => plan.id === Number(selectedPlanId))
  const toggleInstallment = (installment: SubscriptionInstallment) => {
    setSelectedInstallments((current) => {
      if (current.includes(installment.id)) return current.filter((id) => id !== installment.id)
      const isFuture = new Date(installment.dueDate) > new Date()
      if (isFuture) {
        const futureIds = pendingInstallments
          .filter((item) => current.includes(item.id) && new Date(item.dueDate) > new Date())
          .map((item) => item.id)
        return [...current.filter((id) => !futureIds.includes(id)), installment.id]
      }
      return [...current, installment.id]
    })
  }

  const sendToPos = async () => {
    if (!selectedInstallments.length) return
    setSendingToPos(true)
    try {
      const futureInstallmentId = pendingInstallments.find(
        (item) => selectedInstallments.includes(item.id) && new Date(item.dueDate) > new Date(),
      )?.id
      await prepareInstallmentsForPos({
        clientId: Number(clientId),
        installmentIds: selectedInstallments,
        futureInstallmentId,
      })
      router.push(`/workstation/user/pos?clientId=${clientId}&subscriptionInstallmentIds=${selectedInstallments.join(',')}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron preparar las cuotas.'
      toast.error(message)
    } finally {
      setSendingToPos(false)
    }
  }

  const assignPlan = async () => {
    if (!selectedPlanId) return toast.error('Selecciona un plan veterinario.')
    if (selectedPetIds.length > (selectedPlan?.maxPets || 0)) return toast.error('La cantidad de mascotas supera el límite del plan.')
    setAssigning(true)
    try {
      const created = await createVeterinarySubscription({
        clientId: Number(clientId),
        medicalPlanId: Number(selectedPlanId),
        petIds: selectedPetIds,
      })
      if (created?.id) await generateSubscriptionInstallments(created.id, Math.max(1, Number(installmentCount) || 1))
      await queryClient.invalidateQueries({ queryKey: ['clientSubscriptionSummary', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['clientInstallments', clientId] })
      setAssignOpen(false)
      setSelectedPlanId('')
      setSelectedPetIds([])
      toast.success('Plan asignado y cuotas generadas.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo asignar el plan.')
    } finally {
      setAssigning(false)
    }
  }

  if (loadingClient) {
    return <p className='text-center text-gray-500 py-8'>Cargando...</p>
  }

  if (!client) {
    return (
      <div className='space-y-4'>
        <p className='text-center text-gray-500 py-8'>Cliente no encontrado</p>
        <Link href='/workstation/user/clientes'>
          <Button variant='outline'><ArrowLeft className='h-4 w-4 mr-2' />Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <Link href='/workstation/user/clientes' className='inline-flex'>
          <Button variant='ghost' size='sm'><ArrowLeft className='h-4 w-4 mr-2' />Volver</Button>
        </Link>
        <div className='flex items-center gap-2'>
          {subscriptionSummary?.subscription ? (
            <Button size='sm' variant='outline' onClick={() => setChargeOpen(true)}>
              <CreditCard className='h-4 w-4 mr-2' />Cobrar cuotas
            </Button>
          ) : <Button size='sm' variant='outline' onClick={() => setAssignOpen(true)}><ShieldCheck className='h-4 w-4 mr-2' />Asignar plan</Button>}
          <Button size='sm' onClick={() => setEditOpen(true)}><Edit className='h-4 w-4 mr-2' />Editar</Button>
        </div>
      </div>

      <h1 className='text-2xl font-bold'>{client.name}</h1>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader><CardTitle className='text-lg'>Datos del Cliente</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {client.phone && (
              <div className='flex items-center gap-3'><Phone className='h-4 w-4 text-gray-400' /><span>{client.phone}</span></div>
            )}
            {client.email && (
              <div className='flex items-center gap-3'><Mail className='h-4 w-4 text-gray-400' /><span>{client.email}</span></div>
            )}
            {client.address && (
              <div className='flex items-center gap-3'><MapPin className='h-4 w-4 text-gray-400' /><span>{client.address}</span></div>
            )}
            {client.documentId && (
              <div className='flex items-center gap-3'><User className='h-4 w-4 text-gray-400' /><span>{client.documentId}</span></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className='text-lg'>Estadísticas</CardTitle></CardHeader>
          <CardContent>
            {history?.stats && (
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center p-3 bg-gray-50 rounded-lg'>
                  <p className='text-2xl font-bold'>{history.stats.totalPets}</p><p className='text-xs text-gray-500'>Mascotas</p>
                </div>
                <div className='text-center p-3 bg-gray-50 rounded-lg'>
                  <p className='text-2xl font-bold'>{history.stats.totalSales}</p><p className='text-xs text-gray-500'>Ventas</p>
                </div>
                <div className='text-center p-3 bg-gray-50 rounded-lg'>
                  <p className='text-2xl font-bold'>{history.stats.totalAppointments}</p><p className='text-xs text-gray-500'>Citas</p>
                </div>
                <div className='text-center p-3 bg-gray-50 rounded-lg'>
                  <p className='text-2xl font-bold'></p><p className='text-xs text-gray-500'>Total</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle className='text-lg'>Mascotas</CardTitle>
          <Link href={'/workstation/user/mascotas/nuevo?clientId=' + clientId}>
            <Button size='sm'><PawPrint className='h-4 w-4 mr-2' />Nueva Mascota</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {history?.pets && history.pets.length > 0 ? (
            <div className='divide-y'>
              {history.pets.map((pet: unknown) => {
                const p = pet as { id: string; name: string; species: string; breed?: string }
                return (
                  <Link key={p.id} href={'/workstation/user/mascotas/' + p.id} className='flex items-center justify-between py-3 hover:bg-gray-50'>
                    <div><p className='font-medium'>{p.name}</p><p className='text-sm text-gray-500'>{p.species}</p></div><span>→</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className='text-sm text-gray-500 text-center py-4'>No hay mascotas</p>
          )}
        </CardContent>
      </Card>

      <Card className='overflow-hidden'>
        <CardHeader className='flex flex-row items-start justify-between gap-4 bg-slate-50/70'>
          <div>
            <CardTitle className='flex items-center gap-2 text-lg'><ShieldCheck className='h-5 w-5 text-teal-700' />Cobertura veterinaria</CardTitle>
            <p className='mt-1 text-sm text-slate-500'>Resumen de la suscripción y próximas cuotas.</p>
          </div>
          {subscriptionSummary?.subscription && <Badge variant={statusVariant(subscriptionSummary.subscription.status)}>{subscriptionSummary.subscription.status}</Badge>}
        </CardHeader>
        <CardContent className='p-5'>
          {loadingSubscription ? <p className='text-sm text-slate-500'>Cargando cobertura...</p> : !subscriptionSummary?.subscription ? (
            <div className='flex flex-wrap items-center justify-between gap-3'><p className='text-sm text-slate-500'>Este cliente no tiene una suscripción veterinaria activa.</p><Button variant='outline' onClick={() => setAssignOpen(true)}><ShieldCheck className='mr-2 h-4 w-4' />Asignar plan</Button></div>
          ) : (
            <div className='space-y-5'>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <div><p className='text-xs uppercase tracking-wide text-slate-400'>Plan</p><p className='mt-1 font-semibold text-slate-800'>{subscriptionSummary.subscription.medicalPlan.name}</p></div>
                <div><p className='text-xs uppercase tracking-wide text-slate-400'>Precio contratado</p><p className='mt-1 font-semibold text-slate-800'>{money(Number(subscriptionSummary.subscription.contractedPrice))}</p></div>
                <div><p className='text-xs uppercase tracking-wide text-slate-400'>Periodicidad</p><p className='mt-1 font-semibold text-slate-800'>{periodicityLabel[subscriptionSummary.subscription.periodicity]}</p></div>
                <div><p className='text-xs uppercase tracking-wide text-slate-400'>Próximo vencimiento</p><p className='mt-1 flex items-center gap-1 font-semibold text-slate-800'><CalendarClock className='h-4 w-4 text-teal-700' />{date(subscriptionSummary.nextDueDate)}</p></div>
              </div>
              <div>
                <p className='mb-2 text-xs uppercase tracking-wide text-slate-400'>Mascotas cubiertas</p>
                <div className='flex flex-wrap gap-2'>{subscriptionSummary.subscription.pets.length ? subscriptionSummary.subscription.pets.map(({ pet }) => <Badge key={pet.id} variant='outline'>{pet.name} · {pet.species}</Badge>) : <span className='text-sm text-slate-500'>Sin mascotas asociadas</span>}</div>
              </div>
              <div>
                <div className='mb-2 flex items-center justify-between'><p className='text-xs uppercase tracking-wide text-slate-400'>Últimas cuotas</p><Button variant='ghost' size='sm' onClick={() => setChargeOpen(true)}>Ver cuotas</Button></div>
                <div className='divide-y rounded-lg border border-slate-100'>{subscriptionSummary.installments.length ? subscriptionSummary.installments.map((installment) => <div key={installment.id} className='flex items-center justify-between gap-3 px-3 py-2.5'><div><p className='text-sm font-medium text-slate-700'>{date(installment.periodStart)} — {date(installment.periodEnd)}</p><p className='text-xs text-slate-400'>Vence {date(installment.dueDate)}{installment.paidAt ? ` · Pagada ${date(installment.paidAt)}` : ''}</p></div><div className='flex items-center gap-2'><span className='text-sm font-semibold'>{money(Number(installment.totalAmount))}</span><Badge variant={statusVariant(installment.status)}>{installment.status}</Badge></div></div>) : <p className='px-3 py-4 text-sm text-slate-500'>Aún no hay cuotas generadas.</p>}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader><DialogTitle>Asignar plan veterinario</DialogTitle><DialogDescription>Define la cobertura del cliente y genera sus primeras cuotas.</DialogDescription></DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'><label htmlFor='medical-plan' className='text-sm font-medium'>Plan</label><select id='medical-plan' value={selectedPlanId} onChange={(event) => { setSelectedPlanId(event.target.value); setSelectedPetIds([]) }} className='flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm'><option value=''>Seleccionar plan</option>{availablePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(Number(plan.price))} · hasta {plan.maxPets} mascota(s)</option>)}</select></div>
            <div className='space-y-2'><p className='text-sm font-medium'>Mascotas cubiertas <span className='font-normal text-muted-foreground'>(opcional)</span></p>{clientPets.length ? <div className='space-y-2'>{clientPets.map((pet) => <label key={pet.id} className='flex items-center gap-3 rounded-md border px-3 py-2 text-sm'><Checkbox checked={selectedPetIds.includes(pet.id)} disabled={!selectedPetIds.includes(pet.id) && (!selectedPlan || selectedPetIds.length >= selectedPlan.maxPets)} onCheckedChange={(checked) => setSelectedPetIds((current) => checked ? [...current, pet.id] : current.filter((id) => id !== pet.id))} /><span>{pet.name} · {pet.species}</span></label>)}</div> : <p className='text-sm text-muted-foreground'>Este cliente aún no tiene mascotas.</p>}</div>
            <div className='space-y-2'><label htmlFor='installment-count' className='text-sm font-medium'>Cuotas iniciales</label><Input id='installment-count' type='number' min='1' max='24' value={installmentCount} onChange={(event) => setInstallmentCount(event.target.value)} /><p className='text-xs text-muted-foreground'>Se generan hasta 24 períodos pendientes para comenzar la cobranza.</p></div>
          </div>
          <DialogFooter><Button variant='outline' onClick={() => setAssignOpen(false)} disabled={assigning}>Cancelar</Button><Button onClick={() => void assignPlan()} disabled={assigning || !selectedPlanId}>{assigning && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}Asignar plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chargeOpen} onOpenChange={(open) => { setChargeOpen(open); if (!open) setSelectedInstallments([]) }}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'><CreditCard className='h-5 w-5 text-teal-700' />Cobrar cuotas</DialogTitle>
            <DialogDescription>Selecciona una o varias cuotas pendientes. El POS volverá a validar los importes antes de cobrar.</DialogDescription>
          </DialogHeader>
          <div className='rounded-lg bg-slate-50 px-4 py-3 text-sm'><span className='text-slate-500'>Cliente:</span> <strong>{client.name}</strong>{subscriptionSummary?.subscription && <><span className='mx-2 text-slate-300'>·</span><span className='text-slate-500'>Plan:</span> <strong>{subscriptionSummary.subscription.medicalPlan.name}</strong></>}</div>
          <div className='max-h-[52vh] space-y-2 overflow-y-auto pr-1'>
            {pendingInstallments.length ? pendingInstallments.map((installment) => {
              const isFuture = new Date(installment.dueDate) > new Date()
              const checked = selectedInstallments.includes(installment.id)
              return <label key={installment.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checked ? 'border-teal-300 bg-teal-50/60' : 'border-slate-200 hover:bg-slate-50'}`}>
                <Checkbox checked={checked} onCheckedChange={() => toggleInstallment(installment)} />
                <div className='min-w-0 flex-1'><p className='font-medium text-slate-800'>{date(installment.periodStart)} — {date(installment.periodEnd)} {isFuture && <Badge className='ml-2' variant='info'>Pago adelantado</Badge>}</p><p className='text-xs text-slate-500'>Vencimiento: {date(installment.dueDate)} · Base: {money(Number(installment.amount))}{Number(installment.lateFee) > 0 ? ` · Mora: ${money(Number(installment.lateFee))}` : ''}</p></div><span className='font-semibold text-slate-800'>{money(Number(installment.totalAmount))}</span>
              </label>
            }) : <p className='rounded-lg border border-dashed p-8 text-center text-sm text-slate-500'>No hay cuotas pendientes disponibles.</p>}
          </div>
          <DialogFooter>
            <div className='mr-auto text-left'><p className='text-xs text-slate-500'>{selectedInstallments.length} cuota(s) seleccionada(s)</p><p className='text-lg font-bold text-teal-800'>{money(selectedTotal)}</p></div>
            <Button variant='outline' onClick={() => setChargeOpen(false)}>Cancelar</Button>
            <Button disabled={!selectedInstallments.length || sendingToPos} onClick={() => void sendToPos()}>{sendingToPos && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}Enviar al POS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
