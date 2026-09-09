"use client"

import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateClient, type Client, type UpdateClientPayload } from "@/lib/api/clients"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ClientFormState = {
  name: string
  documentId: string
  phone: string
  email: string
  address: string
}

function getInitialForm(client: Client): ClientFormState {
  return {
    name: client.name || "",
    documentId: client.documentId || "",
    phone: client.phone || "",
    email: client.email || "",
    address: client.address || "",
  }
}

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ClientFormState>(() => getInitialForm(client))
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(getInitialForm(client))
      setError("")
    }
  }, [open, client])

  const update = (field: keyof ClientFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError("El nombre del cliente es obligatorio.")
      return
    }
    setLoading(true)
    setError("")

    const payload: UpdateClientPayload = {
      name: form.name.trim(),
      documentId: form.documentId.trim() || undefined,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim() || undefined,
    }

    try {
      await updateClient(client.id, payload)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client", client.id] }),
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
        queryClient.invalidateQueries({ queryKey: ["clientHistory", client.id] }),
      ])
      onOpenChange(false)
      toast.success("Cliente actualizado correctamente")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el cliente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[92vw] max-w-[900px] overflow-y-auto rounded-xl sm:!w-[60vw] sm:!max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>Actualiza los datos de contacto del responsable.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="edit-client-name" label="Nombre completo *" value={form.name} onChange={(value) => update("name", value)} required />
            <Field id="edit-client-document" label="Documento / CI" value={form.documentId} onChange={(value) => update("documentId", value)} />
            <Field id="edit-client-phone" label="Teléfono" type="tel" value={form.phone} onChange={(value) => update("phone", value)} />
            <Field id="edit-client-email" label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} />
            <Field id="edit-client-address" label="Dirección" value={form.address} onChange={(value) => update("address", value)} />
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
