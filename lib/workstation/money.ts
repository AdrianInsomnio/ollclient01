// Helpers monetarios tipados.
// Trabajamos SIEMPRE con enteros (centavos) para evitar acumulacion
// de error binario propia de IEEE-754 (regla: no usar Float como
// fuente de verdad comercial).

export type Cents = number & { readonly __brand: 'Cents' }

export const toCents = (value: number): Cents => {
  if (!Number.isFinite(value)) return 0 as Cents
  return Math.round(value * 100) as Cents
}

export const fromCents = (value: Cents | number): number => {
  return (value as number) / 100
}

export const sumCents = (values: Array<Cents | number>): Cents => {
  let total = 0
  for (const v of values) total += v as number
  return total as Cents
}

export const multiplyCents = (value: Cents | number, factor: number): Cents => {
  return Math.round((value as number) * factor) as Cents
}

export const formatMoney = (
  cents: Cents | number,
  currency: string = 'UYU',
  locale: string = 'es-UY',
): string => {
  const value = (cents as number) / 100
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

// Parsea un input humano ("1234,56" -> 123456 centavos).
// Acepta coma o punto como separador decimal y descarta simbolos.
export const parsePriceInput = (raw: string): Cents | null => {
  if (raw == null) return null
  const trimmed = raw.trim().replace(/[^0-9.,-]/g, '')
  if (!trimmed) return null
  const normalized = trimmed.replace(/\./g, '').replace(',', '.')
  const numeric = Number(normalized)
  if (!Number.isFinite(numeric)) return null
  return toCents(numeric)
}

// Convierte un valor arbitrario (number|string|null|undefined) a Cents de forma segura.
export const toCentsSafe = (price: number | string | undefined | null): Cents => {
  if (price == null) return 0 as Cents
  const n = typeof price === 'string' ? Number(price) : price
  return toCents(Number.isFinite(n) ? n : 0)
}
