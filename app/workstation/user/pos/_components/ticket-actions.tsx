import { Check, CircleAlert, Clock3, Loader2, Printer, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type TicketActionsProps = {
  canCheckout: boolean;
  canHold: boolean;
  submitting: boolean;
  printing: boolean;
  waitingLoading: boolean;
  printError: string | null;
  onCheckout: () => void;
  onHold: () => void;
  onRefreshWaiting: () => void;
  onDismissPrintError: () => void;
};

export function TicketActions({
  canCheckout, canHold, submitting, printing, waitingLoading, printError,
  onCheckout, onHold, onRefreshWaiting, onDismissPrintError,
}: TicketActionsProps) {
  return (
    <div className="space-y-2 border-t border-slate-100 bg-white p-4">
      <Button className="h-12 w-full bg-teal-700 text-sm font-bold text-white shadow-sm hover:bg-teal-800" disabled={!canCheckout || submitting || printing} onClick={onCheckout}>
        {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : printing ? <Printer className="mr-2 size-4" /> : <Check className="mr-2 size-4" />} {printing ? "Imprimiendo ticket..." : "Cobrar e imprimir ticket"}<kbd className="ml-auto hidden rounded border border-white/30 px-1.5 py-0.5 text-[10px] font-medium sm:inline">F8</kbd>
      </Button>
      <div className="flex gap-2"><Button variant="outline" className="flex-1 border-amber-200 text-amber-800 hover:bg-amber-50" disabled={!canHold || submitting} onClick={onHold}><Clock3 className="mr-2 size-4" />Poner en espera</Button><Button variant="ghost" size="icon" aria-label="Actualizar cuentas en espera" onClick={onRefreshWaiting}><RefreshCw className={waitingLoading ? "size-4 animate-spin" : "size-4"} /></Button></div>
      {printError && <div className="flex items-start gap-2 text-xs text-amber-700"><CircleAlert className="mt-0.5 size-3.5 shrink-0" /><span className="flex-1">{printError}</span><button type="button" className="shrink-0 text-amber-700/70 hover:text-amber-900" aria-label="Cerrar aviso de impresión" onClick={onDismissPrintError}><X className="size-3.5" /></button></div>}
    </div>
  );
}
