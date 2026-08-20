"use client"

import { useEffect, useState } from "react"
import { FileImage, FileText, FilePlus2, Loader2, Trash2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import {
  addMockClinicalFile,
  listMockClinicalFiles,
  removeMockClinicalFile,
  type ClinicalFile,
  type ClinicalFileCategory,
} from "@/lib/workstation/files.mock"
import { workspaceToast } from "@/lib/workstation/toast"

const categoryIcon: Record<ClinicalFileCategory, typeof FileText> = {
  image: FileImage,
  pdf: FileText,
  study: FileText,
  other: FileText,
}

interface FilesTabProps {
  consultationId: string
}

export function FilesTab({ consultationId }: FilesTabProps) {
  const [files, setFiles] = useState<ClinicalFile[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState<ClinicalFileCategory>("image")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    void listMockClinicalFiles(consultationId).then((items) => {
      if (!active) return
      setFiles(items)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [consultationId])

  const reload = async () => {
    const items = await listMockClinicalFiles(consultationId)
    setFiles(items)
  }

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await addMockClinicalFile(consultationId, trimmed, category)
      workspaceToast.fileAttached(trimmed)
      setName("")
      setCategory("image")
      setOpen(false)
      await reload()
    } catch (err) {
      workspaceToast.fileError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeMockClinicalFile(id)
      workspaceToast.fileRemoved()
      await reload()
    } catch (err) {
      workspaceToast.fileError(err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Archivos</CardTitle>
            <CardDescription>
              Imagenes, estudios y documentos adjuntos
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <FilePlus2 className="size-3.5" /> Adjuntar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-3.5 animate-spin" /> Cargando archivos
          </div>
        ) : files.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>Sin archivos</EmptyTitle>
            <EmptyDescription>
              Adjunte estudios, imagenes o documentos del paciente.
            </EmptyDescription>
          </Empty>
        ) : (
          <ul className="divide-y">
            {files.map((file) => {
              const Icon = categoryIcon[file.category] ?? FileText
              return (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate">{file.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {new Date(file.uploadedAt).toLocaleString("es-UY")}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Quitar"
                    onClick={() => handleRemove(file.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjuntar archivo</DialogTitle>
            <DialogDescription>
              La carga final dependera del modulo de adjuntos del backend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="file-name">Nombre</Label>
              <Input
                id="file-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Radiografia torax"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file-category">Categoria</Label>
              <select
                id="file-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ClinicalFileCategory)
                }
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-8 w-full rounded-lg border px-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                disabled={submitting}
              >
                <option value="image">Imagen</option>
                <option value="pdf">PDF</option>
                <option value="study">Estudio</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={submitting || !name.trim()}
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FilePlus2 className="size-3.5" />
              )}
              Adjuntar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
