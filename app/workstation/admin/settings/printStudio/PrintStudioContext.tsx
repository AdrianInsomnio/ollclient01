import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PrintElement, PrintElementType, PrintSection } from '@/lib/printing/design-system';
import * as PrintingAPI from '@/lib/api/printing';
import type { PrintTemplate } from '@/lib/api/printing';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';

/**
 * Tipos para la configuración del Template de Impresión
 */
export type PaperSize = 'THERMAL_58' | 'THERMAL_80' | 'A4' | 'LETTER';
export type TemplateStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

const toPaperSize = (value?: string): PaperSize =>
  value === 'THERMAL_58' || value === 'THERMAL_80' || value === 'A4' || value === 'LETTER'
    ? value
    : 'THERMAL_80';

export interface PrintTemplateState {
  id: string;
  name: string;
  templateKey: string;
  documentType: string;
  pageSize: PaperSize;
  layout: PrintElement[];
  status?: TemplateStatus;
  versionId?: number;
  version?: number;
  clinicId?: string;
}

interface PrintStudioContextType {
  template: PrintTemplateState;
  setTemplate: React.Dispatch<React.SetStateAction<PrintTemplateState>>;
  templates: PrintTemplate[];
  loading: boolean;
  isReadOnly: boolean;
  enableEditing: () => void;
  updateBlock: (id: string, updates: Partial<PrintElement>) => void;
  updateElementInGroup: (groupId: string, elementId: string, updates: Partial<PrintElement>) => void;
  addElementToGroup: (groupId: string, type: PrintElementType, alignment: 'left' | 'right') => void;
  removeElementFromGroup: (groupId: string, elementId: string) => void;
  addBlock: (type: PrintElementType, section?: PrintSection) => void;
  setBlockSection: (id: string, section: PrintSection) => void;
  removeBlock: (id: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  saveTemplate: () => Promise<void>;
  loadTemplate: (id: string) => Promise<void>;
  cloneTemplate: (id: string) => Promise<void>;
  activateTemplate: (id: string) => Promise<void>;
  deleteDraftTemplateVersion: (versionId: number) => Promise<void>;
  refreshTemplates: () => Promise<void>;
}

const PrintStudioContext = createContext<PrintStudioContextType | undefined>(undefined);

const SECTION_ORDER: Record<PrintSection, number> = { HEADER: 0, DETAIL: 1, FOOTER: 2 };
const DEFAULT_SECTION_BY_TYPE: Record<PrintElementType, PrintSection> = {
  HEADER: 'HEADER', LOGO: 'HEADER', QR: 'HEADER', BARCODE: 'HEADER',
  ITEM_LIST: 'DETAIL', COLUMN_GROUP: 'DETAIL',
  TEXT: 'DETAIL', SEPARATOR: 'DETAIL', SPACER: 'DETAIL', TOTALS: 'FOOTER', PAYMENTS: 'FOOTER',
};

const isSectionAllowed = (type: PrintElementType, section: PrintSection) => {
  if (type === 'HEADER' || type === 'LOGO' || type === 'QR' || type === 'BARCODE') return section === 'HEADER';
    if (type === 'ITEM_LIST') return section === 'DETAIL';
    if (type === 'COLUMN_GROUP') return true;
  if (type === 'TOTALS' || type === 'PAYMENTS') return section === 'FOOTER';
  return true;
};

function normalizePrintLayout(elements: PrintElement[]): PrintElement[] {
  const normalized = elements.map(element => ({
    ...element,
    section: element.section && isSectionAllowed(element.type, element.section)
      ? element.section
      : ['TEXT', 'SEPARATOR', 'SPACER'].includes(element.type)
        ? undefined
        : DEFAULT_SECTION_BY_TYPE[element.type],
  }));

  return normalized
    .map((element, index) => {
      if (element.section) return element;
      const previous = normalized.slice(0, index).reverse().find(candidate => candidate.section)?.section;
      const next = normalized.slice(index + 1).find(candidate => candidate.section)?.section;
      const inferred = previous && previous === next ? previous : previous || next || 'DETAIL';
      return { ...element, section: inferred };
    })
    .sort((a, b) => SECTION_ORDER[a.section!] - SECTION_ORDER[b.section!]);
}

let printElementIdSequence = 0;
const createPrintElementId = () => globalThis.crypto?.randomUUID?.() || `print-element-${Date.now()}-${++printElementIdSequence}`;

function normalizeElementIds(elements: unknown): PrintElement[] {
  const seen = new Set<string>();
  const normalize = (rawElement: unknown): PrintElement => {
    const element = rawElement && typeof rawElement === 'object' ? rawElement as Partial<PrintElement> : {};
    const id = element.id && !seen.has(element.id) ? element.id : createPrintElementId();
    seen.add(id);
    const properties = element.properties && typeof element.properties === 'object' ? element.properties : {};
    return {
      ...element,
      id,
      properties: { alignment: 'left', ...properties },
      ...(Array.isArray(element.children) ? { children: element.children.map(normalize) } : {}),
    } as PrintElement;
  };
  return normalizePrintLayout(Array.isArray(elements) ? elements.map(normalize) : []);
}

export const PrintStudioProvider = ({ children }: { children: ReactNode }) => {
  const [template, setTemplate] = useState<PrintTemplateState>({
    id: 'new',
    name: 'Nuevo Template',
    templateKey: 'nuevo-template',
    documentType: 'GENERAL',
    pageSize: 'THERMAL_80',
    layout: [],
  });
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const isReadOnly = template.id !== 'new' && editingTemplateId !== template.id;

  const refreshTemplates = async () => {
    setLoading(true);
    try {
      const data = await PrintingAPI.getPrintingTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshTemplates(); }, []);

  const saveTemplate = async () => {
    if (isReadOnly) return;
    setLoading(true);
    try {
      let templateId = Number(template.id);
      if (!Number.isInteger(templateId) || templateId < 1) {
        const saved = await PrintingAPI.createPrintingTemplate({
          templateKey: template.templateKey || template.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name: template.name.trim(),
          documentType: template.documentType || 'GENERAL',
        });
        templateId = saved.id;
        setTemplate(prev => ({ ...prev, id: String(saved.id), templateKey: saved.templateKey }));
      }

      const latestVersion = Math.max(0, ...templates
        .filter(item => item.id === templateId)
        .flatMap(item => item.versions.map(version => version.version)));
      const createdVersion = await PrintingAPI.createPrintingTemplateVersion({
        templateId,
        version: latestVersion + 1,
        status: 'DRAFT',
        paperType: template.pageSize.startsWith('THERMAL') ? 'THERMAL' : 'SHEET',
        paperSize: template.pageSize,
        orientation: 'PORTRAIT',
        definition: { elements: template.layout, globalSettings: { defaultAlignment: 'left' } }
      });

      setTemplate(prev => ({ ...prev, versionId: createdVersion.id, version: createdVersion.version, status: createdVersion.status }));
      setEditingTemplateId(String(templateId));
      await refreshTemplates();
      toast.success(`Versión ${createdVersion.version} guardada como borrador`);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        console.error("Error saving template", error);
        toast.error("Ocurrió un error inesperado al guardar la plantilla");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (id: string) => {
    try {
      const templatesList = await PrintingAPI.getPrintingTemplates();
      setTemplates(templatesList);
      const found = templatesList.find(t => String(t.id) === id);
      if (found) {
        setEditingTemplateId(null);
        const details = await PrintingAPI.getPrintingTemplateDetails(found.id);
        const version = [...(details.versions || [])].sort((a, b) => b.version - a.version)[0];
        const definition = version?.definition as { elements?: PrintElement[]; layout?: PrintElement[] } | undefined;
        setTemplate({
          id: String(details.id),
          name: details.name,
          templateKey: details.templateKey,
          documentType: details.documentType,
          pageSize: toPaperSize(version?.paperSize),
          layout: normalizeElementIds(definition?.elements || definition?.layout || []),
          status: version?.status,
          versionId: version?.id,
          version: version?.version
        });
      }
    } catch (error) {
      console.error("Error loading template", error);
    }
  };

  const cloneTemplate = async (id: string) => {
    setLoading(true);
    try {
      const source = templates.find(item => String(item.id) === id);
      if (!source) throw new Error('No se encontró la plantilla para clonar');
      const sourceDetails = await PrintingAPI.getPrintingTemplateDetails(source.id);
      const sourceVersion = [...sourceDetails.versions].sort((a, b) => b.version - a.version)[0];
      const cloned = await PrintingAPI.createPrintingTemplate({
        templateKey: `${source.templateKey}-copy-${Date.now()}`,
        name: `${source.name} (copia)`,
        documentType: source.documentType,
      });
      setTemplate({
        id: String(cloned.id), name: cloned.name, templateKey: cloned.templateKey,
        documentType: cloned.documentType, pageSize: sourceVersion?.paperSize as PaperSize || 'THERMAL_80',
        layout: [], status: 'DRAFT',
      });
      setEditingTemplateId(null);
      const definition = sourceVersion?.definition as { elements?: PrintElement[]; layout?: PrintElement[]; globalSettings?: Record<string, unknown> } | undefined;
      const defaultAlignment = definition?.globalSettings?.defaultAlignment;
      const fontFamily = definition?.globalSettings?.fontFamily;
      const version = await PrintingAPI.createPrintingTemplateVersion({
        templateId: cloned.id,
        version: 1,
        status: 'DRAFT',
        paperType: sourceVersion?.paperType || 'THERMAL',
        paperSize: sourceVersion?.paperSize || 'THERMAL_80',
        orientation: sourceVersion?.orientation || 'PORTRAIT',
        definition: {
          globalSettings: {
            defaultAlignment: defaultAlignment === 'center' || defaultAlignment === 'right' ? defaultAlignment : 'left',
            ...(typeof fontFamily === 'string' ? { fontFamily } : {}),
          },
          elements: normalizeElementIds(structuredClone(definition?.elements || definition?.layout || [])),
        },
      });
      setTemplate({
        id: String(cloned.id), name: cloned.name, templateKey: cloned.templateKey,
        documentType: cloned.documentType, pageSize: version.paperSize as PaperSize,
        layout: (version.definition as { elements?: PrintElement[] }).elements || [],
        status: version.status, versionId: version.id, version: version.version,
      });
      await refreshTemplates();
      toast.success('Plantilla clonada como borrador independiente');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'No se pudo clonar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const activateTemplate = async (id: string) => {
    try {
      const selected = templates.find(item => String(item.id) === id);
      const draft = selected && [...selected.versions].filter(version => version.status === 'DRAFT').sort((a, b) => b.version - a.version)[0];
      if (!draft) throw new Error('La plantilla no tiene una versión borrador para activar');
      await PrintingAPI.activatePrintingTemplateVersion(draft.id);
      await refreshTemplates();
      toast.success(`Versión ${draft.version} activada`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'No se pudo activar la plantilla');
    }
  };

  const deleteDraftTemplateVersion = async (versionId: number) => {
    try {
      await PrintingAPI.deletePrintingTemplateVersion(versionId);
      if (template.versionId === versionId) {
        setTemplate({ id: 'new', name: 'Nuevo Template', templateKey: 'nuevo-template', documentType: 'GENERAL', pageSize: 'THERMAL_80', layout: [] });
      }
      await refreshTemplates();
      toast.success('Borrador eliminado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'No se pudo eliminar el borrador');
      throw error;
    }
  };

  const updateBlock = (id: string, updates: Partial<PrintElement>) => {
    if (isReadOnly) return;
    setTemplate(prev => ({
      ...prev,
      layout: prev.layout.map(block => block.id === id ? { ...block, ...updates } : block)
    }));
  };

  const updateElementInGroup = (groupId: string, elementId: string, updates: Partial<PrintElement>) => {
    if (isReadOnly) return;
    setTemplate(prev => ({
      ...prev,
      layout: prev.layout.map(block => {
        if (block.id === groupId && block.children) {
          return {
            ...block,
            children: block.children.map(child => child.id === elementId ? { ...child, ...updates } : child)
          };
        }
        return block;
      })
    }));
  };

  const addElementToGroup = (groupId: string, type: PrintElementType, alignment: 'left' | 'right') => {
    if (isReadOnly) return;
    setTemplate(prev => ({
      ...prev,
      layout: prev.layout.map(block => {
        if (block.id === groupId && block.children) {
          const newElement: PrintElement = {
            id: createPrintElementId(),
            type,
            properties: { alignment },
            ...(type === 'ITEM_LIST' && { fieldKey: 'items[].name' }), 
            ...(type === 'TOTALS' && { fieldKey: 'totals.total' }),
          };
          return { ...block, children: [...block.children, newElement] };
        }
        return block;
      })
    }));
  };

  const removeElementFromGroup = (groupId: string, elementId: string) => {
    if (isReadOnly) return;
    setTemplate(prev => ({
      ...prev,
      layout: prev.layout.map(block => {
        if (block.id === groupId && block.children) {
          return { ...block, children: block.children.filter(child => child.id !== elementId) };
        }
        return block;
      })
    }));
  };

  const addBlock = (type: PrintElementType, requestedSection = DEFAULT_SECTION_BY_TYPE[type]) => {
    if (isReadOnly) return;
    const section = isSectionAllowed(type, requestedSection) ? requestedSection : DEFAULT_SECTION_BY_TYPE[type];
    const newBlock: PrintElement = {
      id: createPrintElementId(),
      type,
      section,
      properties: { alignment: 'left' },
      ...(type === 'COLUMN_GROUP' && { children: [] }),
      ...(type === 'ITEM_LIST' && { fieldKey: 'items[].name' }), 
      ...(type === 'TOTALS' && { fieldKey: 'totals.total' }),
    };
    setTemplate(prev => ({ ...prev, layout: normalizePrintLayout([...prev.layout, newBlock]) }));
  };

  const setBlockSection = (id: string, section: PrintSection) => {
    if (isReadOnly) return;
    setTemplate(prev => ({
      ...prev,
      layout: normalizePrintLayout(prev.layout.map(block =>
        block.id === id && isSectionAllowed(block.type, section) ? { ...block, section } : block
      )),
    }));
  };

  const removeBlock = (id: string) => {
    if (isReadOnly) return;
    setTemplate(prev => ({ ...prev, layout: prev.layout.filter(b => b.id !== id) }));
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    if (isReadOnly) return;
    setTemplate(prev => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.layout.length || toIndex >= prev.layout.length) return prev;
      if (prev.layout[fromIndex].section !== prev.layout[toIndex].section) return prev;
      const newLayout = [...prev.layout];
      const [movedItem] = newLayout.splice(fromIndex, 1);
      newLayout.splice(toIndex, 0, movedItem);
      return { ...prev, layout: newLayout };
    });
  };

  return (
    <PrintStudioContext.Provider value={{ 
        template, setTemplate, templates, loading, isReadOnly, enableEditing: () => setEditingTemplateId(template.id), updateBlock, updateElementInGroup, addElementToGroup, removeElementFromGroup, addBlock, setBlockSection, removeBlock, moveBlock,
      saveTemplate, loadTemplate, cloneTemplate, activateTemplate, deleteDraftTemplateVersion, refreshTemplates
    }}>
      {children}
    </PrintStudioContext.Provider>
  );
};

export const usePrintStudio = () => {
  const context = useContext(PrintStudioContext);
  if (!context) throw new Error('usePrintStudio must be used within a PrintStudioProvider');
  return context;
};
