'use client'

import { ChangePasswordForm } from '@/components/security/change-password-form'

export default function AdminSettingsPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Configuración</h2>
        <p className='text-gray-600'>Configura los ajustes del sistema</p>
      </div>

      <div className='bg-white rounded-lg shadow-sm border p-6 space-y-6'>
        <div>
          <h3 className='text-lg font-semibold mb-4'>Datos de la Clínica</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Nombre</label>
              <input type='text' className='w-full border rounded-md px-3 py-2' placeholder='Nombre de la clínica' />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Teléfono</label>
              <input type='text' className='w-full border rounded-md px-3 py-2' placeholder='Teléfono' />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Dirección</label>
              <input type='text' className='w-full border rounded-md px-3 py-2' placeholder='Dirección' />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
              <input type='email' className='w-full border rounded-md px-3 py-2' placeholder='Email' />
            </div>
          </div>
        </div>

        <div>
          <h3 className='text-lg font-semibold mb-4'>Precios</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Moneda</label>
              <select className='w-full border rounded-md px-3 py-2'>
                <option>UYU - Peso Uruguayo</option>
                <option>USD - Dolar</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Impuesto (%)</label>
              <input type='number' className='w-full border rounded-md px-3 py-2' placeholder='22' />
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordForm />
    </div>
  )
}
