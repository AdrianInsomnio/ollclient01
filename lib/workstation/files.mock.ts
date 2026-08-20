// Mock tipado de adjuntos clinicos.
// El backend no expone todavia un modulo de attachments especifico
// para Consultation (no existe modulo "attachments" en
// ollmodel/src/modules). Mantenemos este mock CON separado de los
// componentes para que, cuando se cree el endpoint real, solo cambie
// este archivo.

export type ClinicalFileCategory = 'image' | 'pdf' | 'study' | 'other'

export interface ClinicalFile {
  readonly id: string
  readonly consultationId: string
  readonly name: string
  readonly category: ClinicalFileCategory
  readonly url: string
  readonly uploadedAt: string
}

const seedByConsultationId = (consultationId: string): ClinicalFile[] => ([
  {
    id: `mock-${consultationId}-1`,
    consultationId,
    name: 'Radiografia torax.png',
    category: 'image',
    url: '#',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: `mock-${consultationId}-2`,
    consultationId,
    name: 'Hemograma completo.pdf',
    category: 'pdf',
    url: '#',
    uploadedAt: new Date().toISOString(),
  },
])

export const listMockClinicalFiles = async (
  consultationId: string,
): Promise<ClinicalFile[]> => {
  // Simula latencia minima.
  await new Promise((resolve) => setTimeout(resolve, 50))
  return seedByConsultationId(consultationId)
}

export const addMockClinicalFile = async (
  consultationId: string,
  name: string,
  category: ClinicalFileCategory,
): Promise<ClinicalFile> => {
  await new Promise((resolve) => setTimeout(resolve, 50))
  return {
    id: `mock-${consultationId}-${Date.now()}`,
    consultationId,
    name,
    category,
    url: '#',
    uploadedAt: new Date().toISOString(),
  }
}

export const removeMockClinicalFile = async (
  id: string,
): Promise<void> => {
  if (!id) return
  await new Promise((resolve) => setTimeout(resolve, 30))
}
