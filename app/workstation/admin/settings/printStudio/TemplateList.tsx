'use client';

import React, { useState } from 'react';
import { Copy, Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PrintTemplate, PrintTemplateVersion } from '@/lib/api/printing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePrintStudio } from './PrintStudioContext';

type DeleteTarget = { templateName: string; version: PrintTemplateVersion };

function latestDraft(template: PrintTemplate) {
  return [...template.versions]
    .filter(version => version.status === 'DRAFT')
    .sort((a, b) => b.version - a.version)[0];
}

const TemplateListItem: React.FC<{
  template: PrintTemplate;
  selected: boolean;
  onDeleteDraft: (target: DeleteTarget) => void;
}> = ({ template, selected, onDeleteDraft }) => {
  const { loadTemplate, cloneTemplate } = usePrintStudio();
  const currentVersion = [...template.versions].sort((a, b) => b.version - a.version)[0];
  const draft = latestDraft(template);

  return (
    <div className={`flex w-64 shrink-0 items-center gap-2 rounded-lg border bg-card p-2 ${selected ? 'border-primary/50 bg-muted/50' : 'border-border'}`}>
      <button
        type="button"
        onClick={() => void loadTemplate(String(template.id))}
        className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        aria-current={selected ? 'true' : undefined}
      >
        <span className="block truncate text-sm font-medium text-foreground">{template.name}</span>
        <span className="mt-1 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {currentVersion?.status || 'SIN VERSIÓN'}
          </Badge>
          {currentVersion && <span className="truncate text-xs text-muted-foreground">{currentVersion.paperSize} · v{currentVersion.version}</span>}
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${template.name}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => void cloneTemplate(String(template.id))}>
              <Copy />
              Clonar template
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void loadTemplate(String(template.id))}>
              <Pencil />
              Modificar template
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              disabled={!draft}
              onSelect={() => draft && onDeleteDraft({ templateName: template.name, version: draft })}
            >
              <Trash2 />
              Eliminar borrador
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const TemplateList: React.FC = () => {
  const { template, templates, loading, setTemplate, deleteDraftTemplateVersion } = usePrintStudio();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDocumentType, setNewDocumentType] = useState('SALE');
  const [newPageSize, setNewPageSize] = useState<'THERMAL_58' | 'THERMAL_80' | 'A4' | 'LETTER'>('A4');

  const handleCreateTemplate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    const templateKey = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!name || !templateKey) return;
    setTemplate({ id: 'new', name, templateKey, documentType: newDocumentType, pageSize: newPageSize, layout: [] });
    setCreateOpen(false);
    setNewName('');
  };

  const handleDeleteDraft = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDraftTemplateVersion(deleteTarget.version.id);
      setDeleteTarget(null);
    } catch {
      // Context shows the API error; keep the confirmation open so the action can be retried.
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <header className="flex flex-col gap-3 border-b bg-background px-5 py-4 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center justify-between gap-3 lg:w-56">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Templates de impresión</h2>
            <p className="text-xs text-muted-foreground">Elige uno para editar o previsualizar</p>
          </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
            <Plus data-icon="inline-start" />
            Nuevo
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {loading ? (
            <p className="self-center px-2 text-sm text-muted-foreground">Cargando templates…</p>
          ) : templates.length === 0 ? (
            <p className="self-center px-2 text-sm text-muted-foreground">Todavía no hay templates guardados.</p>
          ) : templates.map(item => (
            <TemplateListItem
              key={item.id}
              template={item}
              selected={template.id === String(item.id)}
              onDeleteDraft={setDeleteTarget}
            />
          ))}
        </div>
        </header>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear template de impresión</DialogTitle>
              <DialogDescription>Define sus datos iniciales. Después podrás agregar bloques, ajustar el diseño y previsualizarlo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTemplate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-template-name">Nombre</Label>
                <Input id="new-template-name" autoFocus value={newName} onChange={event => setNewName(event.target.value)} placeholder="Detalle de venta" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-template-document-type">Tipo de documento</Label>
                <select id="new-template-document-type" value={newDocumentType} onChange={event => setNewDocumentType(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="SALE">Venta</option>
                  <option value="PRESCRIPTION">Receta</option>
                  <option value="INVOICE">Factura</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-template-paper-size">Tamaño y tipo de hoja</Label>
                <select id="new-template-paper-size" value={newPageSize} onChange={event => setNewPageSize(event.target.value as typeof newPageSize)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="A4">Hoja A4</option>
                  <option value="LETTER">Hoja Carta</option>
                  <option value="THERMAL_80">Térmico 80 mm</option>
                  <option value="THERMAL_58">Térmico 58 mm</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">Se abrirá en el editor como una plantilla nueva. Se guardará en el sistema al pulsar “Guardar diseño”.</p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit">Continuar al editor</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este borrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la versión {deleteTarget?.version.version} de “{deleteTarget?.templateName}”. Las versiones activas e históricas se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteDraft();
              }}
            >
              {deleting ? 'Eliminando…' : 'Eliminar borrador'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
