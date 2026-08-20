import type { Cents } from './money'
import { multiplyCents, toCents, sumCents } from './money'

// Tipos del carrito comercial.
// Relacion estricta con Prisma (ver regla de dominio):
//   Consultation -> atencion medica
//   Sale + SaleItem -> venta comercial
//   Service -> catalogo comercial
//   Product -> catalogo comercial
// Consultation NO contiene totalFee comercial. La fuente de verdad es Sale.

export type CartItemKind = 'product' | 'service'

export interface CartItem {
  /** Identificador unico local de linea (no es id de DB). */
  readonly key: string
  readonly kind: CartItemKind
  readonly itemId: number
  readonly name: string
  /** Precio unitario snapshot, en centavos. */
  readonly unitPriceCents: import('./money').Cents
  quantity: number
}

export const computeLineSubtotal = (item: CartItem): Cents =>
  multiplyCents(item.unitPriceCents, item.quantity)

export const computeCartSubtotal = (items: readonly CartItem[]): Cents =>
  sumCents(items.map(computeLineSubtotal))

// El descuento se aplica en porcentaje para mantener consistencia
// con el backend (ver ollmodel sale.service.js -> discount en %).
export const computeCartDiscount = (
  items: readonly CartItem[],
  discountPercent: number,
): Cents => {
  const subtotal = computeCartSubtotal(items)
  if (discountPercent <= 0) return 0 as Cents
  if (discountPercent >= 100) return subtotal
  const factor = discountPercent / 100
  return multiplyCents(subtotal, factor)
}

export const computeCartTotal = (
  items: readonly CartItem[],
  discountPercent: number,
): Cents => {
  const subtotal = computeCartSubtotal(items)
  const discount = computeCartDiscount(items, discountPercent)
  const net = (subtotal as number) - (discount as number)
  return Math.max(0, net) as Cents
}

export const itemToSalePayload = (
  item: CartItem,
): {
  itemType: CartItemKind
  itemId: number
  nameSnapshot: string
  priceSnapshot: number
  quantity: number
} => ({
  itemType: item.kind,
  itemId: item.itemId,
  nameSnapshot: item.name,
  priceSnapshot: (item.unitPriceCents as number) / 100,
  quantity: item.quantity,
})

export const cartToSaleItems = (items: readonly CartItem[]) =>
  items.map(itemToSalePayload)

export const newCartKey = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const toCentsSafe = (price: number | string | undefined | null): Cents => {
  if (price == null) return 0 as Cents
  const n = typeof price === 'string' ? Number(price) : price
  return toCents(Number.isFinite(n) ? n : 0)
}
