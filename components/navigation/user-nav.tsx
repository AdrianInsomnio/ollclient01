'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { logoutRemote } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'

export function UserNav() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    try {
      await logoutRemote()
    } finally {
      await logout()
      router.push('/login')
    }
  }

  return (
    <div className='flex items-center justify-end border-b border-gray-100 bg-white px-6 py-2'>
      <div className='flex items-center gap-3'>
        <div className='hidden text-right sm:block'>
          <p className='text-sm font-medium text-gray-900'>{user?.username || 'Usuario'}</p>
          <p className='text-xs text-gray-500'>{user?.email || ''}</p>
        </div>
        <Button type='button' variant='ghost' size='sm' onClick={() => void handleLogout()}>
          <LogOut className='mr-2 size-4' />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
