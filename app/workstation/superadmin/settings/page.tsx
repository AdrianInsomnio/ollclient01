'use client'

export default function SuperAdminSettingsPage() {
  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>Configuracion Global</h2>
      <p className='text-gray-600'>Ajustes globales del sistema</p>
      
      <div className='bg-white rounded-lg shadow-sm border p-6 space-y-6'>
        <div>
          <h3 className='text-lg font-semibold mb-4'>Datos de la Plataforma</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Nombre de la Plataforma</label>
              <input type='text' className='w-full border rounded-md px-3 py-2' placeholder='Nombre' />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Email de Soporte</label>
              <input type='email' className='w-full border rounded-md px-3 py-2' placeholder='soporte@ejemplo.com' />
            </div>
          </div>
        </div>
        
        <div>
          <h3 className='text-lg font-semibold mb-4'>Payments</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>MercadoPago Access Token</label>
              <input type='password' className='w-full border rounded-md px-3 py-2' placeholder='MP-...' />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Moneda Default</label>
              <select className='w-full border rounded-md px-3 py-2'>
                <option>UYU - Peso Uruguayo</option>
                <option>USD - Dolar</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className='pt-4 border-t'>
          <button className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700'>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}
