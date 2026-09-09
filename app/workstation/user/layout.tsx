'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Sidebar from '@/components/navigation/sidebar-shadcn'
import { UserNav } from '@/components/navigation/user-nav'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Header } from '@/components/layout/Header'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, checking } = useAuthStore()
  const isConsultoriosForVeterinarian = pathname === '/workstation/user/consultorios' && user?.role === 'VET'
  const hasWorkspaceAccess = user?.role === 'USER' || isConsultoriosForVeterinarian

  useEffect(() => {
    if (checking) return
    if (!isAuthenticated || !hasWorkspaceAccess) {
      router.replace('/login')
    }
  }, [user, isAuthenticated, checking, hasWorkspaceAccess, router])

  if (checking || !isAuthenticated || !hasWorkspaceAccess) {
    return null
  }

  // Obtener el nombre de la clínica activa del usuario
  const clinicName = user?.clinics?.[0]?.name || 'Clínica Veterinaria'

  return (
    <SidebarProvider>
      <div className='group/sidebar-wrapper flex min-h-svh w-full'>
        <Sidebar />
        <SidebarInset>
          <div className='flex h-screen flex-col'>
           
            <Header clinicName={clinicName} notificationCount={0} />
            <main className='flex-1 bg-gray-50 overflow-y-auto'>
              <div className='max-w-7xl mx-auto w-full p-6'>{children}</div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
