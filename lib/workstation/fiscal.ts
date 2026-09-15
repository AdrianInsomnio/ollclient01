import { type Cents, toCents } from './money'

export const IVA_BASIC_RATE = 0.22

export type FiscalAmounts = {
  unitPriceCents: Cents
  netCents: Cents
  taxCents: Cents
  totalCents: Cents
  ivaIncluded: boolean
  ivaRate: number
}

export function calculateFiscalAmounts(
  unitPrice: number,
  quantity: number,
  ivaIncluded: boolean,
  ivaRate = IVA_BASIC_RATE,
): FiscalAmounts {
  const unitPriceCents = toCents(unitPrice)
  const totalCents = Math.round((unitPriceCents as number) * quantity)
  const netCents = ivaIncluded
    ? Math.round(totalCents / (1 + ivaRate))
    : totalCents
  const taxCents = ivaIncluded
    ? totalCents - netCents
    : Math.round(netCents * ivaRate)
  return {
    unitPriceCents,
    netCents: netCents as Cents,
    taxCents: taxCents as Cents,
    totalCents: totalCents as Cents,
    ivaIncluded,
    ivaRate: ivaRate * 100,
  }
}
