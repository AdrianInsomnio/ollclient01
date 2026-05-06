'use client'

import { useAuthStore } from '@/lib/auth-store'

export default function AdminHomePage() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Bienvenido, {user?.username}</h2>
      <p className="text-gray-600">Panel de Administración</p>
    </div>
  )
}