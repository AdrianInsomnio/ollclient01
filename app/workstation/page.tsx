'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export default function WorkstationPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    const roleRoutes: Record<string, string> = {
      USER: '/workstation/user',
      VET: '/workstation/vet',
      ADMIN: '/workstation/admin',
      SUPER_ADMIN: '/workstation/superadmin',
    }

    router.push(roleRoutes[user.role] || '/workstation/user')
  }, [user, isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirigiendo...</p>
    </div>
  )
}