import { Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TicketSummaryProps = {
  subtotal: number;
  tax: number;
  total: number;
  discountOpen: boolean;
  discountRate: string;
  formatMoney: (value: number) => string;
  onDiscountRateChange: (value: string) => void;
};

export function TicketSummary({
  subtotal,
  tax,
  total,
  discountOpen,
  discountRate,
  formatMoney,
  onDiscountRateChange,
}: TicketSummaryProps) {
  return (
    <>
      <div className="shrink-0 border-t border-slate-100 bg-white px-4">
        <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
          {discountOpen && <div className="flex items-center justify-between gap-3"><Label htmlFor="discount-rate" className="flex items-center gap-1 text-slate-500"><Percent className="size-3.5" />Descuento</Label><div className="flex items-center gap-1"><Input id="discount-rate" type="number" min="0" max="100" step="0.01" value={discountRate} onChange={(event) => onDiscountRateChange(event.target.value)} className="h-8 w-20 text-right" /><span className="text-xs text-slate-400">%</span></div></div>}
          <div className="flex justify-between text-slate-500"><span>Impuestos</span><span>{formatMoney(tax)}</span></div>
        </div>
      </div>
      <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Total a cobrar</span><span className="text-2xl font-bold tracking-tight text-teal-800">{formatMoney(total)}</span></div></div>
    </>
  );
}
