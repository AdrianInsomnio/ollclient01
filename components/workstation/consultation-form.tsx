"use client"

import { useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Save } from "lucide-react"

import type { UpdateClinicalPayload } from "@/lib/api/consultations"

export interface ConsultationFormProps {
  initialValues: UpdateClinicalPayload
  disabled?: boolean
  saving?: boolean
  onSave: (values: UpdateClinicalPayload) => void
}

const parseOptionalNumber = (raw: string): number | undefined => {
  if (!raw.trim()) return undefined
  const parsed = Number(raw.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : undefined
}

// Helper: combina dos secciones con un separador visible y conserva orden.
const joinSections = (...parts: Array<string | undefined>): string | undefined => {
  const cleaned = parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0)
  if (cleaned.length === 0) return undefined
  return cleaned.join("\n\n")
}

export function ConsultationForm(props: ConsultationFormProps) {
  const { initialValues, disabled = false, saving = false, onSave } = props
  const formRef = useRef<HTMLFormElement | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    const reason = (data.get("reason") as string | null) ?? ""
    const anamnesis = (data.get("anamnesis") as string | null) ?? ""
    const physicalExam =
      (data.get("physicalExam") as string | null) ?? ""
    const clinicalNotes =
      (data.get("clinicalNotes") as string | null) ?? ""

    // El schema de Prisma solo expone `symptoms` y `notes` como columnas
    // de texto libres en `Consultation`. Los diagnosticos y tratamientos
    // detallados viven en Diagnosis[] / Treatment[] (tabs dedicadas).
    const symptoms = joinSections(reason, anamnesis)
    const notes = joinSections(physicalExam, clinicalNotes)

    onSave({
      weight: parseOptionalNumber((data.get("weight") as string | null) ?? ""),
      temperature: parseOptionalNumber(
        (data.get("temperature") as string | null) ?? "",
      ),
      symptoms,
      notes,
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Motivo de consulta</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="reason">Describa el motivo principal</Label>
          <Textarea
            id="reason"
            name="reason"
            rows={3}
            defaultValue={initialValues.symptoms ?? ""}
            placeholder="Ej. Vomitos desde ayer, decaimiento"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signos vitales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.1"
              min={0}
              defaultValue={
                initialValues.weight != null
                  ? String(initialValues.weight)
                  : ""
              }
              placeholder="0.0"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperatura (°C)</Label>
            <Input
              id="temperature"
              name="temperature"
              type="number"
              step="0.1"
              min={30}
              max={45}
              defaultValue={
                initialValues.temperature != null
                  ? String(initialValues.temperature)
                  : ""
              }
              placeholder="38.5"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anamnesis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="anamnesis">Antecedentes y entorno</Label>
          <Textarea
            id="anamnesis"
            name="anamnesis"
            rows={3}
            defaultValue={""}
            placeholder="Antecedentes, alimentacion, entorno, alergias..."
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Examen fisico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="physicalExam">Hallazgos del examen</Label>
          <Textarea
            id="physicalExam"
            name="physicalExam"
            rows={3}
            defaultValue={""}
            placeholder="Mucosas, ganglios, auscultacion, palpacion..."
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas clinicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="clinicalNotes">Notas</Label>
          <Textarea
            id="clinicalNotes"
            name="clinicalNotes"
            rows={2}
            defaultValue={""}
            placeholder="Observaciones adicionales"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || saving}>
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Guardar consulta
        </Button>
      </div>
    </form>
  )
}
