'use client'

import { AlertTriangle } from 'lucide-react'

export default function SuperAdminPlansPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Planes</h2>
        <p className='text-gray-600'>Catalogo de planes disponibles para las clinicas</p>
      </div>

      <div className='bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 flex gap-3'>
        <AlertTriangle className='h-5 w-5 flex-shrink-0 mt-0.5' />
        <div>
          <p className='font-semibold'>Funcionalidad no implementada</p>
          <p className='text-sm'>
            El catalogo de planes requiere el modelo <code>Plan</code> en Prisma,
            que no existe en esta version. Se entregara en una fase posterior.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60'>
        <PlanCard name='Basico' priceLabel='Por definir' features={['1 usuario', '100 clientes', 'Soporte email']} />
        <PlanCard name='Profesional' priceLabel='Por definir' features={['5 usuarios', 'Clientes ilimitados', 'Soporte prioritario']} />
        <PlanCard name='Enterprise' priceLabel='Por definir' features={['Usuarios ilimitados', 'Soporte 24/7', 'SLA dedicado']} />
      </div>
    </div>
  )
}

function PlanCard({ name, priceLabel, features }: { name: string; priceLabel: string; features: string[] }) {
  return (
    <div className='bg-white p-6 rounded-lg shadow-sm border'>
      <h3 className='text-lg font-semibold'>{name}</h3>
      <p className='text-2xl font-bold text-blue-600 mt-1'>{priceLabel}</p>
      <ul className='mt-4 text-sm text-gray-600 space-y-1'>
        {features.map(f => (
          <li key={f}>- {f}</li>
        ))}
      </ul>
    </div>
  )
}
