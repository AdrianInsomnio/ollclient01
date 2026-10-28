import React from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Columns2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePrintStudio } from './PrintStudioContext';
import { PRINT_FIELDS_REGISTRY, PrintElement, PrintElementType, PrintSection } from '@/lib/printing/design-system';

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
  HEADER: 'Campo de encabezado', TEXT: 'Texto libre', TOTALS: 'Totales', PAYMENTS: 'Pagos', SPACER: 'Espaciador',
  SEPARATOR: 'Separador', ITEM_LIST: 'Lista de artículos', COLUMN_GROUP: 'Grupo de columnas',
};

const saleDetailLayout: PrintElement[] = [
  { id: 'sale-business', type: 'HEADER', section: 'HEADER', fieldKey: 'company.name', properties: { alignment: 'center', fontSize: 'lg', fontWeight: 'bold', marginBottom: 2 } },
  { id: 'sale-title', type: 'TEXT', section: 'HEADER', label: 'DETALLE DE VENTA', properties: { alignment: 'center', fontSize: 'md', fontWeight: 'bold', marginBottom: 2 } },
  { id: 'sale-divider-header', type: 'SEPARATOR', section: 'HEADER', properties: { alignment: 'left', marginBottom: 1 } },
  { id: 'sale-number', type: 'COLUMN_GROUP', section: 'DETAIL', properties: { alignment: 'left', fontWeight: 'bold' }, children: [
    { id: 'sale-number-field', type: 'TEXT', fieldKey: 'document.number', label: 'Venta', properties: { alignment: 'left' } },
    { id: 'sale-date-field', type: 'TEXT', fieldKey: 'document.date', label: 'Fecha', properties: { alignment: 'right' } },
  ] },
  { id: 'sale-customer', type: 'HEADER', section: 'DETAIL', fieldKey: 'customer.name', label: 'Cliente', properties: { alignment: 'left', fontWeight: 'bold' } },
  { id: 'sale-customer-document', type: 'TEXT', section: 'DETAIL', fieldKey: 'customer.document', label: 'Documento', properties: { alignment: 'left' } },
  { id: 'sale-customer-phone', type: 'TEXT', section: 'DETAIL', fieldKey: 'customer.phone', label: 'Teléfono', properties: { alignment: 'left' } },
  { id: 'sale-pet', type: 'TEXT', section: 'DETAIL', fieldKey: 'context.petName', label: 'Mascota', properties: { alignment: 'left' } },
  { id: 'sale-status', type: 'TEXT', section: 'DETAIL', fieldKey: 'context.status', label: 'Estado', properties: { alignment: 'left' } },
  { id: 'sale-shift', type: 'TEXT', section: 'DETAIL', fieldKey: 'context.cashShift', label: 'Turno', properties: { alignment: 'left' } },
  { id: 'sale-divider-items', type: 'SEPARATOR', section: 'DETAIL', properties: { alignment: 'left', marginTop: 1 } },
  { id: 'sale-items', type: 'ITEM_LIST', section: 'DETAIL', label: 'ARTÍCULOS', properties: { alignment: 'left', fontWeight: 'normal' } },
  { id: 'sale-divider-totals', type: 'SEPARATOR', section: 'FOOTER', properties: { alignment: 'left', marginTop: 1 } },
  { id: 'sale-subtotal', type: 'TOTALS', section: 'FOOTER', fieldKey: 'totals.subtotal', label: 'Subtotal', properties: { alignment: 'right' } },
  { id: 'sale-discount', type: 'TOTALS', section: 'FOOTER', fieldKey: 'totals.discount', label: 'Descuento', properties: { alignment: 'right' } },
  { id: 'sale-tax', type: 'TOTALS', section: 'FOOTER', fieldKey: 'totals.tax', label: 'Impuestos', properties: { alignment: 'right' } },
  { id: 'sale-total', type: 'TOTALS', section: 'FOOTER', fieldKey: 'totals.total', label: 'TOTAL', properties: { alignment: 'right', fontSize: 'lg', fontWeight: 'bold', marginTop: 1 } },
  { id: 'sale-payments', type: 'PAYMENTS', section: 'FOOTER', label: 'PAGOS', properties: { alignment: 'left', marginTop: 1 } },
  { id: 'sale-notes', type: 'TEXT', section: 'FOOTER', fieldKey: 'footer.notes', label: 'Notas', properties: { alignment: 'left', marginTop: 1 } },
  { id: 'sale-thanks', type: 'TEXT', section: 'FOOTER', label: 'Gracias por su compra', properties: { alignment: 'center', fontWeight: 'bold', marginTop: 2 } },
];

