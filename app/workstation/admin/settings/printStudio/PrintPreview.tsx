'use client';
import React from 'react';
import { PrintElement } from '@/lib/printing/design-system';
import { usePrintStudio } from './PrintStudioContext';

const SAMPLE_DATA: Record<string, any> = {
  company: { name: 'Clínica Veterinaria', address: 'Calle Falsa 123', phone: '2400 0000' },
  business: { name: 'Clínica Veterinaria', address: 'Calle Falsa 123' },
  document: { type: 'VENTA', number: '001-000542', date: '09/10/2026', time: '14:35' },
  customer: { name: 'Juan Pérez', document: '12345678', phone: '099 123 456' },
  items: [
    { code: 'SKU-001', name: 'Consulta clínica', quantity: 1, unitPrice: 850, total: 850 },
    { code: 'SKU-002', name: 'Antiparasitario', quantity: 1, unitPrice: 420, total: 420 },
  ],
  totals: { subtotal: 1270, tax: 0, total: 1270, discount: 0 },
  payments: [{ method: 'Efectivo', amount: 1270 }],
  footer: { message: '¡Gracias por su compra!' },
};

const PAGE_WIDTHS: Record<string, { chars: number; px: number }> = {
  THERMAL_58: { chars: 32, px: 300 },
  THERMAL_80: { chars: 48, px: 400 },
  A4: { chars: 80, px: 700 },
  LETTER: { chars: 75, px: 650 },
};

function getPathValue(path: string | undefined): unknown {
  if (!path) return undefined;
  return path.replace(/\[\]/g, '').split('.').reduce<any>((value, key) => value?.[key], SAMPLE_DATA);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toLocaleString('es-UY');
  if (typeof value === 'string') return value;
  return String(value);
}

function isVisible(condition: string | undefined): boolean {
  if (!condition?.trim()) return true;
  const match = condition.match(/^\s*([\w.[\]]+)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+?)\s*$/);
  if (!match) return true;
  const [, path, operator, rawExpected] = match;
  const actual = getPathValue(path);
  const unquoted = rawExpected.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2');
  const numericExpected = Number(unquoted);
  const expected: string | number = unquoted !== '' && Number.isFinite(numericExpected) ? numericExpected : unquoted;
  switch (operator) {
    case '>': return Number(actual) > Number(expected);
    case '<': return Number(actual) < Number(expected);
    case '>=': return Number(actual) >= Number(expected);
    case '<=': return Number(actual) <= Number(expected);
    case '==': case '===': return String(actual) === String(expected);
    case '!=': case '!==': return String(actual) !== String(expected);
    default: return true;
  }
}

function renderElement(element: PrintElement, width: number): string[] {
  if (!isVisible(element.properties.visibleIf)) return [];
  const { type, properties } = element;
  const value = formatValue(getPathValue(element.fieldKey));
  const text = element.label && value ? `${element.label}: ${value}` : element.label || value || element.fieldKey || '';
  const align = properties.alignment || 'left';
  const aligned = (line: string) => {
    if (align === 'center') return line.padStart(Math.floor((width + line.length) / 2));
    if (align === 'right') return line.padStart(width);
    return line;
  };

  switch (type) {
    case 'HEADER':
    case 'TEXT':
      return text ? [aligned(text)] : [];
    case 'LOGO':
      return [aligned(element.label || '[Logo de empresa]')];
    case 'SEPARATOR':
      return ['-'.repeat(width)];
    case 'SPACER':
      return [''];
    case 'ITEM_LIST':
      return SAMPLE_DATA.items.flatMap((item: any) => [
        `${item.quantity} x ${item.name}`,
        `${' '.repeat(Math.max(0, width - formatValue(item.total).length))}${formatValue(item.total)}`,
      ]);
    case 'TOTALS':
      return [`${element.label || 'TOTAL'}${' '.repeat(Math.max(1, width - (element.label || 'TOTAL').length - formatValue(SAMPLE_DATA.totals.total).length))}${formatValue(SAMPLE_DATA.totals.total)}`];
    case 'PAYMENTS':
      return SAMPLE_DATA.payments.map((payment: any) => `${payment.method}${' '.repeat(Math.max(1, width - payment.method.length - formatValue(payment.amount).length))}${formatValue(payment.amount)}`);
    case 'COLUMN_GROUP': {
      const children = element.children || [];
      if (!children.length) return [];
      const columns = children.map(child => {
        const childValue = child.label || formatValue(getPathValue(child.fieldKey)) || child.fieldKey || '';
        return childValue;
      });
      return [columns.join('  |  ')];
    }
    default:
      return text ? [aligned(text)] : [];
  }
}

const mockRenderDynamicTemplate = (layout: PrintElement[], width: number) =>
  layout.flatMap(element => renderElement(element, width)).join('\n');

export const PrintPreview: React.FC = () => {
  const { template } = usePrintStudio();
  const config = PAGE_WIDTHS[template.pageSize] || PAGE_WIDTHS.THERMAL_80;
  const renderedContent = mockRenderDynamicTemplate(template.layout, config.chars);

  return (
    <div className="flex min-h-full flex-col items-center gap-4 bg-muted/30 p-6">
      <div className="mb-4 text-sm text-gray-500 font-mono">
        Vista previa local · {template.pageSize} ({config.chars} caracteres)
      </div>
      <div className="w-full rounded-md border bg-background p-8 shadow-sm" style={{ width: `${config.px + 80}px`, minHeight: '600px' }}>
        <pre className="text-black leading-tight whitespace-pre-wrap break-words" style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '14px' }}>
          {renderedContent || 'Añade bloques para comenzar a diseñar…'}
        </pre>
      </div>
    </div>
  );
};
