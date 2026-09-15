'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, CreditCard, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { getMonthlySubscriptionSummary } from '@/lib/api/subscriptions'
import { ApiError } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const money = (value: number) => new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
  maximumFractionDigits: 0,
}).format(value || 0)

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function SubscriptionCollectionPage() {
  const { user } = useAuthStore()
  const [month, setMonth] = useState(currentMonth)
  const clinicId = user?.role === 'SUPER_ADMIN' ? user.clinics?.[0]?.id : undefined
  const query = useQuery({
    queryKey: ['subscription-monthly-summary', month, clinicId],
    queryFn: () => getMonthlySubscriptionSummary(month, clinicId),
    enabled: !!month && (user?.role !== 'SUPER_ADMIN' || !!clinicId),
  })

  const summary = query.data
  const statusRows = useMemo<Array<[string, number, 'success' | 'warning' | 'neutral']>>(() => summary ? [
    ['Activas', summary.activeSubscriptions, 'success' as const],
    ['Suspendidas', summary.suspendedSubscriptions, 'warning' as const],
    ['Expiradas', summary.expiredSubscriptions, 'neutral' as const],
    ['Canceladas', summary.cancelledSubscriptions, 'neutral' as const],
  ] : [], [summary])

  return <div className='space-y-6'>
    <div className='flex flex-wrap items-start justify-between gap-4'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Cobranza de suscripciones</h1>
        <p className='text-sm text-muted-foreground'>Controla lo esperado, lo cobrado y los vencimientos del período.</p>
      </div>
      <label className='flex items-center gap-2 text-sm font-medium'>
        <CalendarDays className='size-4 text-muted-foreground' />
        <span className='sr-only'>Mes del resumen</span>
        <Input type='month' value={month} onChange={(event) => setMonth(event.target.value)} className='w-40' />
      </label>
    </div>

    {user?.role === 'SUPER_ADMIN' && !clinicId && <Notice message='Selecciona una clínica para consultar la cobranza.' />}
    {query.isError && <Notice message={query.error instanceof ApiError ? query.error.message : 'No se pudo cargar el resumen de cobranza.'} />}
    {query.isLoading && <div className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' />Cargando resumen...</div>}
    {summary && <>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <Metric title='Esperado' value={money(summary.expectedAmount)} detail={`${summary.expectedCount} cuotas`} icon={CreditCard} />
        <Metric title='Cobrado' value={money(summary.collectedAmount)} detail={`${summary.collectedCount} cuotas`} icon={CheckCircle2} tone='success' />
        <Metric title='Pendiente' value={money(summary.pendingAmount)} detail={`${summary.pendingCount} cuotas`} icon={Clock3} tone='warning' />
        <Metric title='Vencido' value={money(summary.overdueAmount)} detail={`${summary.overdueCount} cuotas`} icon={AlertCircle} tone='danger' />
      </div>
      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader><CardTitle>Rendimiento del período</CardTitle><CardDescription>Porcentaje cobrado sobre las cuotas con vencimiento en {summary.month}.</CardDescription></CardHeader>
          <CardContent>
            <div className='flex items-end justify-between gap-4'><div><p className='text-4xl font-semibold tracking-tight'>{summary.collectionPercentage.toFixed(1)}%</p><p className='mt-1 text-sm text-muted-foreground'>Índice de cobranza</p></div><Badge variant={summary.collectionPercentage >= 80 ? 'success' : 'warning'}>{summary.collectionPercentage >= 80 ? 'En objetivo' : 'Requiere seguimiento'}</Badge></div>
            <div className='mt-6 h-3 overflow-hidden rounded-full bg-muted'><div className='h-full rounded-full bg-emerald-600 transition-[width]' style={{ width: `${Math.min(summary.collectionPercentage, 100)}%` }} /></div>
            <div className='mt-3 flex justify-between text-xs text-muted-foreground'><span>{money(summary.collectedAmount)} cobrados</span><span>{money(summary.expectedAmount)} esperados</span></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Estado de suscripciones</CardTitle><CardDescription>Distribución actual de la cartera.</CardDescription></CardHeader><CardContent className='space-y-3'>{statusRows.map(([label, value, variant]) => <div key={label} className='flex items-center justify-between rounded-lg border px-3 py-2.5'><span className='text-sm'>{label}</span><Badge variant={variant}>{value}</Badge></div>)}</CardContent></Card>
      </div>
    </>}
  </div>
}

function Metric({ title, value, detail, icon: Icon, tone = 'default' }: { title: string; value: string; detail: string; icon: typeof CreditCard; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const colors = { default: 'text-foreground', success: 'text-emerald-700', warning: 'text-amber-700', danger: 'text-rose-700' }
  return <Card><CardContent className='flex items-start justify-between gap-3'><div><p className='text-sm text-muted-foreground'>{title}</p><p className={`mt-1 text-2xl font-semibold tracking-tight ${colors[tone]}`}>{value}</p><p className='mt-1 text-xs text-muted-foreground'>{detail}</p></div><Icon className={`size-5 ${colors[tone]}`} /></CardContent></Card>
}

function Notice({ message }: { message: string }) {
  return <div role='alert' className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>{message}</div>
}
