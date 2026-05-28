'use client'

export default function SuperAdminDashboardPage() {
  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>Dashboard Global</h2>
      <p className='text-gray-600'>Resumen de todas las clinicas</p>
      
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Clinicas Activas</h3>
          <p className='text-3xl font-bold text-blue-600'>0</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Usuarios Totales</h3>
          <p className='text-3xl font-bold text-green-600'>0</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Suscripciones Activas</h3>
          <p className='text-3xl font-bold text-yellow-600'>0</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Ingresos Mensuales</h3>
          <p className='text-3xl font-bold text-purple-600'></p>
        </div>
      </div>
    </div>
  )
}
