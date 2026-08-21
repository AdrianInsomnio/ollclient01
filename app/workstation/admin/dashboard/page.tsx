'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { getDashboardMetrics, type DashboardMetrics } from '@/lib/api/admin'
import { ApiError } from '@/lib/api-client'
import { Skeleton } from '@/components/ui/skeleton'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: DashboardMetrics }
  | { status: 'error'; message: string; code?: string }

const formatCurrency = (value: number, currency = 'UYU') => {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  async function fetchMetrics() {
    try {
      const data = await getDashboardMetrics()
      setState({ status: 'ready', data })
    } catch (error) {
      if (error instanceof ApiError) {
        setState({
          status: 'error',
          message:
            error.status === 403
              ? 'No tiene permisos para ver el dashboard.'
              : error.status === 401
                ? 'Sesion expirada. Inicie sesion nuevamente.'
                : error.message || 'No se pudieron cargar las metricas.',
          code: error.code,
        })
      } else {
        setState({
          status: 'error',
          message: 'Error inesperado al cargar las metricas.',
        })
      }
    }
  }



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMetrics()
  }, [])

    if (state.status === 'loading') {
    return <DashboardSkeleton />
  }

  if (state.status === 'error') {
    return (
      <div className='space-y-6'>
        <h2 className='text-2xl font-bold'>Dashboard de Administracion</h2>
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
            onClick={fetchMetrics}
            className='self-start px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 hover:bg-red-100'
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const { data } = state
  const isValidPayload =
    !!data &&
    (data.scope === 'organization' || data.scope === 'clinic') &&
    !!data.organization &&
    !!data.totals &&
    Array.isArray(data.clinics)

  if (!isValidPayload) {
    return (
      <div className='space-y-6'>
        <h2 className='text-2xl font-bold'>Dashboard de Administracion</h2>
        <p className='text-gray-600'>Bienvenido, {user?.username}</p>
        <div
          role='alert'
          className='bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex flex-col gap-3'
        >
          <div>
            <p className='font-semibold'>No se pudieron cargar las metricas</p>
            <p className='text-sm'>
              Respuesta inesperada del servidor. Contacte al administrador.
            </p>
          </div>
          <button
            onClick={fetchMetrics}
            className='self-start px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 hover:bg-red-100'
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const isOrgScope = data.scope === 'organization'
  const isEmpty = data.totals.clinicsCount === 0

  if (isEmpty) {
    return (
      <div className='space-y-6'>
        <h2 className='text-2xl font-bold'>Dashboard de Administracion</h2>
        <p className='text-gray-600'>Bienvenido, {user?.username}</p>
        <div className='bg-white border rounded-lg p-10 text-center'>
          <p className='text-lg font-semibold text-gray-800'>
            Aun no hay datos para mostrar
          </p>
          <p className='text-sm text-gray-600 mt-1'>
            Cuando registres consultas, ventas y mascotas aparecera aqui el resumen del dia.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Dashboard de Administracion</h2>
        <p className='text-gray-600'>
          Bienvenido, {user?.username} - {data.organization.name}
        </p>
        <p className='text-xs text-gray-500'>
          Zona horaria: {data.organization.timezone} - Ventas del dia calculadas al cierre de la caja.
        </p>
      </div>

      {/* Cards principales: agregados del scope */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
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
          color='text-blue-600'
        />
        <KpiCard
          title='Consultas cerradas hoy'
          value={String(data.totals.closedConsultationsToday)}
          subtitle='Cerradas en el dia'
          color='text-indigo-600'
        />
        <KpiCard
          title='Clientes activos'
          value={String(data.totals.activeClients)}
          subtitle={`${data.totals.activePets} mascotas activas`}
          color='text-green-600'
        />
      </div>

      {/* SUPER_ADMIN: tabla comparativa por clinica */}
      {isOrgScope && data.clinics.length > 1 && (
        <div className='bg-white border rounded-lg overflow-hidden'>
          <div className='px-4 py-3 border-b'>
            <h3 className='text-lg font-semibold'>Comparativa por clinica</h3>
            <p className='text-xs text-gray-500'>
              {data.clinics.length} clinicas en {data.organization.name}
            </p>
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
                {data.clinics.map((c) => (
                  <tr key={c.id} className='border-t'>
                    <td className='px-4 py-2 font-medium'>
                      {c.name}
                      {c.isDefault && (
                        <span className='ml-2 text-xs text-gray-500'>(default)</span>
                      )}
                    </td>
                    <td className='px-4 py-2 text-right'>
                      {formatCurrency(c.metrics.salesToday.total)}
                    </td>
                    <td className='px-4 py-2 text-right'>
                      {c.metrics.openConsultations}
                    </td>
                    <td className='px-4 py-2 text-right'>
                      {c.metrics.closedConsultationsToday}
                    </td>
                    <td className='px-4 py-2 text-right'>{c.metrics.activeClients}</td>
                    <td className='px-4 py-2 text-right'>{c.metrics.activePets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className='text-xs text-gray-400'>
        Actualizado: {new Date(data.generatedAt).toLocaleString('es-UY')}
      </p>
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