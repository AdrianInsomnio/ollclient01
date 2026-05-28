'use client'

import { useAuthStore } from '@/lib/auth-store'

export default function AdminDashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>Dashboard de Administracion</h2>
      <p className='text-gray-600'>Bienvenido, {user?.username}</p>
      
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Consultas Hoy</h3>
          <p className='text-3xl font-bold text-blue-600'>0</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Clientes Activos</h3>
          <p className='text-3xl font-bold text-green-600'>0</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Ingresos del Dia</h3>
          <p className='text-3xl font-bold text-yellow-600'></p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Stock Bajo</h3>
          <p className='text-3xl font-bold text-red-600'>0</p>
        </div>
      </div>
    </div>
  )
}
