'use client'

import Link from 'next/link'
import { useApiLoader } from '@/lib/hooks/useApiLoader'
import {
  getAdminClinics,
  type ClinicListResponse,
} from '@/lib/api/admin'
import { useAuthStore } from '@/lib/auth-store'
import { Skeleton } from '@/components/ui/skeleton'
import { ClinicsTable } from '../dashboard/page'

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function SuperAdminClinicsPage() {
  const { user } = useAuthStore()
  const { state, reload } = useApiLoader<ClinicListResponse>(getAdminClinics)

  if (state.status === 'loading') {
    return <ClinicsSkeleton />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title='No se pudieron cargar las clinicas'
        message={state.message}
        onRetry={reload}
        userName={user?.username}
      />
    )
  }

  const data = state.data
  const clinics = data.clinics
  const activeCount = clinics.filter(c => c.isActive).length
  const inactiveCount = clinics.length - activeCount

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold'>Clinicas</h2>
          <p className='text-gray-600 text-sm'>
            {data.organization.name} - {clinics.length} clinica{clinics.length === 1 ? '' : 's'}
            {inactiveCount > 0 && ` (${inactiveCount} inactiva${inactiveCount === 1 ? '' : 's'})`}
          </p>
        </div>
        <Link
          href='/workstation/superadmin/dashboard'
          className='text-sm text-blue-600 hover:underline'
        >
          Ver dashboard
        </Link>
      </div>

      {clinics.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className='bg-white rounded-lg shadow-sm border overflow-hidden'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Nombre</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Estado</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Direccion</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Telefono</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Creada</th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {clinics.map((c) => (
                  <tr key={c.id}>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='font-medium text-gray-900'>{c.name}</div>
                      <div className='text-xs text-gray-500'>{c.email || 'sin email'}</div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {c.isActive ? (
                        <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'>
                          Activa
                        </span>
                      ) : (
                        <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700'>
                          Inactiva
                        </span>
                      )}
                      {c.isDefault && (
                        <span className='ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800'>
                          Default
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{c.address || '-'}</td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{c.phone || '-'}</td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {clinics.some(c => c.metrics) && (
            <ClinicsTable clinics={clinics} showInactive={true} />
          )}
        </>
      )}

      <p className='text-xs text-gray-400'>
        Actualizado: {new Date(data.generatedAt).toLocaleString('es-UY')}
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className='bg-white border rounded-lg p-10 text-center'>
      <p className='text-lg font-semibold text-gray-800'>Aun no hay clinicas</p>
      <p className='text-sm text-gray-600 mt-1'>
        Las clinicas se crean desde el panel de administracion principal. Si esperaba ver datos,
        verifique que su organization tenga al menos una clinica activa.
      </p>
    </div>
  )
}

function ErrorState({
  title,
  message,
  onRetry,
  userName,
}: {
  title: string
  message: string
  onRetry: () => void
  userName?: string
}) {
  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>Clinicas</h2>
      {userName && <p className='text-gray-600'>Bienvenido, {userName}</p>}
      <div
        role='alert'
        className='bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex flex-col gap-3'
      >
        <div>
          <p className='font-semibold'>{title}</p>
          <p className='text-sm'>{message}</p>
        </div>
        <button
          onClick={onRetry}
          className='self-start px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 hover:bg-red-100'
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}

function ClinicsSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-48' />
        <Skeleton className='h-4 w-32 mt-2' />
      </div>
      <div className='bg-white rounded-lg shadow-sm border p-6 space-y-3'>
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className='h-12 w-full' />
        ))}
      </div>
    </div>
  )
}
