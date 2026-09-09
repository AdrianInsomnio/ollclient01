"use client"

import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updatePet, type Pet, type UpdatePetPayload } from "@/lib/api/pets"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type EditPetForm = {
  name: string
  species: string
  sex: string
  breed: string
  birthDate: string
  color: string
  weight: string
  notes: string
}

function getInitialForm(pet: Pet): EditPetForm {
  return {
    name: pet.name || "",
    species: pet.species || "",
    sex: pet.sex || "",
    breed: pet.breed || "",
    birthDate: pet.birthDate ? pet.birthDate.slice(0, 10) : "",
    color: pet.color || "",
    weight: pet.weight === undefined || pet.weight === null ? "" : String(pet.weight),
    notes: pet.notes || "",
  }
}

export function EditPetDialog({
  pet,
  open,
  onOpenChange,
  onSaved,
}: {
  pet: Pet
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<EditPetForm>(() => getInitialForm(pet))
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(getInitialForm(pet))
      setError("")
    }
  }, [open, pet])

  const update = (field: keyof EditPetForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.species.trim()) {
      setError("El nombre y la especie son obligatorios.")
      return
    }

    setLoading(true)
    setError("")
    const payload: UpdatePetPayload = {
      name: form.name.trim(),
      species: form.species.trim(),
      sex: form.sex || undefined,
      breed: form.breed.trim() || undefined,
      birthDate: form.birthDate ? new Date(`${form.birthDate}T00:00:00`).toISOString() : undefined,
      color: form.color.trim() || undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      notes: form.notes.trim() || undefined,
    }

    try {
      await updatePet(pet.id, payload)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pet", String(pet.id)] }),
        queryClient.invalidateQueries({ queryKey: ["pets"] }),
        queryClient.invalidateQueries({ queryKey: ["client", String(pet.clientId)] }),
      ])
      onOpenChange(false)
      onSaved?.()
      toast.success("Mascota actualizada correctamente")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la mascota.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[96vw]! max-w-400 overflow-y-auto rounded-xl sm:max-w-400!">
        <DialogHeader>
          <DialogTitle>Editar Mascota</DialogTitle>
          <DialogDescription>Modifica los datos registrados de {pet.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="edit-pet-name" label="Nombre *" value={form.name} onChange={(value) => update("name", value)} required />
            <Field id="edit-pet-species" label="Especie *" value={form.species} onChange={(value) => update("species", value)} required />
            <div className="space-y-2">
              <Label htmlFor="edit-pet-sex">Sexo</Label>
              <select id="edit-pet-sex" value={form.sex} onChange={(event) => update("sex", event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Seleccionar</option>
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </select>
            </div>
            <Field id="edit-pet-breed" label="Raza" value={form.breed} onChange={(value) => update("breed", value)} />
            <Field id="edit-pet-birth-date" label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={(value) => update("birthDate", value)} />
            <Field id="edit-pet-color" label="Color" value={form.color} onChange={(value) => update("color", value)} />
            <Field id="edit-pet-weight" label="Peso (kg)" type="number" value={form.weight} onChange={(value) => update("weight", value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-pet-notes">Observaciones</Label>
            <Textarea id="edit-pet-notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ id, label, value, onChange, type = "text", required = false }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></div>
}
