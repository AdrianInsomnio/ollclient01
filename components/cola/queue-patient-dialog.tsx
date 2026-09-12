"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Building2, CalendarClock, Clock3, Loader2, Pencil, Trash2, UserRound, PawPrint, Receipt } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { assignConsultorio, deleteConsultation, type Consultation } from "@/lib/api/consultations"
import { createAppointment, updateAppointmentStatus } from "@/lib/api/appointments"
import { getConsultorios } from "@/lib/api/consultorios"

function toLocalInput(value: Date) {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function toIso(value: string) {
  return new Date(value).toISOString()
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación."
}

export function QueuePatientDialog({
  consultation,
  open,
  onOpenChange,
  onChanged,
}: {
  consultation: Consultation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const queryClient = useQueryClient()
  const [startAt, setStartAt] = useState(() => toLocalInput(new Date()))
  const [endAt, setEndAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60_000)))
  const [consultorioId, setConsultorioId] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(() => toLocalInput(new Date(Date.now() + 24 * 60 * 60_000)).slice(0, 10))
  const [rescheduleTime, setRescheduleTime] = useState(() => toLocalInput(new Date()).slice(11, 16))

  const consultoriosQuery = useQuery({
    queryKey: ["consultorios", "queue-assignment"],
    queryFn: getConsultorios,
    enabled: open,
  })

  useEffect(() => {
    if (!consultation) return
    setConsultorioId(consultation.consultorioId ? String(consultation.consultorioId) : "")
    const start = consultation.startAt ? new Date(consultation.startAt) : new Date()
    setStartAt(toLocalInput(start))
    setEndAt(toLocalInput(consultation.endAt ? new Date(consultation.endAt) : new Date(start.getTime() + 60 * 60_000)))
  }, [consultation])

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!consultation || !consultorioId) throw new Error("Selecciona un consultorio.")
      if (new Date(startAt) >= new Date(endAt)) throw new Error("La finalización debe ser posterior al inicio.")
      return assignConsultorio(consultation.id, {
        consultorioId: Number(consultorioId),
        startAt: toIso(startAt),
        endAt: toIso(endAt),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["consultations-open"] })
      toast.success("Consultorio asignado correctamente.")
      onChanged()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!consultation) throw new Error("No hay una atención seleccionada.")
      return deleteConsultation(consultation.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["consultations-open"] })
      setDeleteOpen(false)
      toast.success("La atención fue eliminada permanentemente de la cola.")
      onChanged()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!consultation) throw new Error("No hay una atenciÃ³n seleccionada.")
      if (!rescheduleDate || !rescheduleTime) throw new Error("Selecciona la nueva fecha y hora.")

      const newAppointment = await createAppointment({
        clientId: Number(consultation.clientId),
        petId: Number(consultation.petId),
        ...(consultation.vetId ? { vetId: consultation.vetId } : {}),
        date: toIso(`${rescheduleDate}T${rescheduleTime}`),
        duration: consultation.appointment?.duration ?? 30,
        ...(consultation.appointment?.serviceType
          ? { serviceType: consultation.appointment.serviceType }
          : {}),
        notes: [
          consultation.appointment?.notes,
          consultation.notes,
          "CancelÃ³ consulta y reprogramÃ³.",
          `Nueva cita originada desde la atenciÃ³n #${consultation.id}.`,
        ].filter(Boolean).join(" "),
      })

      if (consultation.appointmentId) {
        await updateAppointmentStatus(
          String(consultation.appointmentId),
          "cancelled",
          `CancelÃ³ consulta y reprogramÃ³. Nueva cita #${newAppointment.id}.`,
        )
      }

      await deleteConsultation(consultation.id)
      return newAppointment
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["consultations-open"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments-today"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      ])
      setRescheduleOpen(false)
      toast.success("Se retirÃ³ de la cola y se generÃ³ una nueva cita.")
      onChanged()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const activeConsultorios = (consultoriosQuery.data ?? []).filter((item) => item.status === "ACTIVE")

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl rounded-xl">
          {consultation && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <DialogTitle>{consultation.pet?.name || `Mascota #${consultation.petId}`}</DialogTitle>
                  <Badge variant={consultation.priority === "URGENT" ? "destructive" : "outline"}>{consultation.priority}</Badge>
                </div>
                <DialogDescription>Información del paciente y gestión de la atención.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                <InfoItem icon={<UserRound className="size-4" />} label="Responsable">{consultation.client?.name || `Cliente #${consultation.clientId}`}</InfoItem>
                <InfoItem icon={<PawPrint className="size-4" />} label="Paciente">{consultation.pet?.species || "Mascota"}{consultation.pet?.breed ? ` · ${consultation.pet.breed}` : ""}</InfoItem>
                <InfoItem icon={<Clock3 className="size-4" />} label="En cola">{new Date(consultation.createdAt).toLocaleString("es-UY")}</InfoItem>
                <InfoItem icon={<Building2 className="size-4" />} label="Consultorio">{consultation.consultorio?.name || "Sin asignar"}</InfoItem>
                <InfoItem label="Motivo" className="sm:col-span-2">{consultation.notes || "Consulta general"}</InfoItem>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Asignar consultorio</p>
                    <p className="text-xs text-muted-foreground">Define el espacio y el horario de atención.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="queue-consultorio">Consultorio</Label>
                    <select id="queue-consultorio" value={consultorioId} onChange={(event) => setConsultorioId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={consultoriosQuery.isLoading || assignMutation.isPending}>
                      <option value="">Seleccionar consultorio...</option>
                      {activeConsultorios.map((item) => <option key={item.id} value={item.id}>{item.name}{item.size ? ` · ${item.size}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="queue-start">Inicio</Label>
                    <Input id="queue-start" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} disabled={assignMutation.isPending} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="queue-end">Finalización</Label>
                    <Input id="queue-end" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} disabled={assignMutation.isPending} />
                  </div>
                </div>
                <Button type="button" onClick={() => assignMutation.mutate()} disabled={!consultorioId || assignMutation.isPending || consultoriosQuery.isLoading}>
                  {assignMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Asignar consultorio
                </Button>
              </div>

              <DialogFooter className="flex-wrap sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button" variant="outline">
                    <Link href={`/workstation/user/mascotas/${consultation.petId}`}><Pencil className="mr-2 size-4" />Editar paciente</Link>
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <Link href={`/workstation/user/consultas/${consultation.id}`}>Abrir consulta</Link>
                  </Button>
                </div>
                {consultation.consultorioId && (
                  <Button asChild type="button" disabled={assignMutation.isPending || deleteMutation.isPending}>
                    <Link href={`/workstation/user/consultas/${consultation.id}`}>
                      <Receipt className="mr-2 size-4" />
                      Finalizar y cobrar
                    </Link>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleOpen(true)}
                  disabled={deleteMutation.isPending || assignMutation.isPending || rescheduleMutation.isPending}
                >
                  <CalendarClock className="mr-2 size-4" />
                  Abandonar y reprogramar
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)} disabled={deleteMutation.isPending || assignMutation.isPending}>
                  <Trash2 className="mr-2 size-4" />Quitar de la cola
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={(value) => !rescheduleMutation.isPending && setRescheduleOpen(value)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="size-5 text-primary" />Abandonar y reprogramar</DialogTitle>
            <DialogDescription>
              El paciente saldrÃ¡ de la cola, se cancelarÃ¡ la cita anterior y se crearÃ¡ un nuevo registro. Esta acciÃ³n conservarÃ¡ la trazabilidad.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="queue-reschedule-date">Nueva fecha</Label>
              <Input id="queue-reschedule-date" type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} disabled={rescheduleMutation.isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="queue-reschedule-time">Nueva hora</Label>
              <Input id="queue-reschedule-time" type="time" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} disabled={rescheduleMutation.isPending} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRescheduleOpen(false)} disabled={rescheduleMutation.isPending}>Conservar en cola</Button>
            <Button type="button" onClick={() => rescheduleMutation.mutate()} disabled={!rescheduleDate || !rescheduleTime || rescheduleMutation.isPending}>
              {rescheduleMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmar reprogramaciÃ³n
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(value) => !deleteMutation.isPending && setDeleteOpen(value)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-destructive" />Eliminar de la cola</DialogTitle>
            <DialogDescription>Esta acción eliminará permanentemente la atención y no podrá recuperarse. ¿Deseas continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>Conservar</Button>
            <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Eliminar permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function InfoItem({ icon, label, children, className = "" }: { icon?: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className}`}><p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{icon}{label}</p><p className="text-sm">{children}</p></div>
}
