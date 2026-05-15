'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'

export function UserNav() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className='border-b bg-white px-6 py-3 flex justify-between items-center'>
      <div className='flex items-center gap-2'>
        <User className='w-5 h-5 text-gray-500' />
        <span className='text-sm text-gray-600'>{user?.username || 'Usuario'}</span>
      </div>
      <button
        onClick={handleLogout}
        className='flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors'
      >
        <LogOut className='w-4 h-4' />
        <span>Cerrar sesión</span>
      </button>
    </header>
  )
}
