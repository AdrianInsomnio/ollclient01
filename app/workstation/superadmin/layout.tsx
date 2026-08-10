
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Sidebar from '@/components/navigation/sidebar-shadcn'
import { UserNav } from '@/components/navigation/user-nav'
import { SidebarProvider } from '@/components/ui/sidebar'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, checking } = useAuthStore()

  useEffect(() => {
    if (checking) return
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.replace('/login')
    }
  }, [user, isAuthenticated, checking, router])

  if (checking || !isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return null
  }

  return (
    <SidebarProvider>
      <div className='min-h-screen flex flex-col md:flex-row'>
        <Sidebar />
        <div className='flex-1 flex flex-col'>
          <UserNav />
          <main className='flex-1 p-6 bg-gray-50'>{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

