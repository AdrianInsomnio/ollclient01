'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export default function VetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'VET') {
      router.push('/login')
    }
  }, [user, isAuthenticated, router])

  if (!isAuthenticated || user?.role !== 'VET') {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Consultorio</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.username}</span>
          <button
            onClick={() => {
              logout()
              router.push('/login')
            }}
            className="text-sm text-red-600 hover:underline"
          >
            Salir
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}