const SECTION_LABELS: Record<PrintSection, string> = { HEADER: 'Encabezado', DETAIL: 'Detalle', FOOTER: 'Pie del comprobante' };
const ALLOWED_BLOCKS: Record<PrintSection, Array<{ type: PrintElementType; label: string }>> = {
  HEADER: [
    { type: 'HEADER', label: 'Campo de encabezado' },
    { type: 'TEXT', label: 'Texto libre' },
    { type: 'COLUMN_GROUP', label: 'Dos columnas (izquierda y derecha)' },
    { type: 'SEPARATOR', label: 'Separador' },
    { type: 'SPACER', label: 'Espaciador' },
  ],
  DETAIL: [
    { type: 'TEXT', label: 'Texto libre' },
    { type: 'ITEM_LIST', label: 'Lista de artículos' },
    { type: 'COLUMN_GROUP', label: 'Dos columnas (izquierda y derecha)' },
    { type: 'SEPARATOR', label: 'Separador' },
    { type: 'SPACER', label: 'Espaciador' },
  ],
  FOOTER: [
    { type: 'TEXT', label: 'Texto libre' },
    { type: 'TOTALS', label: 'Totales' },
    { type: 'PAYMENTS', label: 'Pagos' },
    { type: 'COLUMN_GROUP', label: 'Dos columnas (izquierda y derecha)' },
    { type: 'SEPARATOR', label: 'Separador' },
    { type: 'SPACER', label: 'Espaciador' },
  ],
};

const ALLOWED_SECTIONS_BY_TYPE: Record<PrintElementType, PrintSection[]> = {
  HEADER: ['HEADER'], LOGO: ['HEADER'], QR: ['HEADER'], BARCODE: ['HEADER'],
  ITEM_LIST: ['DETAIL'], COLUMN_GROUP: ['HEADER', 'DETAIL', 'FOOTER'], TOTALS: ['FOOTER'], PAYMENTS: ['FOOTER'],
  TEXT: ['HEADER', 'DETAIL', 'FOOTER'], SEPARATOR: ['HEADER', 'DETAIL', 'FOOTER'], SPACER: ['HEADER', 'DETAIL', 'FOOTER'],
};

