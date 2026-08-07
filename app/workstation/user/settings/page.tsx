'use client'

import { ChangePasswordForm } from '@/components/security/change-password-form'

export default function UserSettingsPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Configuración</h2>
        <p className='text-gray-600'>Ajustes de tu cuenta</p>
      </div>

      <ChangePasswordForm />
    </div>
  )
}
