'use client';

import React, { useState } from 'react';
import { Copy, Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PrintTemplate, PrintTemplateVersion } from '@/lib/api/printing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
            onClick={() => setTemplate({ id: 'new', name: 'Nuevo Template', templateKey: 'nuevo-template', documentType: 'GENERAL', pageSize: 'THERMAL_80', layout: [] })}
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
