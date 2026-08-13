'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Settings2, User } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { logoutRemote } from '@/lib/api/auth'
import { SidebarTrigger } from '../ui/sidebar'

export function UserNav() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const settingsPathByRole: Record<string, string> = {
    USER: '/workstation/user/settings',
    VET: '/workstation/vet/settings',
    ADMIN: '/workstation/admin/settings',
    SUPER_ADMIN: '/workstation/superadmin/settings',
  }
  const settingsPath = settingsPathByRole[user?.role || 'USER']

  const handleLogout = async () => {
    await logoutRemote()
    logout()
    router.push('/login')
  }

  return (
    <header className='border-b bg-white px-6 py-3 flex justify-between items-center'>
      <SidebarTrigger/>
      <div className='flex items-center gap-4'>
      <div className='flex items-left gap-2'>
        <User className='w-5 h-5 text-gray-500' />
        <span className='text-sm text-gray-600'>{user?.username || 'Usuario'}</span>
      </div>
      <div className='flex items-center gap-2'>
        <Link
          href={settingsPath}
          className='flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors'
        >
          <Settings2 className='w-4 h-4' />
          <span>Configuración</span>
        </Link>
        <button
          onClick={handleLogout}
          className='flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors'
        >
          <LogOut className='w-4 h-4' />
          <span>Cerrar sesión</span>
        </button>
        </div>
      </div>
    </header>
  )
}
