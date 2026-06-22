'use client'

import { AlertTriangle } from 'lucide-react'

export default function SuperAdminSubscriptionsPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Suscripciones</h2>
        <p className='text-gray-600'>Gestiona las suscripciones de las clinicas</p>
      </div>

      <div className='bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 flex gap-3'>
        <AlertTriangle className='h-5 w-5 flex-shrink-0 mt-0.5' />
        <div>
          <p className='font-semibold'>Funcionalidad no implementada</p>
          <p className='text-sm'>
            La gestion de suscripciones requiere los modelos <code>Plan</code> y
            <code> Subscription</code> en Prisma, que no existen en esta version.
            Se entregara en una fase posterior.
          </p>
        </div>
      </div>
    </div>
  )
}
