import React from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePrintStudio } from './PrintStudioContext';
import { PRINT_FIELDS_REGISTRY, PrintElement, PrintElementType } from '@/lib/printing/design-system';

const PropertyDisclosure: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <details className="group border-t border-border pt-2">
    <summary className="flex cursor-pointer list-none items-center justify-between rounded-md py-1 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      Más propiedades
      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-3 pt-3">{children}</div>
  </details>
);

const BLOCK_TITLES: Partial<Record<PrintElementType, string>> = {
  HEADER: 'Encabezado', TEXT: 'Texto', TOTALS: 'Totales', SPACER: 'Espaciador', SEPARATOR: 'Separador',
};

const BlockEditor: React.FC<{ block: PrintElement; parentId?: string }> = ({ block, parentId }) => {
  const { template, updateBlock, removeBlock, updateElementInGroup, addElementToGroup, removeElementFromGroup } = usePrintStudio();
  const properties: PrintElement['properties'] = block.properties || { alignment: 'left' };
  const updateElement = (updates: Partial<PrintElement>) => parentId
    ? updateElementInGroup(parentId, block.id, updates)
    : updateBlock(block.id, updates);
  const removeElement = () => parentId
    ? removeElementFromGroup(parentId, block.id)
    : removeBlock(block.id);

  const updateProperty = (key: keyof PrintElement['properties'], value: any) => {
    updateElement({
      properties: { ...properties, [key]: value }
    });
  };

  if (block.type === 'COLUMN_GROUP') {
    return (
      <div className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold uppercase text-blue-500 px-2 py-1 bg-blue-100 rounded">
            Grupo de Columnas
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={removeElement}>
            <Trash2 data-icon="inline-start" />
            Eliminar Grupo
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {['left', 'right'].map(col => (
            <div key={col} className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-gray-500">{col === 'left' ? 'Izquierda' : 'Derecha'}</label>
                <Button type="button" variant="outline" size="xs" onClick={() => addElementToGroup(block.id, 'TEXT', col as 'left' | 'right')}>
                  <Plus data-icon="inline-start" />
                  Campo
                </Button>
              </div>
              <div className="space-y-2">
                  {block.children?.filter(c => c.properties?.alignment === col).map((child, index) => (
                  <div key={`${child.id || 'child'}-${index}`} className="p-2 bg-white border rounded text-xs flex items-center gap-2">
                    <select
                      aria-label="Campo del elemento"
                      value={child.fieldKey || ''}
                      onChange={(event) => updateElementInGroup(block.id, child.id, { fieldKey: event.target.value })}
                      className="min-w-0 flex-1 border rounded px-1 py-1"
                    >
                      <option value="">Texto fijo</option>
                      {Object.entries(PRINT_FIELDS_REGISTRY).map(([key, info]) => <option key={key} value={key}>{info.label}</option>)}
                    </select>
                    {!child.fieldKey && (
                      <input
                        aria-label="Texto fijo del elemento"
                        value={child.label || ''}
                        onChange={(event) => updateElementInGroup(block.id, child.id, { label: event.target.value })}
                        className="min-w-0 flex-1 border rounded px-1 py-1"
                        placeholder="Texto"
                      />
                    )}
                  <Button type="button" variant="ghost" size="icon-xs" aria-label="Eliminar campo" onClick={() => removeElementFromGroup(block.id, child.id)}>
                    <Trash2 />
                  </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-lg border bg-card px-3 py-2.5 shadow-xs">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-medium text-foreground">{BLOCK_TITLES[block.type] || block.type}</span>
          {block.type === 'SEPARATOR' && <span className="text-xs text-muted-foreground">{template.pageSize === 'THERMAL_58' ? 32 : template.pageSize === 'THERMAL_80' ? 48 : template.pageSize === 'A4' ? 80 : 75} caracteres</span>}
          {block.type === 'SPACER' && <span className="text-xs text-muted-foreground">Espacio en blanco</span>}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Eliminar ${BLOCK_TITLES[block.type] || 'bloque'}`} onClick={removeElement}>
          <Trash2 className="text-muted-foreground" />
        </Button>
      </div>

      <div className="space-y-3">
        {['HEADER', 'TEXT', 'TOTALS'].includes(block.type) && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{block.type === 'TOTALS' ? 'Campo de total' : 'Campo de datos'}</label>
            <select
              value={block.fieldKey || ''}
              onChange={(e) => updateElement({ fieldKey: e.target.value })}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Seleccionar campo…</option>
              {Object.entries(PRINT_FIELDS_REGISTRY).map(([key, info]) => (
                <option key={key} value={key}>{info.category}: {info.label}</option>
              ))}
            </select>
          </div>
        )}

        <PropertyDisclosure>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Título o texto fijo</label>
            <Input
              value={block.label || ''}
              onChange={(e) => updateElement({ label: e.target.value })}
              placeholder="Opcional"
            />
          </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alineación</label>
            <select 
              value={properties.alignment || 'left'} 
              onChange={(e) => updateProperty('alignment', e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tamaño Fuente</label>
            <select 
              value={properties.fontSize || 'md'} 
              onChange={(e) => updateProperty('fontSize', e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="xs">Extra Pequeño</option>
              <option value="sm">Pequeño</option>
              <option value="md">Mediano</option>
              <option value="lg">Grande</option>
              <option value="xl">Extra Grande</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Peso Fuente</label>
            <select 
              value={properties.fontWeight || 'normal'} 
              onChange={(e) => updateProperty('fontWeight', e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="normal">Normal</option>
              <option value="bold">Negrita</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Margen Superior (px)</label>
            <Input
              type="number" 
              value={properties.marginTop || 0} 
              onChange={(e) => updateProperty('marginTop', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mostrar solo si (Condición)</label>
          <Input
            type="text" 
              value={properties.visibleIf || ''} 
            onChange={(e) => updateProperty('visibleIf', e.target.value)}
            placeholder="Ej.: totals.discount > 0"
          />
        </div>
        </PropertyDisclosure>
      </div>
    </div>
  );
};

export const TemplateEditor: React.FC = () => {
  const { template, templates, setTemplate, loadTemplate, addBlock, saveTemplate, loading } = usePrintStudio();
  const blockActions: { type: PrintElementType; label: string }[] = [
    { type: 'HEADER', label: 'Header' },
    { type: 'TEXT', label: 'Text' },
    { type: 'TOTALS', label: 'Totals' },
    { type: 'SPACER', label: 'Spacer' },
    { type: 'SEPARATOR', label: 'Separator' },
    { type: 'ITEM_LIST', label: 'Item list' },
    { type: 'COLUMN_GROUP', label: 'Column group' },
  ];

  return (
    <div className="flex min-h-full w-full flex-col gap-5 bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">Diseño de template</h2>
          <p className="text-xs text-muted-foreground">Configura la estructura de tu comprobante</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <select
            aria-label="Abrir una plantilla guardada"
            value={template.id === 'new' ? '' : template.id}
            onChange={(event) => {
              if (!event.target.value) {
                setTemplate({ id: 'new', name: 'Nuevo Template', templateKey: 'nuevo-template', documentType: 'GENERAL', pageSize: 'THERMAL_80', layout: [] });
              } else {
                void loadTemplate(event.target.value);
              }
            }}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">Nueva plantilla</option>
            {templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Input
            aria-label="Nombre de plantilla"
            value={template.name}
            onChange={(event) => setTemplate(prev => ({ ...prev, name: event.target.value, templateKey: prev.id === 'new' ? event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : prev.templateKey }))}
            className="min-w-0 flex-1"
          />
          <Button type="button" onClick={() => void saveTemplate()} disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar diseño'}
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {blockActions.map(({ type, label }) => (
          <Button type="button" key={type} variant="outline" size="sm" onClick={() => addBlock(type)}>
            <Plus data-icon="inline-start" />
            {label}
          </Button>
        ))}
      </div>
      
      <div className="space-y-4">
        {template.layout.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No hay elementos. Añade uno para empezar a diseñar.
          </div>
        ) : (
          template.layout.map((element, index) => (
            <div key={`${element.id || 'element'}-${index}`} className="relative">
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-gray-300 font-mono text-xs">
                {index + 1}
              </div>
              <BlockEditor block={element} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
