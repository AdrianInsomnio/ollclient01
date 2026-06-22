'use client'

import { useApiLoader } from '@/lib/hooks/useApiLoader'
import {
  getAdminUsers,
  type UserListResponse,
  type UserListItem,
} from '@/lib/api/admin'
import { useAuthStore } from '@/lib/auth-store'
import { Skeleton } from '@/components/ui/skeleton'

const ROLE_LABELS: Record<UserListItem['role'], string> = {
  USER: 'Asistente',
  VET: 'Veterinario',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Administrador',
}

const ROLE_COLORS: Record<UserListItem['role'], string> = {
  USER: 'bg-gray-100 text-gray-700',
  VET: 'bg-emerald-100 text-emerald-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
}

const formatDate = (iso: string | null) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const formatDateTime = (iso: string | null) => {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SuperAdminUsersPage() {
  const { user } = useAuthStore()
  const { state, reload } = useApiLoader<UserListResponse>(getAdminUsers)

  if (state.status === 'loading') {
    return <UsersSkeleton />
  }

  if (state.status === 'error') {
    return (
      <div className='space-y-6'>
        <h2 className='text-2xl font-bold'>Usuarios Globales</h2>
        <p className='text-gray-600'>Bienvenido, {user?.username}</p>
        <div
          role='alert'
          className='bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex flex-col gap-3'
        >
          <div>
            <p className='font-semibold'>No se pudieron cargar los usuarios</p>
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
  const users = data.users
  const activeCount = users.filter(u => u.isActive).length
  const byRole = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Usuarios Globales</h2>
        <p className='text-gray-600 text-sm'>
          {data.organization.name} - {users.length} usuario{users.length === 1 ? '' : 's'}
          {users.length > 0 && ` (${activeCount} activo${activeCount === 1 ? '' : 's'})`}
        </p>
      </div>

      {users.length === 0 ? (
        <div className='bg-white border rounded-lg p-10 text-center'>
          <p className='text-lg font-semibold text-gray-800'>Aun no hay usuarios</p>
          <p className='text-sm text-gray-600 mt-1'>
            Los usuarios se crean desde el registro o el panel de administracion.
          </p>
        </div>
      ) : (
        <>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            {(['SUPER_ADMIN', 'ADMIN', 'VET', 'USER'] as const).map((role) => {
              const count = byRole[role] || 0
              return (
                <div key={role} className='bg-white border rounded-lg p-4'>
                  <p className='text-xs text-gray-500 uppercase'>{ROLE_LABELS[role]}</p>
                  <p className='text-2xl font-bold mt-1'>{count}</p>
                </div>
              )
            })}
          </div>

          <div className='bg-white rounded-lg shadow-sm border overflow-hidden'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Usuario</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Email</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Rol</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Estado</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Ultimo acceso</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Creado</th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='font-medium text-gray-900'>{u.username}</div>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{u.email}</td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ROLE_COLORS[u.role]}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {u.isActive ? (
                        <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'>
                          Activo
                        </span>
                      ) : (
                        <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700'>
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{formatDateTime(u.lastLogin)}</td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className='text-xs text-gray-400'>
        Actualizado: {new Date(data.generatedAt).toLocaleString('es-UY')}
      </p>
    </div>
  )
}

function UsersSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-48' />
        <Skeleton className='h-4 w-64 mt-2' />
      </div>
      <div className='bg-white rounded-lg shadow-sm border p-6 space-y-3'>
        {[0, 1, 2, 3, 4].map(i => (
          <Skeleton key={i} className='h-10 w-full' />
        ))}
      </div>
    </div>
  )
}
