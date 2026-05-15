'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createPet, type CreatePetPayload, type Pet } from '@/lib/api/pets'

interface PetFormProps {
  pet?: Pet
  clientId?: string
  onSuccess?: () => void
}

export function PetForm({ pet, clientId: initialClientId, onSuccess }: PetFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = initialClientId || searchParams.get('clientId') || ''


  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<CreatePetPayload>({
    name: pet?.name || '',
    species: pet?.species || '',
    breed: pet?.breed || '',
    age: pet?.age || undefined,
    weight: pet?.weight || undefined,
    clientId: clientId,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.clientId) {
      setError('Debe seleccionar un cliente')
      setLoading(false)
      return
    }

    try {
      await createPet(formData)
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/workstation/user/mascotas')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar mascota')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof CreatePetPayload, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pet ? 'Editar Mascota' : 'Nueva Mascota'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <div className='p-3 text-sm text-red-600 bg-red-50 rounded-md'>{error}</div>
          )}

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <label htmlFor='name' className='text-sm font-medium'>Nombre de la mascota *</label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                placeholder='Maximo'
              />
            </div>

            <div className='space-y-2'>
              <label htmlFor='species' className='text-sm font-medium'>Especie *</label>
              <Input
                id='species'
                value={formData.species}
                onChange={(e) => handleChange('species', e.target.value)}
                required
                placeholder='Perro, Gato, etc.'
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <label htmlFor='breed' className='text-sm font-medium'>Raza</label>
              <Input
                id='breed'
                value={formData.breed}
                onChange={(e) => handleChange('breed', e.target.value)}
                placeholder='Labrador, Siamés, etc.'
              />
            </div>

            <div className='space-y-2'>
              <label htmlFor='age' className='text-sm font-medium'>Edad (años)</label>
              <Input
                id='age'
                type='number'
                min='0'
                value={formData.age || ''}
                onChange={(e) => handleChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder='3'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label htmlFor='weight' className='text-sm font-medium'>Peso (kg)</label>
            <Input
              id='weight'
              type='number'
              step='0.1'
              min='0'
              value={formData.weight || ''}
              onChange={(e) => handleChange('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder='15.5'
            />
          </div>

          {!clientId && (
            <div className='space-y-2'>
              <label htmlFor='clientId' className='text-sm font-medium'>Cliente *</label>
              <Input
                id='clientId'
                value={formData.clientId}
                onChange={(e) => handleChange('clientId', e.target.value)}
                required
                placeholder='ID del cliente'
              />
            </div>
          )}


          <div className='flex gap-4 justify-end pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? 'Guardando...' : pet ? 'Actualizar' : 'Crear Mascota'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
