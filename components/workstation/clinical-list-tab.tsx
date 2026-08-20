"use client"

import { useState } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ClinicalEntry {
  id: string | number
  description: string
}

export interface ClinicalListTabProps {
  title: string
  dialogDescription: string
  fieldLabel: string
  items: readonly ClinicalEntry[]
  disabled?: boolean
  onAdd: (description: string) => unknown | Promise<unknown>
  onRemove?: (id: string | number) => Promise<void> | void
  emptyHint?: string
}

export function ClinicalListTab(props: ClinicalListTabProps) {
  const {
    title,
    dialogDescription,
    fieldLabel,
    items,
    disabled = false,
    onAdd,
    onRemove,
    emptyHint,
  } = props

  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    if (submitting) return
    setOpen(false)
    setPending("")
    setError(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = pending.trim()
    if (!normalized) {
      setError("Ingrese una descripcion")
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      await onAdd(normalized)
      setPending("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = (id: string | number) => {
    if (!onRemove) return
    void onRemove(id)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {items.length}{" "}
              {items.length === 1 ? "registro" : "registros"}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
            <Plus className="size-3.5" /> Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <Plus />
            </EmptyMedia>
            <EmptyTitle>Sin registros</EmptyTitle>
            <EmptyDescription>
              {emptyHint ??
                `Anada un ${title.toLowerCase()} para esta consulta.`}
            </EmptyDescription>
          </Empty>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={item.id}
                className="group flex items-start justify-between gap-2 py-2 text-sm"
              >
                <span className="flex-1 whitespace-pre-line">
                  {item.description}
                </span>
                {onRemove && !disabled ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Quitar"
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`clinical-${title}`}>{fieldLabel}</Label>
              <Textarea
                id={`clinical-${title}`}
                rows={3}
                value={pending}
                onChange={(event) => setPending(event.target.value)}
                placeholder={fieldLabel}
                disabled={submitting}
                autoFocus
              />
            </div>
            {error ? (
              <p className="text-destructive text-xs">{error}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
