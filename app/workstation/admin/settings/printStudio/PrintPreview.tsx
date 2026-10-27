'use client';
import React from 'react';
import { PrintElement } from '@/lib/printing/design-system';
import { usePrintStudio } from './PrintStudioContext';

type SampleItem = {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type SamplePayment = {
  method: string;
  amount: number;
};

type SampleData = {
  company: { name: string; address: string; phone: string };
  business: { name: string; address: string };
  document: { type: string; number: string; date: string; time: string };
  customer: { name: string; document: string; phone: string };
  items: SampleItem[];
  totals: { subtotal: number; discount: number; discountPercent: number; tax: number; taxBreakdown: string; total: number };
  payments: SamplePayment[];
  footer: { message: string };
};

const SAMPLE_DATA: SampleData = {
  company: { name: 'Clínica Veterinaria', address: 'Calle Falsa 123', phone: '2400 0000' },
  business: { name: 'Clínica Veterinaria', address: 'Calle Falsa 123' },
  document: { type: 'VENTA', number: '001-000542', date: '09/10/2026', time: '14:35' },
  customer: { name: 'Juan Pérez', document: '12345678', phone: '099 123 456' },
  items: [
    { code: 'SKU-001', name: 'Consulta clínica', quantity: 1, unitPrice: 850, total: 850 },
    { code: 'SKU-002', name: 'Antiparasitario', quantity: 1, unitPrice: 420, total: 420 },
  ],
  totals: { subtotal: 1270, discount: 127, discountPercent: 10, tax: 224.99, taxBreakdown: 'IVA 10%: $ 38,25\nIVA 22%: $ 186,74', total: 1367.99 },
  payments: [{ method: 'Efectivo', amount: 1367.99 }],
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
  return path.replace(/\[\]/g, '').split('.').reduce<unknown>((value, key) => {
    if (typeof value !== 'object' || value === null) return undefined;
    return (value as Record<string, unknown>)[key];
  }, SAMPLE_DATA);
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

function wrapText(value: string, width: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (word.length > width) {
      if (line) { lines.push(line); line = ''; }
      for (let offset = 0; offset < word.length; offset += width) lines.push(word.slice(offset, offset + width));
    } else if (!line) line = word;
    else if (line.length + word.length + 1 <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
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
      return SAMPLE_DATA.items.flatMap((item: SampleItem) => [
        `${item.quantity} x ${item.name}`,
        `${' '.repeat(Math.max(0, width - formatValue(item.total).length))}${formatValue(item.total)}`,
      ]);
    case 'TOTALS': {
      let totalValue = formatValue(getPathValue(element.fieldKey || 'totals.total'));
      if (element.fieldKey === 'totals.discountPercent') totalValue = `${Number(totalValue || 0).toLocaleString('es-UY', { maximumFractionDigits: 2 })}%`;
      else if (element.fieldKey !== 'totals.taxBreakdown' && totalValue) totalValue = `$ ${Number(totalValue).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const defaultLabel: Record<string, string> = {
        'totals.subtotal': 'Subtotal',
        'totals.discount': 'Descuento',
        'totals.discountPercent': 'Descuento (%)',
        'totals.tax': 'IVA',
        'totals.taxBreakdown': 'IVA discriminado',
        'totals.total': 'TOTAL',
      };
      const label = element.label || defaultLabel[element.fieldKey || 'totals.total'] || 'TOTAL';
      const totalText = totalValue ? `${label}: ${totalValue}` : element.label || label;
      return [aligned(totalText)];
    }
    case 'PAYMENTS':
      return SAMPLE_DATA.payments.map((payment: SamplePayment) => `${payment.method}${' '.repeat(Math.max(1, width - payment.method.length - formatValue(payment.amount).length))}${formatValue(payment.amount)}`);
    case 'COLUMN_GROUP': {
      const children = element.children || [];
      if (!children.length) return [];
      const fontSize = element.properties.fontSize || 'md';
      const multiplier = fontSize === 'lg' || fontSize === 'xl' ? 2 : 1;
      const columnWidth = Math.max(1, Math.floor(width / (2 * multiplier)));
      const left = children.filter(child => !['right', 'center'].includes(child.properties?.alignment || 'left'));
      const right = children.filter(child => child.properties?.alignment === 'right');
      const centered = children.filter(child => child.properties?.alignment === 'center');
      const output: string[] = [];
      if (!right.length) {
        for (const child of [...left, ...centered]) {
          const childValue = child.label || formatValue(getPathValue(child.fieldKey)) || child.fieldKey || '';
          output.push(...wrapText(childValue, width).map(line => {
            if (child.properties?.alignment === 'center') return line.padStart(Math.floor((width + line.length) / 2));
            if (child.properties?.alignment === 'right') return line.padStart(width);
            return line;
          }));
        }
        return output;
      }
      for (let row = 0; row < Math.max(left.length, right.length); row++) {
        const leftValue = left[row] ? left[row].label || formatValue(getPathValue(left[row].fieldKey)) || left[row].fieldKey || '' : '';
        const rightValue = right[row] ? right[row].label || formatValue(getPathValue(right[row].fieldKey)) || right[row].fieldKey || '' : '';
        const leftLines = wrapText(leftValue, columnWidth);
        const rightLines = wrapText(rightValue, columnWidth);
        for (let line = 0; line < Math.max(leftLines.length, rightLines.length); line++) {
          output.push(`${(leftLines[line] || '').padEnd(columnWidth)}${(rightLines[line] || '').padStart(columnWidth)}`);
        }
      }
      for (const child of centered) {
        const childValue = child.label || formatValue(getPathValue(child.fieldKey)) || child.fieldKey || '';
        output.push(...wrapText(childValue, width).map(line => line.padStart(Math.floor((width + line.length) / 2))));
      }
      return output;
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
    <div className="flex min-h-full min-w-0 flex-col items-center gap-4 bg-muted/30 p-4 sm:p-6">
      <div className="mb-2 max-w-full break-words text-sm font-mono text-muted-foreground">
        Vista previa local · {template.pageSize} ({config.chars} caracteres)
      </div>
      <div className="w-full max-w-full rounded-xl border bg-background p-5 shadow-sm sm:p-8" style={{ width: `${config.px + 80}px`, maxWidth: '100%', minHeight: '600px', boxSizing: 'border-box' }}>
        <pre className="max-w-full overflow-hidden break-words whitespace-pre-wrap text-black leading-tight" style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '14px' }}>
          {renderedContent || 'Añade bloques para comenzar a diseñar…'}
        </pre>
      </div>
    </div>
  );
};
