"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit3, Eye, EyeOff, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import { createSupplier, getSuppliers, updateSupplier, updateSupplierStatus, type Supplier, type SupplierPayload } from "@/lib/api/suppliers";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/auth-store";

type StatusFilter = "all" | "active" | "inactive";

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) return "Ya existe un proveedor con ese nombre o RUT en esta clÃ­nica.";
  return error instanceof Error ? error.message : "No se pudo completar la operaciÃ³n.";
}

export function SuppliersPanel() {
  const tenantId = useAuthStore((state) => state.tenantId ?? "unknown");
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({ queryKey: ["clinic-suppliers", tenantId], queryFn: () => getSuppliers(), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dialogSupplier, setDialogSupplier] = useState<Supplier | null | false>(false);
  const [statusTarget, setStatusTarget] = useState<Supplier | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["clinic-suppliers"] });
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (suppliersQuery.data ?? []).filter((supplier) => {
      const matchesStatus = status === "all" || (status === "active" ? supplier.isActive : !supplier.isActive);
      const matchesSearch = !query || `${supplier.name} ${supplier.rut ?? ""} ${supplier.contactName ?? ""}`.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [search, status, suppliersQuery.data]);
  const statusMutation = useMutation({
    mutationFn: (supplier: Supplier) => updateSupplierStatus(supplier.id, !supplier.isActive),
    onSuccess: (_, supplier) => { toast.success(supplier.isActive ? "Proveedor desactivado." : "Proveedor activado."); setStatusTarget(null); void refresh(); void queryClient.invalidateQueries({ queryKey: ["inventory-suppliers-active"] }); },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (suppliersQuery.isLoading) return <div className="flex min-h-48 items-center justify-center"><RefreshCw className="size-5 animate-spin text-muted-foreground" /></div>;
  if (suppliersQuery.isError) return <Card><CardContent className="flex flex-col items-center gap-3 py-12"><p className="text-sm text-destructive">No se pudieron cargar los proveedores.</p><Button variant="outline" onClick={() => void suppliersQuery.refetch()}>Reintentar</Button></CardContent></Card>;

  return <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
    <section className="flex shrink-0 flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl"><div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"><Building2 className="size-3.5" aria-hidden="true" />ConfiguraciÃ³n de inventario</div><h1 className="text-3xl font-semibold tracking-tight">Proveedores</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Administra los proveedores de la clÃ­nica para reutilizarlos en medicamentos y otros productos del catÃ¡logo.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void suppliersQuery.refetch()} disabled={suppliersQuery.isFetching}><RefreshCw className={suppliersQuery.isFetching ? "animate-spin" : ""} />Actualizar</Button><Button onClick={() => setDialogSupplier(null)}><Plus />Nuevo proveedor</Button></div></section>
    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Proveedores" value={(suppliersQuery.data ?? []).length} /><Metric label="Activos" value={(suppliersQuery.data ?? []).filter((supplier) => supplier.isActive).length} /><Metric label="Productos vinculados" value={(suppliersQuery.data ?? []).reduce((count, supplier) => count + (supplier._count?.products ?? 0), 0)} /></section>
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden"><CardHeader className="shrink-0 gap-4 border-b bg-muted/20 pb-4"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><CardTitle className="text-base">Directorio de proveedores</CardTitle><CardDescription className="mt-1">Los proveedores pertenecen a esta clÃ­nica y se pueden asociar a cualquier producto.</CardDescription></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, RUT o contacto" aria-label="Buscar proveedores" className="pl-9" /></div><select aria-label="Filtrar proveedores por estado" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></div></div><p className="text-xs text-muted-foreground">{filtered.length} de {(suppliersQuery.data ?? []).length} proveedores</p></CardHeader><CardContent className="min-h-0 flex-1 overflow-auto p-0">{filtered.length === 0 ? <div className="flex flex-col items-center gap-2 px-6 py-16 text-center"><Building2 className="size-8 text-muted-foreground" /><p className="font-medium">No hay proveedores para mostrar</p><p className="text-sm text-muted-foreground">Crea un proveedor o ajusta la bÃºsqueda y el filtro.</p></div> : <Table><TableHeader className="sticky top-0 bg-background"><TableRow><TableHead>Proveedor</TableHead><TableHead>RUT</TableHead><TableHead>Contacto</TableHead><TableHead>Productos</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{filtered.map((supplier) => <TableRow key={supplier.id}><TableCell><div className="font-medium">{supplier.name}</div><div className="text-xs text-muted-foreground">{supplier.email || supplier.phone || "Sin datos de contacto"}</div></TableCell><TableCell>{supplier.rut || "â€”"}</TableCell><TableCell>{supplier.contactName || "â€”"}</TableCell><TableCell>{supplier._count?.products ?? 0}</TableCell><TableCell><Badge variant={supplier.isActive ? "success" : "neutral"}>{supplier.isActive ? "Activo" : "Inactivo"}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Editar ${supplier.name}`} onClick={() => setDialogSupplier(supplier)}><Edit3 /></Button><Button variant="ghost" size="icon-sm" aria-label={`${supplier.isActive ? "Desactivar" : "Activar"} ${supplier.name}`} onClick={() => setStatusTarget(supplier)} disabled={statusMutation.isPending}>{supplier.isActive ? <EyeOff /> : <Eye />}</Button></div></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
    <SupplierDialog key={dialogSupplier === null ? "new" : dialogSupplier === false ? "closed" : dialogSupplier.id} supplier={dialogSupplier || null} open={dialogSupplier !== false} onOpenChange={(open) => !open && setDialogSupplier(false)} onSaved={() => { setDialogSupplier(false); void refresh(); void queryClient.invalidateQueries({ queryKey: ["inventory-suppliers-active"] }); }} />
    <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{statusTarget?.isActive ? "Â¿Desactivar proveedor?" : "Â¿Activar proveedor?"}</AlertDialogTitle><AlertDialogDescription>{statusTarget?.isActive ? `${statusTarget.name} dejarÃ¡ de aparecer para nuevas asignaciones. Los productos vinculados conservarÃ¡n el historial.` : `${statusTarget?.name} volverÃ¡ a estar disponible en el selector de productos.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => statusTarget && statusMutation.mutate(statusTarget)} disabled={statusMutation.isPending}>{statusMutation.isPending ? "Guardandoâ€¦" : statusTarget?.isActive ? "Desactivar" : "Activar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card size="sm"><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>;
}

function SupplierDialog({ supplier, open, onOpenChange, onSaved }: { supplier: Supplier | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<SupplierPayload>(() => ({ name: supplier?.name ?? "", rut: supplier?.rut ?? "", contactName: supplier?.contactName ?? "", phone: supplier?.phone ?? "", email: supplier?.email ?? "", address: supplier?.address ?? "", notes: supplier?.notes ?? "" }));
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => supplier ? updateSupplier(supplier.id, form) : createSupplier(form), onSuccess: () => { toast.success(supplier ? "Proveedor actualizado." : "Proveedor creado."); onSaved(); }, onError: (value) => setError(errorMessage(value)) });
  const update = <K extends keyof SupplierPayload>(key: K, value: SupplierPayload[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); setError(""); if (!form.name.trim()) return setError("El nombre es obligatorio."); mutation.mutate(); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle><p className="text-sm text-muted-foreground">Los datos quedan asociados a la clÃ­nica activa.</p></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre comercial o razÃ³n social *"><Input value={form.name} onChange={(event) => update("name", event.target.value)} autoFocus /></Field><Field label="RUT"><Input value={form.rut ?? ""} onChange={(event) => update("rut", event.target.value || null)} /></Field><Field label="Persona de contacto"><Input value={form.contactName ?? ""} onChange={(event) => update("contactName", event.target.value || null)} /></Field><Field label="TelÃ©fono"><Input value={form.phone ?? ""} onChange={(event) => update("phone", event.target.value || null)} /></Field><Field label="Correo electrÃ³nico"><Input type="email" value={form.email ?? ""} onChange={(event) => update("email", event.target.value || null)} /></Field><Field label="DirecciÃ³n"><Input value={form.address ?? ""} onChange={(event) => update("address", event.target.value || null)} /></Field></div><Field label="Observaciones"><Textarea value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || null)} rows={3} /></Field>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending || !form.name.trim()}>{mutation.isPending && <RefreshCw className="animate-spin" />}Guardar</Button></DialogFooter></form></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
