'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Sidebar from '@/components/navigation/sidebar'
import { UserNav } from '@/components/navigation/user-nav'

export default function VetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, checking } = useAuthStore()

  useEffect(() => {
    if (checking) return
    if (!isAuthenticated || user?.role !== 'VET') {
      router.replace('/login')
    }
  }, [user, isAuthenticated, checking, router])

  if (checking || !isAuthenticated || user?.role !== 'VET') {
    return null
  }

  return (
    <div className='min-h-screen flex flex-col md:flex-row'>
      <Sidebar />
      <div className='flex-1 flex flex-col'>
        <UserNav />
        <main className='flex-1 p-6 bg-gray-50'>{children}</main>
      </div>
    </div>
  )
}
