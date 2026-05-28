'use client'

export default function SuperAdminPlansPage() {
  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold'>Planes</h2>
        <button className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700'>
          + Crear Plan
        </button>
      </div>
      
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Basico</h3>
          <p className='text-2xl font-bold text-blue-600'>/mes</p>
          <ul className='mt-4 text-sm text-gray-600'>
            <li>- 1 usuario</li>
            <li>- 100 clientes</li>
            <li>- Soporte email</li>
          </ul>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Profesional</h3>
          <p className='text-2xl font-bold text-green-600'>/mes</p>
          <ul className='mt-4 text-sm text-gray-600'>
            <li>- 5 usuarios</li>
            <li>- Clientes ilimitados</li>
            <li>- Soporte prioritario</li>
          </ul>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold'>Enterprise</h3>
          <p className='text-2xl font-bold text-purple-600'>/mes</p>
          <ul className='mt-4 text-sm text-gray-600'>
            <li>- Usuarios ilimitados</li>
            <li>- Clientes ilimitados</li>
            <li>- Soporte 24/7</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
