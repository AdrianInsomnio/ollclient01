// Mock tipado de "turno" de la consulta.
//
// Aunque el modelo Prisma tiene Appointment -> Consultation, el detalle
// de la consulta devuelto por getConsultation() no incluye siempre el
// appointment completo. Mientras tanto exponemos un helper determinista
// por id de consulta para que el header muestre el turno/fecha esperado.

export interface ConsultationSchedule {
  consultationId: string
  /** Fecha/hora ISO del turno asignado (o de apertura como fallback). */
  scheduledAt: string
  /** Profesional asignado (placeholder hasta que el backend lo exponga). */
  professional: string
  /** Numero de orden dentro de la cola de atencion. */
  queueNumber: number | null
}

export const getMockSchedule = async (
  consultationId: string,
): Promise<ConsultationSchedule> => {
  // Hash deterministico simple para que el placeholder var? por id.
  const seed = [...consultationId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const hour = 9 + (seed % 8)
  const minute = (seed * 7) % 60
  const today = new Date()
  today.setHours(hour, minute, 0, 0)
  return {
    consultationId,
    scheduledAt: today.toISOString(),
    professional: 'Dr/a. Asignado',
    queueNumber: ((seed % 9) + 1),
  }
}
