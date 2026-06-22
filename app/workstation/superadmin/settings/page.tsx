'use client'

import { AlertTriangle } from 'lucide-react'

export default function SuperAdminSettingsPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Configuracion Global</h2>
        <p className='text-gray-600'>Ajustes globales del sistema</p>
      </div>

      <div className='bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 flex gap-3'>
        <AlertTriangle className='h-5 w-5 flex-shrink-0 mt-0.5' />
        <div>
          <p className='font-semibold'>Funcionalidad no implementada</p>
          <p className='text-sm'>
            Las configuraciones globales (plataforma, integraciones de pago, moneda)
            requieren endpoints dedicados que no forman parte de esta fase.
            Por ahora, las opciones se administran directamente en la base de datos.
          </p>
        </div>
      </div>

      <div className='bg-white border rounded-lg p-6 space-y-6 opacity-60'>
        <div>
          <h3 className='text-lg font-semibold mb-4'>Datos de la Plataforma</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Nombre de la Plataforma</label>
              <input type='text' className='w-full border rounded-md px-3 py-2' disabled placeholder='No editable' />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Email de Soporte</label>
              <input type='email' className='w-full border rounded-md px-3 py-2' disabled placeholder='No editable' />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
