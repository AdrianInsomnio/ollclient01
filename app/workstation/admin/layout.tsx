'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Sidebar from '@/components/navigation/sidebar-shadcn'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Header } from '@/components/layout/Header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, checking } = useAuthStore()

  useEffect(() => {
    if (checking) return
    if (!isAuthenticated || !['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '')) {
      router.replace('/login')
    }
  }, [user, isAuthenticated, checking, router])

  if (checking || !isAuthenticated || !['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '')) {
    return null
  }

  const clinicName = user?.clinics?.[0]?.name || 'Clínica Veterinaria'

  return (
    <SidebarProvider>
      <div className='group/sidebar-wrapper flex min-h-svh w-full'>
        <Sidebar />
        <SidebarInset>
          <div className='flex h-screen flex-col'>
            <Header clinicName={clinicName} notificationCount={0} />
            <main className='flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50'>
              <div className='mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col p-6'>{children}</div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
