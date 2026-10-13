export type PrintElementType = 
  | 'TEXT' 
  | 'HEADER' 
  | 'SEPARATOR' 
  | 'ITEM_LIST' 
  | 'TOTALS' 
  | 'PAYMENTS' 
  | 'LOGO' 
  | 'QR' 
  | 'BARCODE' 
  | 'SPACER'
  | 'COLUMN_GROUP';

export type PrintSection = 'HEADER' | 'DETAIL' | 'FOOTER';

export interface PrintElementProperties {
  alignment?: 'left' | 'center' | 'right';
  fontFamily?: 'A' | 'B';
  fontSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fontWeight?: 'normal' | 'bold';
  marginTop?: number;
  marginBottom?: number;
  width?: string; // e.g., '100%', '50mm'
  columnWidth?: string;
  columnAlignment?: 'left' | 'center' | 'right';
  visibleIf?: string; // Simple condition key
}

export interface PrintElement {
  id: string;
  type: PrintElementType;
  section?: PrintSection;
  fieldKey?: string; // e.g., 'company.name', 'document.number'
  label?: string;    // Label to show if it's a fixed field
  properties: PrintElementProperties;
  children?: PrintElement[]; // For COLUMN_GROUP
}

export interface PrintTemplateDefinition {
  elements: PrintElement[];
  globalSettings: {
    fontFamily?: string;
    defaultAlignment?: 'left' | 'center' | 'right';
  };
}

export const PRINT_FIELDS_REGISTRY: Record<string, { key: string; label: string; category: string; repeatable?: boolean }> = {
  'company.name': { key: 'company.name', label: 'Nombre Empresa', category: 'Empresa' },
  'company.logo': { key: 'company.logo', label: 'Logo', category: 'Empresa' },
  'company.address': { key: 'company.address', label: 'Dirección', category: 'Empresa' },
  'company.phone': { key: 'company.phone', label: 'Teléfono', category: 'Empresa' },
  'document.number': { key: 'document.number', label: 'Número Documento', category: 'Documento' },
  'document.date': { key: 'document.date', label: 'Fecha', category: 'Documento' },
  'document.time': { key: 'document.time', label: 'Hora', category: 'Documento' },
  'document.type': { key: 'document.type', label: 'Tipo de Documento', category: 'Documento' },
  'customer.name': { key: 'customer.name', label: 'Nombre Cliente', category: 'Cliente' },
  'customer.document': { key: 'customer.document', label: 'Documento Cliente', category: 'Cliente' },
  'customer.phone': { key: 'customer.phone', label: 'Teléfono Cliente', category: 'Cliente' },
  'items[].code': { key: 'items[].code', label: 'Código Producto', category: 'Ítems', repeatable: true },
  'items[].name': { key: 'items[].name', label: 'Nombre Producto', category: 'Ítems', repeatable: true },
  'items[].quantity': { key: 'items[].quantity', label: 'Cantidad', category: 'Ítems', repeatable: true },
  'items[].unitPrice': { key: 'items[].unitPrice', label: 'Precio Unit.', category: 'Ítems', repeatable: true },
  'items[].total': { key: 'items[].total', label: 'Subtotal', category: 'Ítems', repeatable: true },
  'totals.subtotal': { key: 'totals.subtotal', label: 'Subtotal', category: 'Totales' },
  'totals.discount': { key: 'totals.discount', label: 'Descuento', category: 'Totales' },
  'totals.discountPercent': { key: 'totals.discountPercent', label: 'Porcentaje de descuento', category: 'Totales' },
  'totals.tax': { key: 'totals.tax', label: 'Impuestos', category: 'Totales' },
  'totals.taxBreakdown': { key: 'totals.taxBreakdown', label: 'IVA discriminado por tasa', category: 'Totales' },
  'totals.total': { key: 'totals.total', label: 'Total General', category: 'Totales' },
  'payments[].method': { key: 'payments[].method', label: 'Método Pago', category: 'Pagos', repeatable: true },
  'payments[].amount': { key: 'payments[].amount', label: 'Monto Pago', category: 'Pagos', repeatable: true },
};

export const DOCUMENT_CONTEXTS: Record<string, string[]> = {
  'SALE': ['company', 'document', 'customer', 'items', 'totals', 'payments'],
  'KITCHEN': ['company', 'document', 'items'],
  'CASH_IN': ['company', 'document', 'payments'],
  'CASH_OUT': ['company', 'document', 'payments'],
};
