'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Sidebar from '@/components/navigation/sidebar-shadcn'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Header } from '@/components/layout/Header'

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

  const clinicName = user?.clinics?.[0]?.name || 'Clínica Veterinaria'

  return (
    <SidebarProvider>
      <div className='group/sidebar-wrapper flex min-h-svh w-full'>
        <Sidebar />
        <SidebarInset>
          <div className='flex h-screen flex-col'>
            <Header clinicName={clinicName} notificationCount={0} />
            <main className='flex-1 bg-gray-50 overflow-y-auto'>
              <div className='w-full p-6'>{children}</div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
