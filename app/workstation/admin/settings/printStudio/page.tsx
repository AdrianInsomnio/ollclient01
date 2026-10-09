'use client';
import React from 'react';
import { PrintStudioProvider } from './PrintStudioContext';
import { TemplateEditor } from './TemplateEditor';
import { PrintPreview } from './PrintPreview';
import { TemplateList } from './TemplateList';

export default function PrintStudioPage() {
  return (
    <PrintStudioProvider>
      <div className="flex h-screen min-h-[640px] flex-col overflow-hidden bg-background">
        <TemplateList />
        <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="min-h-0 overflow-y-auto border-b xl:border-b-0 xl:border-r">
            <TemplateEditor />
          </section>
          <section className="min-h-0 overflow-auto bg-muted/30">
            <PrintPreview />
          </section>
        </main>
      </div>
    </PrintStudioProvider>
  );
}
