import { ClientForm } from '@/components/clients/client-form'

export default function NewClientPage() {
  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold text-gray-900'>Nuevo Cliente</h1>
      <ClientForm />
    </div>
  )
}
