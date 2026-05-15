'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Sidebar from '@/components/navigation/sidebar'
import { UserNav } from '@/components/navigation/user-nav'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'USER') {
      router.push('/login')
    }
  }, [user, isAuthenticated, router])

  if (!isAuthenticated || user?.role !== 'USER') {
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
