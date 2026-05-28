'use client'

export default function SuperAdminSubscriptionsPage() {
  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>Suscripciones</h2>
      <p className='text-gray-600'>Gestiona las suscripciones de las clinicas</p>
      
      <div className='bg-white rounded-lg shadow-sm border overflow-hidden'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Clinica</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Plan</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Inicio</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Vencimiento</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Estado</th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            <tr>
              <td className='px-6 py-4 whitespace-nowrap'>No hay suscripciones</td>
              <td className='px-6 py-4 whitespace-nowrap'>-</td>
              <td className='px-6 py-4 whitespace-nowrap'>-</td>
              <td className='px-6 py-4 whitespace-nowrap'>-</td>
              <td className='px-6 py-4 whitespace-nowrap'>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
