import React from 'react';
import { usePrintStudio } from './PrintStudioContext';
import { PRINT_FIELDS_REGISTRY, PrintElement, PrintElementType } from '@/lib/printing/design-system';

const BlockEditor: React.FC<{ block: PrintElement; parentId?: string }> = ({ block, parentId }) => {
  const { updateBlock, removeBlock, updateElementInGroup, addElementToGroup, removeElementFromGroup } = usePrintStudio();
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
          <button 
            onClick={removeElement}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Eliminar Grupo
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {['left', 'right'].map(col => (
            <div key={col} className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-gray-500">{col === 'left' ? 'Izquierda' : 'Derecha'}</label>
                <button 
                  onClick={() => addElementToGroup(block.id, 'TEXT', col as 'left' | 'right')}
                  className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded"
                >
                  + Campo
                </button>
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
                    <button 
                      onClick={() => removeElementFromGroup(block.id, child.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
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
    <div className="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-bold uppercase text-gray-400 px-2 py-1 bg-gray-100 rounded">
          {block.type}
        </span>
        <button 
          onClick={removeElement}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Eliminar
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Texto fijo (opcional)</label>
          <input
            type="text"
            value={block.label || ''}
            onChange={(e) => updateElement({ label: e.target.value })}
            className="w-full p-2 border rounded text-sm"
            placeholder="Texto que aparecerá en el comprobante"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Campo de Datos</label>
          <select 
            value={block.fieldKey || ''} 
            onChange={(e) => updateElement({ fieldKey: e.target.value })}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="">-- Seleccionar Campo --</option>
            {Object.entries(PRINT_FIELDS_REGISTRY).map(([key, info]) => (
              <option key={key} value={key}>{info.category}: {info.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alineación</label>
            <select 
              value={properties.alignment || 'left'} 
              onChange={(e) => updateProperty('alignment', e.target.value)}
              className="w-full p-2 border rounded text-sm"
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
              className="w-full p-2 border rounded text-sm"
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
              className="w-full p-2 border rounded text-sm"
            >
              <option value="normal">Normal</option>
              <option value="bold">Negrita</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Margen Superior (px)</label>
            <input 
              type="number" 
              value={properties.marginTop || 0} 
              onChange={(e) => updateProperty('marginTop', parseInt(e.target.value) || 0)}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
        </div>

        <div className="pt-2 border-t">
          <label className="block text-xs font-medium text-gray-700 mb-1">Mostrar solo si (Condición)</label>
          <input 
            type="text" 
              value={properties.visibleIf || ''} 
            onChange={(e) => updateProperty('visibleIf', e.target.value)}
            className="w-full p-2 border rounded text-sm"
            placeholder="Ej: totals.discount > 0"
          />
        </div>
      </div>
    </div>
  );
};

export const TemplateEditor: React.FC = () => {
  const { template, templates, setTemplate, loadTemplate, addBlock, saveTemplate, loading } = usePrintStudio();

  return (
    <div className="flex min-h-full w-full flex-col gap-5 bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-800">Diseño de Template</h2>
          <p className="text-xs text-gray-500">Configura la estructura dinámica de tu ticket</p>
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
            className="text-xs border rounded px-2"
          >
            <option value="">Nueva plantilla</option>
            {templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input
            aria-label="Nombre de plantilla"
            value={template.name}
            onChange={(event) => setTemplate(prev => ({ ...prev, name: event.target.value, templateKey: prev.id === 'new' ? event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : prev.templateKey }))}
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <button 
            onClick={() => saveTemplate()} 
            disabled={loading}
            className="text-xs bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Guardando...' : 'Guardar Diseño'}
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {(['TEXT', 'HEADER', 'SEPARATOR', 'ITEM_LIST', 'TOTALS', 'SPACER', 'COLUMN_GROUP'] as PrintElementType[]).map(type => (
          <button 
            key={type}
            onClick={() => addBlock(type)} 
            className="text-xs bg-white border border-blue-500 text-blue-500 px-3 py-1 rounded hover:bg-blue-50"
          >
            + {type.replace('_', ' ')}
          </button>
        ))}
      </div>
      
      <div className="space-y-4">
        {template.layout.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg text-gray-400">
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
