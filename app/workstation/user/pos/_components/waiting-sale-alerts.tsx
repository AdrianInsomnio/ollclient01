import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Sale } from "@/lib/api/sales";

type WaitingSaleAlertsProps = {
  matchingOpen: boolean;
  matchingSale: Sale | null;
  cancelSale: Sale | null;
  replaceOpen: boolean;
  onMatchingOpenChange: (open: boolean) => void;
  onKeepNewSale: () => void;
  onContinueMatching: () => void;
  onCancelSaleChange: (sale: Sale | null) => void;
  onCancelWaiting: (sale: Sale) => void;
  onReplaceOpenChange: (open: boolean) => void;
  onReplaceAndContinue: () => void;
};

export function WaitingSaleAlerts({ matchingOpen, matchingSale, cancelSale, replaceOpen, onMatchingOpenChange, onKeepNewSale, onContinueMatching, onCancelSaleChange, onCancelWaiting, onReplaceOpenChange, onReplaceAndContinue }: WaitingSaleAlertsProps) {
  return (
    <>
      <AlertDialog open={matchingOpen} onOpenChange={(open) => { if (!open) onMatchingOpenChange(false); }}><AlertDialogContent className="w-[min(90vw,45rem)] max-w-180!"><AlertDialogHeader><AlertDialogTitle>Este cliente tiene una cuenta en espera</AlertDialogTitle><AlertDialogDescription>{matchingSale?.client?.name ?? "El cliente seleccionado"} ya tiene la cuenta #{matchingSale?.id} en espera. Puedes retomarla para sumar los productos de este ticket o mantenerla separada y crear una venta nueva.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end"><AlertDialogCancel onClick={onKeepNewSale}>Nueva venta, mantener en espera</AlertDialogCancel><AlertDialogAction onClick={onContinueMatching}>Continuar y juntar productos</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={Boolean(cancelSale) && !replaceOpen} onOpenChange={(open) => { if (!open) onCancelSaleChange(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar esta cuenta en espera?</AlertDialogTitle><AlertDialogDescription>No se ha realizado ningún cobro. La cuenta #{cancelSale?.id} se conservará como registro cancelado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Volver</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (cancelSale) onCancelWaiting(cancelSale); onCancelSaleChange(null); }}>Cancelar cuenta</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={replaceOpen} onOpenChange={onReplaceOpenChange}><AlertDialogContent className="w-[min(90vw,45rem)] max-w-180!"><AlertDialogHeader><AlertDialogTitle>Ya tienes una venta en curso</AlertDialogTitle><AlertDialogDescription>¿Quieres poner la venta actual en espera y retomar la cuenta #{cancelSale?.id}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => onCancelSaleChange(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onReplaceAndContinue}>Poner en espera y retomar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