const BlockEditor: React.FC<{
  block: PrintElement;
  parentId?: string;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}> = ({ block, parentId, canMoveUp, canMoveDown, onMoveUp, onMoveDown }) => {
  const { template, updateBlock, removeBlock, setBlockSection, updateElementInGroup, addElementToGroup, removeElementFromGroup } = usePrintStudio();
  const properties: PrintElement['properties'] = block.properties || { alignment: 'left' };
  const updateElement = (updates: Partial<PrintElement>) => parentId
    ? updateElementInGroup(parentId, block.id, updates)
    : updateBlock(block.id, updates);
  const removeElement = () => parentId
    ? removeElementFromGroup(parentId, block.id)
    : removeBlock(block.id);

  const updateProperty = (key: keyof PrintElement['properties'], value: PrintElement['properties'][keyof PrintElement['properties']]) => {
    updateElement({
      properties: { ...properties, [key]: value }
    });
  };

  if (block.type === 'COLUMN_GROUP') {
    const leftChildren = block.children?.filter(child => child.properties?.alignment === 'left') || [];
    const rightChildren = block.children?.filter(child => child.properties?.alignment === 'right') || [];
    const sharedProperties = block.properties || { alignment: 'left' };
    const updateSharedProperty = (key: keyof PrintElement['properties'], value: PrintElement['properties'][keyof PrintElement['properties']]) =>
      updateBlock(block.id, { properties: { ...sharedProperties, [key]: value } });

    return (
      <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-900/70 dark:text-blue-100">
            Dos columnas · izquierda y derecha
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={removeElement}>
            <Trash2 data-icon="inline-start" />
            Eliminar fila
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            { alignment: 'left' as const, title: 'Izquierda', children: leftChildren },
            { alignment: 'right' as const, title: 'Derecha', children: rightChildren },
          ]).map(column => (
            <div key={column.alignment} className="min-w-0 space-y-2 rounded-lg border border-blue-200/80 bg-background/80 p-3 dark:border-blue-900/60">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-foreground">{column.title}</label>
                <Button type="button" variant="outline" size="xs" onClick={() => addElementToGroup(block.id, 'TEXT', column.alignment)}>
                  <Plus data-icon="inline-start" />
                  Componente
                </Button>
              </div>
              {column.children.length ? column.children.map((child, index) => (
                <div key={`${child.id || 'child'}-${index}`} className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border bg-background p-2">
                  <select
                    aria-label={`Campo para columna ${column.title.toLowerCase()}`}
                    value={child.fieldKey || ''}
                    onChange={(event) => updateElementInGroup(block.id, child.id, { fieldKey: event.target.value })}
                    className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Texto fijo</option>
                    {Object.entries(PRINT_FIELDS_REGISTRY).map(([key, info]) => <option key={key} value={key}>{info.label}</option>)}
                  </select>
                  {!child.fieldKey && (
                    <Input
                      aria-label={`Texto fijo para columna ${column.title.toLowerCase()}`}
                      value={child.label || ''}
                      onChange={(event) => updateElementInGroup(block.id, child.id, { label: event.target.value })}
                      className="min-w-0 flex-1"
                      placeholder="Texto"
                    />
                  )}
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Eliminar componente de ${column.title.toLowerCase()}`} onClick={() => removeElementFromGroup(block.id, child.id)}>
                    <Trash2 />
                  </Button>
                </div>
              )) : <p className="text-xs text-muted-foreground">Sin componente</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-blue-200/80 pt-3 dark:border-blue-900/60">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fuente común</label>
            <select value={sharedProperties.fontFamily || 'A'} onChange={event => updateSharedProperty('fontFamily', event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="A">Estándar (A)</option><option value="B">Compacta (B)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tamaño común</label>
            <select value={sharedProperties.fontSize || 'md'} onChange={event => updateSharedProperty('fontSize', event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="xs">Extra pequeño</option><option value="sm">Pequeño</option><option value="md">Mediano</option><option value="lg">Grande</option><option value="xl">Extra grande</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Estilo común</label>
            <select value={sharedProperties.fontWeight || 'normal'} onChange={event => updateSharedProperty('fontWeight', event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="normal">Normal</option><option value="bold">Negrita</option>
            </select>
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">La fuente, el tamaño y la negrita se comparten. El texto se ajusta al ancho de cada mitad.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 min-w-0 overflow-hidden rounded-lg border bg-card px-3 py-2.5 shadow-xs">
        <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 break-words text-sm font-medium text-foreground">{BLOCK_TITLES[block.type] || block.type}</span>
            {block.type === 'SEPARATOR' && <span className="text-xs text-muted-foreground">{template.pageSize === 'THERMAL_58' ? 32 : template.pageSize === 'THERMAL_80' ? 48 : template.pageSize === 'A4' ? 80 : 75} caracteres</span>}
            {block.type === 'SPACER' && <span className="text-xs text-muted-foreground">Espacio en blanco</span>}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {!parentId && (
              <>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Mover bloque hacia arriba" disabled={!canMoveUp} onClick={onMoveUp}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Mover bloque hacia abajo" disabled={!canMoveDown} onClick={onMoveDown}>
                  <ArrowDown className="size-4" />
                </Button>
                <select
                  aria-label="Zona semántica del bloque"
                  value={block.section || 'DETAIL'}
                  onChange={(event) => setBlockSection(block.id, event.target.value as PrintSection)}
                  className="h-8 max-w-36 min-w-0 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {ALLOWED_SECTIONS_BY_TYPE[block.type].map(section => <option key={section} value={section}>{SECTION_LABELS[section]}</option>)}
                </select>
              </>
            )}
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Eliminar ${BLOCK_TITLES[block.type] || 'bloque'}`} onClick={removeElement}>
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        </div>

      <div className="min-w-0 space-y-3">
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
  const { template, templates, setTemplate, loadTemplate, addBlock, moveBlock, saveTemplate, loading, isReadOnly, enableEditing } = usePrintStudio();
  const [confirmEditOpen, setConfirmEditOpen] = React.useState(false);
  const [newBlockTypes, setNewBlockTypes] = React.useState<Record<PrintSection, PrintElementType>>({ HEADER: 'HEADER', DETAIL: 'ITEM_LIST', FOOTER: 'TOTALS' });
  const sections: Array<{ id: PrintSection; title: string; description: string }> = [
    { id: 'HEADER', title: 'Encabezado', description: 'Identifica el negocio y el documento.' },
    { id: 'DETAIL', title: 'Detalle', description: 'Organiza los artículos y la información principal.' },
    { id: 'FOOTER', title: 'Pie del comprobante', description: 'Cierra el comprobante con totales y pagos.' },
  ];
  const sectionStyles: Record<PrintSection, { container: string; title: string; badge: string }> = {
    HEADER: {
      container: 'border-sky-200 bg-sky-50/70 dark:border-sky-900/70 dark:bg-sky-950/25',
      title: 'text-sky-950 dark:text-sky-100',
      badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-100',
    },
    DETAIL: {
      container: 'border-teal-200 bg-teal-50/70 dark:border-teal-900/70 dark:bg-teal-950/25',
      title: 'text-teal-950 dark:text-teal-100',
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/70 dark:text-teal-100',
    },
    FOOTER: {
      container: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/25',
      title: 'text-amber-950 dark:text-amber-100',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-100',
    },
  };

  return (
    <div className="flex min-h-full min-w-0 w-full flex-col gap-5 bg-background p-4 sm:p-6">
      <div className="mb-2 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">Estructura del comprobante</h2>
          <p className="text-xs text-muted-foreground">Organiza encabezado, detalle y pie de impresión</p>
        </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setTemplate({
              id: 'new', name: 'Detalle de venta (A4)', templateKey: 'sale-detail-a4', documentType: 'SALE', pageSize: 'A4',
              layout: saleDetailLayout.map(block => ({ ...block, properties: { ...block.properties }, ...(block.children ? { children: block.children.map(child => ({ ...child, properties: { ...child.properties } })) } : {}) })),
            })}>
              Usar diseño de detalle de venta
            </Button>
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
            disabled={isReadOnly}
            onChange={(event) => setTemplate(prev => ({ ...prev, name: event.target.value, templateKey: prev.id === 'new' ? event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : prev.templateKey }))}
            className="min-w-[180px] max-w-full flex-1 basis-60"
          />
          {isReadOnly ? (
            <Button type="button" onClick={() => setConfirmEditOpen(true)}>Editar plantilla</Button>
          ) : (
            <Button type="button" onClick={() => void saveTemplate()} disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar diseño'}
            </Button>
          )}
        </div>
      </div>
      
      <fieldset disabled={isReadOnly} className="m-0 min-w-0 space-y-6 border-0 p-0 disabled:opacity-80">
        {sections.map(section => {
          const blocks = template.layout
            .map((element, globalIndex) => ({ element, globalIndex }))
            .filter(({ element }) => (element.section || 'DETAIL') === section.id);
          const options = ALLOWED_BLOCKS[section.id];
          return (
            <section key={section.id} aria-labelledby={`section-${section.id}`} className={`min-w-0 space-y-3 overflow-hidden rounded-xl border p-4 sm:p-5 ${sectionStyles[section.id].container}`}>
              <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 id={`section-${section.id}`} className={`inline-flex rounded-md px-2 py-1 text-sm font-semibold ${sectionStyles[section.id].badge} ${sectionStyles[section.id].title}`}>{section.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{section.description} · {blocks.length} {blocks.length === 1 ? 'bloque' : 'bloques'}</p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <select
                    aria-label={`Tipo de bloque para ${section.title.toLowerCase()}`}
                    value={newBlockTypes[section.id]}
                    onChange={(event) => setNewBlockTypes(prev => ({ ...prev, [section.id]: event.target.value as PrintElementType }))}
                    className="h-8 max-w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {options.map(option => <option key={option.type} value={option.type}>{option.label}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock('COLUMN_GROUP', section.id)}>
                    <Columns2 data-icon="inline-start" />
                    Dos columnas
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock(newBlockTypes[section.id], section.id)}>
                    <Plus data-icon="inline-start" />
                    Agregar
                  </Button>
                </div>
              </div>
              {blocks.length ? (
                <div className="space-y-2">
                  {blocks.map(({ element, globalIndex }, sectionIndex) => (
                    <BlockEditor
                      key={element.id}
                      block={element}
                      canMoveUp={sectionIndex > 0}
                      canMoveDown={sectionIndex < blocks.length - 1}
                      onMoveUp={() => moveBlock(globalIndex, globalIndex - 1)}
                      onMoveDown={() => moveBlock(globalIndex, globalIndex + 1)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">Sin bloques en esta zona.</p>
              )}
            </section>
          );
        })}
      </fieldset>
      <AlertDialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Editar esta plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              La plantilla se abrió en modo de solo lectura. Al continuar podrás modificar el diseño y guardar una nueva versión borrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={enableEditing}>Continuar edición</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
