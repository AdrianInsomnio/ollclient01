'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintStudioProvider } from '../settings/printStudio/PrintStudioContext';
import { TemplateEditor } from '../settings/printStudio/TemplateEditor';
import { PrintPreview } from '../settings/printStudio/PrintPreview';
import { TemplateList } from '../settings/printStudio/TemplateList';

export default function PrintStudioWorkspacePage() {
  return (
    <PrintStudioProvider>
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden bg-background">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Printer className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Administración / Documentos</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Diseñador de impresión</h1>
              <p className="mt-1 text-sm text-muted-foreground">Organiza las zonas del comprobante y revisa el resultado en papel.</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/workstation/admin/settings/printing"><ArrowLeft data-icon="inline-start" /> Configuración de impresoras</Link>
          </Button>
        </header>

        <div className="min-w-0 shrink-0 overflow-hidden rounded-2xl border bg-background">
          <TemplateList />
        </div>

        <main className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 overflow-y-auto 2xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] 2xl:overflow-hidden">
          <section aria-label="Editor de plantilla" className="min-w-0 rounded-2xl border bg-background 2xl:min-h-0 2xl:overflow-y-auto">
            <TemplateEditor />
          </section>
          <section aria-label="Vista previa de impresión" className="min-w-0 rounded-2xl border bg-muted/30 2xl:min-h-0 2xl:overflow-y-auto">
            <PrintPreview />
          </section>
        </main>
      </div>
    </PrintStudioProvider>
  );
}
