"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelSale as cancelSaleApi, correctSale, getSaleById, getSales, returnSale as returnSaleApi, type Sale } from "@/lib/api/sales";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { reprintSaleTicket } from "@/lib/local-printer";
import { Receipt, RefreshCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getCashRegisters, getCurrentCashShift } from "@/lib/api/cash";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU" }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-UY");
}

function formatTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
}

const EMPTY_SALES: Sale[] = [];

export default function UserSalesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const tenantId = useAuthStore((state) => state.tenantId ?? "unknown");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const [pageSize, setPageSize] = useState("15");
  const [currentPage, setCurrentPage] = useState(1);
  const currentShiftQuery = useQuery({
    queryKey: ["cash-current-shift", tenantId],
    queryFn: async () => {
      const registers = await getCashRegisters();
      const activeRegister = registers.find((register) => register.isActive === true);
      if (!activeRegister) return null;
      return getCurrentCashShift(activeRegister.id);
    },
    staleTime: 30_000,
  });
  const activeShiftId = currentShiftQuery.data?.id ?? null;
  const salesQuery = useQuery({
    queryKey: ["sales", "active-shift", tenantId, activeShiftId ?? "none"],
    queryFn: () => getSales({ cashShiftId: activeShiftId! }),
    enabled: currentShiftQuery.isSuccess && activeShiftId !== null,
  });
  const data = salesQuery.data ?? EMPTY_SALES;
  const selectedSale = data.find((sale) => String(sale.id) === selectedSaleId) ?? null;
  const selectedSaleNeedsDetail = Boolean(selectedSale && (!selectedSale.client || !selectedSale.items || !selectedSale.payments));
  const saleDetailQuery = useQuery({
    queryKey: ["sale", selectedSaleId],
    queryFn: () => getSaleById(selectedSaleId!),
    enabled: Boolean(selectedSaleId && selectedSaleNeedsDetail),
    staleTime: 5 * 60_000,
  });
  const detailSale = saleDetailQuery.data ?? selectedSale;
  const pageSizeNumber = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSizeNumber));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSales = useMemo(
    () => data.slice((safeCurrentPage - 1) * pageSizeNumber, safeCurrentPage * pageSizeNumber),
    [data, pageSizeNumber, safeCurrentPage],
  );
  const returnMutation = useMutation({
    mutationFn: () => returnSaleApi(String(returningSale!.id), Object.entries(returnQuantities).filter(([, quantity]) => Number(quantity) > 0).map(([productId, quantity]) => ({ productId: Number(productId), quantity: Number(quantity) }))),
    onSuccess: () => { setReturningSale(null); setReturnQuantities({}); void queryClient.invalidateQueries({ queryKey: ["sales"] }); void queryClient.invalidateQueries({ queryKey: ["inventory-products"] }); },
  });
  const reprintMutation = useMutation({
    mutationFn: (sale: Sale) => reprintSaleTicket(sale.id),
    onSuccess: () => toast.success("Reimpresión enviada al agente de impresión."),
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo reimprimir el ticket."),
  });
  const cancelMutation = useMutation({
    mutationFn: (sale: Sale) => cancelSaleApi(sale.id, "Cancelación solicitada desde historial de ventas"),
    onSuccess: (updatedSale) => {
      const queryKey = ["sales", "active-shift", tenantId, activeShiftId ?? "none"];
      queryClient.setQueryData<Sale[]>(queryKey, (current) => current?.map((sale) => String(sale.id) === String(updatedSale.id) ? updatedSale : sale) ?? current);
      queryClient.setQueryData(["sale", String(updatedSale.id)], updatedSale);
      setCancelTarget(null);
      toast.success(`Venta #${updatedSale.id} cancelada. Se conservó el registro.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo cancelar la venta."),
  });
  const correctMutation = useMutation({
    mutationFn: (sale: Sale) => correctSale(String(sale.id), {
      items: (sale.items ?? []).map((item) => ({ itemType: item.itemType === "subscription_installment" ? "service" : item.itemType, itemId: item.itemId, quantity: item.quantity, nameSnapshot: item.nameSnapshot, priceSnapshot: item.priceSnapshot })),
      discount: sale.discount,
      reason: "Corrección solicitada desde historial de ventas",
    }),
    onSuccess: ({ original, waiting }) => {
      const queryKey = ["sales", "active-shift", tenantId, activeShiftId ?? "none"];
      queryClient.setQueryData<Sale[]>(queryKey, (current) => {
        if (!current) return current;
        const updated = current.map((sale) => String(sale.id) === String(original.id) ? original : sale);
        return updated.some((sale) => String(sale.id) === String(waiting.id)) ? updated : [...updated, waiting];
      });
      queryClient.setQueryData(["sale", String(original.id)], original);
      setSelectedSaleId(null);
      toast.success(`Venta #${original.id} revertida. Se abrió la cuenta #${waiting.id} en el POS para corregirla.`);
      router.push(`/workstation/user/pos?resume=${waiting.id}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo preparar la corrección."),
  });

  const canOperateSales = role === "ADMIN" || role === "USER";
  const openModify = (sale: Sale) => {
    if (sale.status === "CONFIRMED") {
      correctMutation.mutate(sale);
      return;
    }
    router.push(`/workstation/user/pos?resume=${sale.id}`);
  };

  const isLoading = currentShiftQuery.isLoading || (activeShiftId !== null && salesQuery.isLoading);
  const isError = currentShiftQuery.isError || salesQuery.isError;
  const error = currentShiftQuery.error ?? salesQuery.error;
  const isFetching = currentShiftQuery.isFetching || salesQuery.isFetching;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <div className="flex items-center gap-2">
          <Link href="/workstation/user/pos">
            <Button><Receipt className="h-4 w-4 mr-2" />Nueva venta (POS)</Button>
          </Link>
          <Button variant="outline" onClick={() => { void currentShiftQuery.refetch(); void salesQuery.refetch(); }} disabled={isFetching}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            {isFetching ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Cargando ventas...</p>
      ) : isError ? (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          Error al cargar ventas: {error instanceof Error ? error.message : "desconocido"}
        </div>
      ) : !currentShiftQuery.data ? (
        <p className="text-center text-gray-500 py-8">No hay una caja activa con un turno abierto. Las ventas se mostrarán al abrirlo.</p>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-muted-foreground">No hay ventas para mostrar</h3>
          <p className="mt-1 text-sm text-muted-foreground">Aún no se registraron ventas en el turno abierto.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ventas del turno abierto</CardTitle>
            <p className="text-sm text-muted-foreground">
              Caja: {currentShiftQuery.data.cashRegister.name} · Turno #{currentShiftQuery.data.id}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4">Items</th>
                    <th className="py-2 pr-4">Pago</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                    <th className="py-2 pr-4">Estado</th>
                    {role === "ADMIN" && <th className="py-2 pr-4">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map((sale) => (
                    <tr key={sale.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/50" onClick={() => setSelectedSaleId(String(sale.id))} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedSaleId(String(sale.id)); } }}>
                      <td className="py-2 pr-4 font-mono text-xs">{sale.id}</td>
                      <td className="py-2 pr-4">{formatDate(sale.createdAt)}</td>
                      <td className="py-2 pr-4">{sale.client?.name ?? `Cliente #${sale.clientId}`}</td>
                      <td className="py-2 pr-4">{sale.items?.length ?? 0}</td>
                      <td className="py-2 pr-4">{sale.paymentMethod ?? "-"}</td>
                      <td className="py-2 pr-4 text-right font-medium">{formatCurrency(sale.total)}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            sale.status === "CONFIRMED"
                              ? "bg-green-100 text-green-800"
                              : sale.status === "DRAFT" || sale.status === "WAITING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      {role === "ADMIN" && <td className="py-2 pr-4"><Button size="sm" variant="outline" disabled={sale.status !== "CONFIRMED" || !(sale.items ?? []).some((item) => item.itemType === "product")} onClick={(event) => { event.stopPropagation(); setReturningSale(sale); setReturnQuantities({}); }}>Devolver</Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Mostrar</span>
                <Select value={pageSize} onValueChange={(value) => { setPageSize(value); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[76px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>
                <span>por página · {data.length} ventas</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1}>Anterior</Button>
                <span className="min-w-20 text-center text-sm text-muted-foreground">Página {safeCurrentPage} de {totalPages}</span>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages}>Siguiente</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog open={Boolean(returningSale)} onOpenChange={(open) => !open && setReturningSale(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Devolver productos</DialogTitle><DialogDescription>Selecciona las cantidades que deben volver al stock.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            {(returningSale?.items ?? []).filter((item) => item.itemType === "product").map((item) => <div key={item.id} className="grid grid-cols-[1fr_7rem] items-center gap-3"><Label htmlFor={`return-${item.id}`}>{item.nameSnapshot}<span className="block text-xs text-muted-foreground">Vendidas: {item.quantity}</span></Label><Input id={`return-${item.id}`} type="number" min="0" max={item.quantity} step="1" value={returnQuantities[item.itemId] ?? ""} onChange={(event) => setReturnQuantities((current) => ({ ...current, [item.itemId]: event.target.value }))} /></div>)}
            {returnMutation.isError && <p className="text-sm text-destructive">No se pudo registrar la devolución.</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReturningSale(null)}>Cancelar</Button><Button onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending || !Object.values(returnQuantities).some((quantity) => Number(quantity) > 0)}>Confirmar devolución</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Drawer open={Boolean(selectedSaleId)} onOpenChange={(open) => !open && setSelectedSaleId(null)} direction="right">
        <DrawerContent className="w-full overflow-y-auto sm:max-w-xl">
          {detailSale && <>
            <DrawerHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                <div><DrawerTitle>Venta #{detailSale.id}</DrawerTitle><DrawerDescription>Detalle registrado de la operación.</DrawerDescription></div>
                <DrawerClose asChild><Button variant="ghost" size="icon" aria-label="Cerrar detalle"><X className="size-4" /></Button></DrawerClose>
              </div>
            </DrawerHeader>
            <div className="space-y-6 p-4">
              {saleDetailQuery.isFetching && <p className="text-sm text-muted-foreground">Completando detalle...</p>}
              {saleDetailQuery.isError && <p className="text-sm text-destructive">No se pudo completar el detalle. Se muestran los datos disponibles.</p>}
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-4">
                <div><p className="text-muted-foreground">Fecha</p><p className="font-medium">{formatDate(detailSale.createdAt)}</p></div>
                <div><p className="text-muted-foreground">Hora</p><p className="font-medium">{formatTime(detailSale.createdAt)}</p></div>
                <div><p className="text-muted-foreground">Estado</p><p className="font-medium">{detailSale.status}</p></div>
                <div><p className="text-muted-foreground">Turno</p><p className="font-medium">{detailSale.cashShiftId ?? "-"}</p></div>
              </div>
              <section className="space-y-2"><h3 className="font-medium">Cliente y mascota</h3><div className="rounded-lg border p-4 text-sm"><p><span className="text-muted-foreground">Cliente: </span>{detailSale.client?.name ?? `Cliente #${detailSale.clientId}`}</p><p><span className="text-muted-foreground">Mascota: </span>{detailSale.pet?.name ?? "Sin mascota"}</p></div></section>
              <section className="space-y-2"><h3 className="font-medium">Productos y servicios</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Descripción</th><th className="p-3 text-right">Cant.</th><th className="p-3 text-right">P. unitario</th><th className="p-3 text-right">Subtotal</th></tr></thead><tbody>{(detailSale.items ?? []).map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3">{item.nameSnapshot}<span className="block text-xs text-muted-foreground">{item.itemType}</span>{item.ivaIncluded && <span className="block text-xs text-muted-foreground">IVA incluido · Neto: {formatCurrency(item.netAmount)} · IVA {item.ivaRate}%: {formatCurrency(item.taxAmount)}</span>}</td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">{formatCurrency(item.priceSnapshot)}</td><td className="p-3 text-right font-medium">{formatCurrency(item.subtotal)}</td></tr>)}</tbody></table>{!(detailSale.items ?? []).length && <p className="p-4 text-sm text-muted-foreground">No hay items disponibles.</p>}</div></section>
              <section className="space-y-2"><h3 className="font-medium">Pagos</h3><div className="rounded-lg border p-4 text-sm">{detailSale.payments?.length ? detailSale.payments.map((payment) => <div key={payment.id ?? `${payment.method}-${payment.amount}`} className="flex justify-between gap-4"><span>{payment.method}</span><span className="font-medium">{formatCurrency(payment.amount)}</span></div>) : <p className="text-muted-foreground">{detailSale.paymentMethod ?? "Sin pagos registrados"}</p>}</div></section>
              <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(detailSale.subtotal)}</span></div><div className="flex justify-between"><span>Descuento</span><span>- {formatCurrency(detailSale.discount)}</span></div><div className="flex justify-between"><span>Impuestos</span><span>{formatCurrency(detailSale.tax)}</span></div><div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatCurrency(detailSale.total)}</span></div></div>
            </div>
            {canOperateSales && <DrawerFooter className="border-t sm:flex-row sm:flex-wrap sm:justify-end"><Button className="w-full sm:w-auto" variant="outline" onClick={() => detailSale && reprintMutation.mutate(detailSale)} disabled={reprintMutation.isPending || detailSale.status === "CANCELLED"}>{reprintMutation.isPending ? "Imprimiendo..." : "Re-imprimir ticket"}</Button><Button className="w-full sm:w-auto" variant="outline" onClick={() => detailSale && openModify(detailSale)} disabled={correctMutation.isPending || detailSale.status === "CANCELLED"}>{correctMutation.isPending ? "Preparando..." : "Modificar venta"}</Button><Button className="w-full sm:w-auto" variant="destructive" onClick={() => setCancelTarget(detailSale)} disabled={cancelMutation.isPending || detailSale.status === "CANCELLED"}>Cancelar venta</Button></DrawerFooter>}
          </>}
        </DrawerContent>
      </Drawer>
      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && !cancelMutation.isPending && setCancelTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar la venta #{cancelTarget?.id}?</AlertDialogTitle><AlertDialogDescription>La venta no se eliminará. Se conservará el historial, se registrará la trazabilidad y se revertirán los movimientos según las reglas del turno.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={cancelMutation.isPending}>Volver</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={cancelMutation.isPending} onClick={(event) => { event.preventDefault(); if (cancelTarget) cancelMutation.mutate(cancelTarget); }}>{cancelMutation.isPending ? "Cancelando..." : "Confirmar cancelación"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
