'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient, type CreateClientPayload, type Client } from '@/lib/api/clients'

interface ClientFormProps {
  client?: Client
  onSuccess?: () => void
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<CreateClientPayload>({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    documentId: client?.documentId || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (client) {
        // Update existing client
        // await updateClient(client.id, formData)
      } else {
        // Create new client
        await createClient(formData)
        // Invalidar cache de clientes para actualizar la lista
        queryClient.invalidateQueries({ queryKey: ['clients'] })
      }
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/workstation/user/clientes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof CreateClientPayload, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{client ? 'Editar Cliente' : 'Nuevo Cliente'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <div className='p-3 text-sm text-red-600 bg-red-50 rounded-md'>{error}</div>
          )}

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <label htmlFor='name' className='text-sm font-medium'>Nombre completo *</label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                placeholder='Juan Perez'
              />
            </div>

            <div className='space-y-2'>
              <label htmlFor='phone' className='text-sm font-medium'>Telefono *</label>
              <Input
                id='phone'
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
                placeholder='099123456'
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <label htmlFor='email' className='text-sm font-medium'>Email</label>
              <Input
                id='email'
                type='email'
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder='juan@email.com'
              />
            </div>

            <div className='space-y-2'>
              <label htmlFor='address' className='text-sm font-medium'>Direccion</label>
              <Input
                id='address'
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder='Av. Utama 123'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label htmlFor='documentId' className='text-sm font-medium'>Documento (CI/RUT)</label>
            <Input
              id='documentId'
              value={formData.documentId}
              onChange={(e) => handleChange('documentId', e.target.value)}
              placeholder='12345678'
            />
          </div>

          <div className='flex gap-4 justify-end pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? 'Guardando...' : client ? 'Actualizar' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
