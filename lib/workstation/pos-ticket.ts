import type { Product } from "@/lib/api/products";
import type { Service } from "@/lib/api/services";
import { calculateFiscalAmounts } from "@/lib/workstation/fiscal";

export type PosTicketItem = {
  itemType: "product" | "service";
  item: Product | Service;
  quantity: number;
  unitPrice?: number;
};
export type PosTicketPayment = { method: string; amount: string };
export type PosTicketCharge = { totalAmount: number };

export function calculatePosTicketTotals({
  cart,
  charges,
  discountRate,
  paymentLines,
}: {
  cart: PosTicketItem[];
  charges: PosTicketCharge[];
  discountRate: string;
  paymentLines: PosTicketPayment[];
}) {
  const fiscalLines = cart.map((entry) =>
    calculateFiscalAmounts(
      Number(entry.unitPrice ?? entry.item.price),
      entry.quantity,
      entry.itemType === "product"
        ? (entry.item as Product).ivaIncluded !== false
        : false,
    ),
  );
  const netSubtotal =
    fiscalLines.reduce((sum, line) => sum + (line.netCents as number), 0) / 100;
  const taxSubtotal =
    fiscalLines.reduce((sum, line) => sum + (line.taxCents as number), 0) / 100;
  const subtotal =
    netSubtotal + charges.reduce((sum, item) => sum + item.totalAmount, 0);
  const rate = Number(discountRate) || 0;
  const discount = (subtotal * rate) / 100;
  const tax = charges.length ? 0 : taxSubtotal * (1 - rate / 100);
  const total = subtotal - discount + tax;
  const paymentReceived = paymentLines.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0,
  );
  const pendingBalance = Math.max(0, total - paymentReceived);
  const overpayment = Math.max(0, paymentReceived - total);
  const paid = paymentLines.reduce(
    (sum, line, index) =>
      sum +
      (Number(line.amount) ||
        (paymentLines.length === 1 && index === 0 ? total : 0)),
    0,
  );

  return {
    netSubtotal,
    taxSubtotal,
    subtotal,
    discount,
    tax,
    total,
    hasTicketItems: cart.length > 0 || charges.length > 0,
    paymentReceived,
    pendingBalance,
    overpayment,
    paid,
    change: Math.max(0, paid - total),
    isCash: paymentLines[0]?.method === "cash",
  };
}
