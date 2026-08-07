'use client'

import { useApiLoader } from '@/lib/hooks/useApiLoader'
import {
  getDashboardMetrics,
  type ClinicMetrics,
  type ClinicWithMetrics,
  type DashboardMetrics,
} from '@/lib/api/admin'
import { Skeleton } from '@/components/ui/skeleton'

const formatCurrency = (value: number, currency = 'UYU') => {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export default function SuperAdminDashboardPage() {
  const { user } = useAuthStoreSafe()
  const { state, reload } = useApiLoader<DashboardMetrics>(getDashboardMetrics)

  if (state.status === 'loading') {
    return <DashboardSkeleton />
  }

  if (state.status === 'error') {
    return (
      <div className='space-y-6'>
        <h2 className='text-2xl font-bold'>Dashboard Global</h2>
        <p className='text-gray-600'>Bienvenido, {user?.username}</p>
        <div
          role='alert'
          className='bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex flex-col gap-3'
        >
          <div>
            <p className='font-semibold'>No se pudieron cargar las metricas</p>
            <p className='text-sm'>{state.message}</p>
          </div>
          <button
            onClick={reload}
            className='self-start px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 hover:bg-red-100'
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const data = state.data
  const isOrgScope = data.scope === 'organization'
  const isEmpty = data.totals.clinicsCount === 0

  if (isEmpty) {
    return (
      <div className='space-y-6'>
        <h2 className='text-2xl font-bold'>Dashboard Global</h2>
        <p className='text-gray-600'>Bienvenido, {user?.username}</p>
        <div className='bg-white border rounded-lg p-10 text-center'>
          <p className='text-lg font-semibold text-gray-800'>
            Aun no hay clinicas para mostrar
          </p>
          <p className='text-sm text-gray-600 mt-1'>
            Cree una clinica desde la seccion Clinicas para empezar a ver metricas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Dashboard Global</h2>
        <p className='text-gray-600'>
          Bienvenido, {user?.username} - {data.organization.name}
        </p>
        <p className='text-xs text-gray-500'>
          Zona horaria: {data.organization.timezone} - Ventas del dia calculadas al cierre de la caja.
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <KpiCard
          title='Clinicas activas'
          value={String(data.totals.clinicsCount)}
          subtitle='En la organizacion'
          color='text-blue-600'
        />
        <KpiCard
          title='Ventas de hoy'
          value={formatCurrency(data.totals.salesTodayTotal)}
          subtitle={`${data.totals.salesTodayCount} operaciones`}
          color='text-yellow-600'
        />
        <KpiCard
          title='Consultas abiertas'
          value={String(data.totals.openConsultations)}
          subtitle='En curso ahora mismo'
          color='text-indigo-600'
        />
        <KpiCard
          title='Clientes activos'
          value={String(data.totals.activeClients)}
          subtitle={`${data.totals.activePets} mascotas activas`}
          color='text-green-600'
        />
      </div>

      {data.clinics.length > 0 && (
        <ClinicsTable clinics={data.clinics} showInactive={false} />
      )}

      <p className='text-xs text-gray-400'>
        Actualizado: {new Date(data.generatedAt).toLocaleString('es-UY')}
      </p>
    </div>
  )
}

function ClinicsTable({
  clinics,
  showInactive = false,
}: {
  clinics: ClinicWithMetrics[]
  showInactive?: boolean
}) {
  const visible = showInactive ? clinics : clinics.filter(c => c.metrics)
  if (visible.length === 0) return null

  return (
    <div className='bg-white border rounded-lg overflow-hidden'>
      <div className='px-4 py-3 border-b'>
        <h3 className='text-lg font-semibold'>Comparativa por clinica</h3>
        <p className='text-xs text-gray-500'>{visible.length} clinicas</p>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 text-left'>
            <tr>
              <th className='px-4 py-2 font-medium'>Clinica</th>
              <th className='px-4 py-2 font-medium text-right'>Ventas hoy</th>
              <th className='px-4 py-2 font-medium text-right'>Consultas abiertas</th>
              <th className='px-4 py-2 font-medium text-right'>Cerradas hoy</th>
              <th className='px-4 py-2 font-medium text-right'>Clientes</th>
              <th className='px-4 py-2 font-medium text-right'>Mascotas</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id} className='border-t'>
                <td className='px-4 py-2 font-medium'>
                  {c.name}
                  {c.isDefault && (
                    <span className='ml-2 text-xs text-gray-500'>(default)</span>
                  )}
                </td>
                <td className='px-4 py-2 text-right'>
                  {formatCurrency(c.metrics ? c.metrics.salesToday.total : 0)}
                </td>
                <td className='px-4 py-2 text-right'>{c.metrics?.openConsultations ?? 0}</td>
                <td className='px-4 py-2 text-right'>{c.metrics?.closedConsultationsToday ?? 0}</td>
                <td className='px-4 py-2 text-right'>{c.metrics?.activeClients ?? 0}</td>
                <td className='px-4 py-2 text-right'>{c.metrics?.activePets ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string
  value: string
  subtitle: string
  color: string
}) {
  return (
    <div className='bg-white p-6 rounded-lg shadow-sm border'>
      <h3 className='text-sm font-medium text-gray-600'>{title}</h3>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      <p className='text-xs text-gray-500 mt-1'>{subtitle}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-64' />
        <Skeleton className='h-4 w-48 mt-2' />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className='bg-white p-6 rounded-lg shadow-sm border space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-8 w-20' />
            <Skeleton className='h-3 w-32' />
          </div>
        ))}
      </div>
    </div>
  )
}

// Wrapper para evitar import en modulo 'use client' de algo que rompe el linter.
import { useAuthStore } from '@/lib/auth-store'
function useAuthStoreSafe() {
  return useAuthStore()
}
