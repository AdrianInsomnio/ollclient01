'use client'

export default function AdminReportsPage() {
  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>Reportes</h2>
      <p className='text-gray-600'>Consulta y genera reportes del negocio</p>
      
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold mb-2'>Ventas</h3>
          <p className='text-gray-600 text-sm'>Reporte de ventas diarias, semanales y mensuales</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold mb-2'>Consultas</h3>
          <p className='text-gray-600 text-sm'>Resumen de consultas por veterinario</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold mb-2'>Inventario</h3>
          <p className='text-gray-600 text-sm'>Estado de stock y productos</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold mb-2'>Clientes</h3>
          <p className='text-gray-600 text-sm'>Clientes nuevos y recurrentes</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold mb-2'>Finanzas</h3>
          <p className='text-gray-600 text-sm'>Ingresos, gastos y ganancias</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <h3 className='text-lg font-semibold mb-2'>Productividad</h3>
          <p className='text-gray-600 text-sm'>Metricas del personal</p>
        </div>
      </div>
    </div>
  )
}
