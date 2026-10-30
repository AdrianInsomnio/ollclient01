import { CreditCard, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PosInstallmentPreparation } from "@/lib/api/sales";

type Installment = PosInstallmentPreparation["installments"][number];
type InstallmentPickerDialogProps = {
  open: boolean;
  installments: Installment[];
  selectedIds: number[];
  preparing: boolean;
  formatDateTime: (value?: string | null) => string;
  formatMoney: (value: number) => string;
  onOpenChange: (open: boolean) => void;
  onToggle: (installment: Installment) => void;
  onConfirm: () => void;
};

export function InstallmentPickerDialog({ open, installments, selectedIds, preparing, formatDateTime, formatMoney, onOpenChange, onToggle, onConfirm }: InstallmentPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="size-5 text-teal-700" />Cargar cuotas al ticket</DialogTitle><DialogDescription>Selecciona cuotas pendientes del cliente. El backend volverá a validar disponibilidad e importes antes de cobrar.</DialogDescription></DialogHeader>
      <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">{installments.length ? installments.map((installment) => { const checked = selectedIds.includes(installment.id); const isFuture = new Date(installment.dueDate) > new Date(); return <label key={installment.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checked ? "border-teal-300 bg-teal-50/60" : "border-slate-200 hover:bg-slate-50"}`}><Checkbox checked={checked} onCheckedChange={() => onToggle(installment)} /><div className="min-w-0 flex-1"><p className="font-medium text-slate-800">Cuota #{installment.id} {isFuture && <Badge className="ml-2" variant="info">Pago adelantado</Badge>}</p><p className="text-xs text-slate-500">Vence {formatDateTime(installment.dueDate)} · Período {formatDateTime(installment.periodStart)} — {formatDateTime(installment.periodEnd)}</p></div><span className="font-semibold text-slate-800">{formatMoney(Number(installment.totalAmount))}</span></label>; }) : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No hay cuotas pendientes disponibles.</p>}</div>
      <DialogFooter><div className="mr-auto text-sm text-muted-foreground">{selectedIds.length} cuota(s) seleccionada(s)</div><Button variant="outline" onClick={() => onOpenChange(false)} disabled={preparing}>Cancelar</Button><Button onClick={onConfirm} disabled={!selectedIds.length || preparing}>{preparing && <Loader2 className="mr-2 size-4 animate-spin" />}Cargar al ticket</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}
