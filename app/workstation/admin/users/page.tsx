'use client'

export default function AdminUsersPage() {
  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>Gestion de Usuarios</h2>
      <p className='text-gray-600'>Administra los usuarios del sistema</p>
      
      <div className='bg-white rounded-lg shadow-sm border overflow-hidden'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Usuario</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Rol</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Estado</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Acciones</th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            <tr>
              <td className='px-6 py-4 whitespace-nowrap'>No hay usuarios</td>
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
