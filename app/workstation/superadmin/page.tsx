'use client'

import { useAuthStore } from '@/lib/auth-store'

export default function SuperAdminPage() {
  const { user } = useAuthStore()

  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>Panel Super Administrador</h2>
      <p className='text-gray-600'>Bienvenido, {user?.username}</p>
    </div>
  )
}
