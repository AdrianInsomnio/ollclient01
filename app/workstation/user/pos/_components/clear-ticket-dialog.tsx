import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ClearTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ClearTicketDialog({ open, onOpenChange, onConfirm }: ClearTicketDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>¿Vaciar el ticket?</AlertDialogTitle><AlertDialogDescription>Se quitarán todos los productos, servicios o cuotas seleccionados y se perderá el contenido actual del ticket.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Conservar ticket</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={onConfirm}>Vaciar ticket</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
