import { Banknote, CreditCard, QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PosPaymentLine = { method: string; amount: string };

type PaymentPanelProps = {
  lines: PosPaymentLine[];
  paymentLabels: Record<string, string>;
  total: number;
  change: number;
  paymentReceived: number;
  pendingBalance: number;
  overpayment: number;
  isCash: boolean;
  formatMoney: (value: number) => string;
  onAddPayment: () => void;
  onMethodChange: (index: number, method: string) => void;
  onAmountChange: (index: number, amount: string) => void;
  onRemovePayment: (index: number) => void;
};

export function PaymentPanel({
  lines, paymentLabels, total, change, paymentReceived, pendingBalance,
  overpayment, isCash, formatMoney, onAddPayment, onMethodChange,
  onAmountChange, onRemovePayment,
}: PaymentPanelProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Medio de pago</p><Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-teal-700" onClick={onAddPayment}>+ Mixto</Button></div>
      <Tabs value={lines[0]?.method} onValueChange={(value) => onMethodChange(0, value)}>
        <TabsList className="grid h-9 w-full grid-cols-3 bg-white"><TabsTrigger value="cash" className="text-[11px]"><Banknote className="size-3.5" />Efectivo</TabsTrigger><TabsTrigger value="debit_card" className="text-[11px]"><CreditCard className="size-3.5" />Tarjeta</TabsTrigger><TabsTrigger value="bank_transfer" className="text-[11px]"><QrCode className="size-3.5" />QR</TabsTrigger></TabsList>
        <TabsContent value={lines[0]?.method} className="mt-3 space-y-2">
          <div className="space-y-1"><Label htmlFor="payment-amount" className="text-xs text-slate-500">{isCash ? "Efectivo recibido" : "Importe"}</Label><Input id="payment-amount" type="number" min="0" step="0.01" value={lines[0]?.amount} placeholder={total.toFixed(2)} onChange={(event) => onAmountChange(0, event.target.value)} /></div>
          {isCash && <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs"><span className="text-emerald-800">Vuelto</span><strong className="text-emerald-800">{formatMoney(change)}</strong></div>}
          {lines.length > 1 && <div className="space-y-2 border-t border-slate-200 pt-2">{lines.slice(1).map((line, index) => { const lineIndex = index + 1; return <div key={lineIndex} className="flex items-center gap-2"><Select value={line.method} onValueChange={(value) => onMethodChange(lineIndex, value)}><SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(paymentLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Input className="h-8 w-28 text-xs" type="number" min="0" value={line.amount} onChange={(event) => onAmountChange(lineIndex, event.target.value)} placeholder="Importe" /><Button type="button" variant="ghost" size="icon-sm" className="size-8 shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => onRemovePayment(lineIndex)} aria-label={`Quitar medio de pago ${lineIndex + 1}`} title="Quitar medio de pago"><Trash2 className="size-4" aria-hidden="true" /></Button></div>; })}</div>}
        </TabsContent>
      </Tabs>
      <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-xs sm:grid-cols-2"><div className="flex items-center justify-between rounded-lg bg-white px-3 py-2"><span className="text-slate-500">Pago a recibir</span><strong className="text-slate-800">{formatMoney(paymentReceived)}</strong></div><div className={`flex items-center justify-between rounded-lg px-3 py-2 ${pendingBalance > 0 ? "bg-amber-50" : overpayment > 0 ? "bg-rose-50" : "bg-emerald-50"}`}><span className={pendingBalance > 0 ? "text-amber-800" : overpayment > 0 ? "text-rose-800" : "text-emerald-800"}>{overpayment > 0 ? "Excedente" : "Saldo pendiente"}</span><strong className={pendingBalance > 0 ? "text-amber-800" : overpayment > 0 ? "text-rose-800" : "text-emerald-800"}>{formatMoney(overpayment > 0 ? overpayment : pendingBalance)}</strong></div></div>
    </div>
  );
}
