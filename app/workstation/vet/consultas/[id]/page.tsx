'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  addDiagnosis,
  addPrescription,
  addTreatment,
  getConsultation,
  updateConsultationClinical,
  type UpdateClinicalPayload,
} from '@/lib/api/consultations'
import { getPetHistory } from '@/lib/api/pets'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Plus } from 'lucide-react'

export default function VetConsultationDetailPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const consultationId = params.id as string

  const [formData, setFormData] = useState<UpdateClinicalPayload>({})
  const [diagnosisText, setDiagnosisText] = useState('')
  const [treatmentText, setTreatmentText] = useState('')
  const [prescriptionText, setPrescriptionText] = useState('')
  const [error, setError] = useState('')

  const { data: consultation, isLoading } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: () => getConsultation(consultationId),
    enabled: !!consultationId,
  })

  const { data: petHistory } = useQuery({
    queryKey: ['petHistory', consultation?.petId],
    queryFn: () => getPetHistory(consultation?.petId || ''),
    enabled: !!consultation?.petId,
  })

  useEffect(() => {
    if (!consultation) return
    setFormData({
      weight: consultation.weight,
      temperature: consultation.temperature,
      symptoms: consultation.symptoms || '',
      diagnosis: consultation.diagnosis || '',
      treatment: consultation.treatment || '',
      notes: consultation.notes || '',
    })
  }, [consultation])

  const saveMutation = useMutation({
    mutationFn: () => updateConsultationClinical(consultationId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] })
      queryClient.invalidateQueries({ queryKey: ['consultations'] })
      setError('')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo guardar la consulta'),
  })

  const addEntryMutation = useMutation({
    mutationFn: async ({ type, description }: { type: 'diagnosis' | 'treatment' | 'prescription'; description: string }) => {
      if (type === 'diagnosis') return addDiagnosis(consultationId, description)
      if (type === 'treatment') return addTreatment(consultationId, description)
      return addPrescription(consultationId, description)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] })
      if (variables.type === 'diagnosis') setDiagnosisText('')
      if (variables.type === 'treatment') setTreatmentText('')
      if (variables.type === 'prescription') setPrescriptionText('')
      setError('')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo agregar el registro'),
  })

  const updateField = (field: keyof UpdateClinicalPayload, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: field === 'weight' || field === 'temperature'
        ? value ? Number(value) : undefined
        : value,
    }))
  }

  const handleAdd = (type: 'diagnosis' | 'treatment' | 'prescription', description: string) => {
    const normalized = description.trim()
    if (!normalized) {
      setError('Completa el texto antes de agregar')
      return
    }
    addEntryMutation.mutate({ type, description: normalized })
  }

  if (isLoading) {
    return <p className='text-center text-gray-500 py-8'>Cargando...</p>
  }

  if (!consultation) {
    return <p className='text-center text-gray-500 py-8'>Consulta no encontrada</p>
  }

  return (
    <div className='space-y-6'>
      <Link href='/workstation/vet/consultas' className='inline-flex'>
        <Button variant='ghost' size='sm'><ArrowLeft className='h-4 w-4 mr-2' />Volver</Button>
      </Link>

      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>{consultation.pet?.name || `Mascota #${consultation.petId}`}</h1>
          <p className='text-sm text-gray-500'>{consultation.client?.name || `Cliente #${consultation.clientId}`} · {consultation.status}</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || consultation.status === 'CLOSED'}>
          <Save className='h-4 w-4 mr-2' />{saveMutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='grid gap-6 lg:grid-cols-[1fr_360px]'>
        <div className='space-y-6'>
          <Card>
            <CardHeader><CardTitle>Datos Clínicos</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium' htmlFor='weight'>Peso (kg)</label>
                  <Input id='weight' type='number' step='0.1' value={formData.weight || ''} onChange={(e) => updateField('weight', e.target.value)} />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-medium' htmlFor='temperature'>Temperatura (°C)</label>
                  <Input id='temperature' type='number' step='0.1' value={formData.temperature || ''} onChange={(e) => updateField('temperature', e.target.value)} />
                </div>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium' htmlFor='symptoms'>Síntomas</label>
                <textarea id='symptoms' className='w-full min-h-24 rounded-md border p-3 text-sm' value={formData.symptoms || ''} onChange={(e) => updateField('symptoms', e.target.value)} />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium' htmlFor='diagnosis'>Diagnóstico principal</label>
                <textarea id='diagnosis' className='w-full min-h-24 rounded-md border p-3 text-sm' value={formData.diagnosis || ''} onChange={(e) => updateField('diagnosis', e.target.value)} />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium' htmlFor='treatment'>Tratamiento aplicado</label>
                <textarea id='treatment' className='w-full min-h-24 rounded-md border p-3 text-sm' value={formData.treatment || ''} onChange={(e) => updateField('treatment', e.target.value)} />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium' htmlFor='notes'>Notas</label>
                <textarea id='notes' className='w-full min-h-24 rounded-md border p-3 text-sm' value={formData.notes || ''} onChange={(e) => updateField('notes', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Registros Clínicos</CardTitle></CardHeader>
            <CardContent className='grid gap-4 md:grid-cols-3'>
              <ClinicalList title='Diagnósticos' items={consultation.diagnoses || []} value={diagnosisText} onChange={setDiagnosisText} onAdd={() => handleAdd('diagnosis', diagnosisText)} />
              <ClinicalList title='Tratamientos' items={consultation.treatments || []} value={treatmentText} onChange={setTreatmentText} onAdd={() => handleAdd('treatment', treatmentText)} />
              <ClinicalList title='Recetas' items={consultation.prescriptions || []} value={prescriptionText} onChange={setPrescriptionText} onAdd={() => handleAdd('prescription', prescriptionText)} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Historial del Paciente</CardTitle></CardHeader>
          <CardContent>
            {!petHistory?.consultations || petHistory.consultations.length === 0 ? (
              <p className='text-sm text-gray-500'>Sin historial clínico previo</p>
            ) : (
              <div className='space-y-3'>
                {petHistory.consultations.slice(0, 8).map((item: unknown) => {
                  const entry = item as { id: string | number; createdAt?: string; diagnosis?: string; notes?: string; totalFee?: number }
                  return (
                    <div key={entry.id} className='border-b pb-3'>
                      <p className='text-sm font-medium'>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('es-UY') : 'Sin fecha'}</p>
                      <p className='text-sm text-gray-500'>{entry.diagnosis || entry.notes || 'Consulta sin diagnóstico'}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClinicalList({
  title,
  items,
  value,
  onChange,
  onAdd,
}: {
  title: string
  items: Array<{ id: string | number; description: string }>
  value: string
  onChange: (value: string) => void
  onAdd: () => void
}) {
  return (
    <div className='space-y-3'>
      <h3 className='font-medium'>{title}</h3>
      <div className='space-y-2'>
        {items.length === 0 ? (
          <p className='text-sm text-gray-500'>Sin registros</p>
        ) : items.map((item) => (
          <p key={item.id} className='rounded-md bg-gray-50 p-2 text-sm'>{item.description}</p>
        ))}
      </div>
      <div className='flex gap-2'>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder='Agregar...' />
        <Button type='button' size='icon' onClick={onAdd}><Plus className='h-4 w-4' /></Button>
      </div>
    </div>
  )
}
