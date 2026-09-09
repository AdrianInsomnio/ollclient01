'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Loader2, Pencil, Plus, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/lib/api-client'
import { createAdminCashRegister, getAdminCashRegister, getAdminCashRegisters, updateAdminCashRegister, updateAdminCashRegisterStatus, type AdminCashRegister } from '@/lib/api/cash'

const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'No se pudo completar la operación.'

export default function AdminCashRegistersPage() {
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all')
  const [registers, setRegisters] = useState<AdminCashRegister[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCashRegister | null>(null)
  const [detail, setDetail] = useState<AdminCashRegister | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<{ register: AdminCashRegister; nextActive: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setRegisters(await getAdminCashRegisters(status)) } catch (e) { setError(true); toast.error(errorMessage(e)) } finally { setLoading(false) }
  }, [status])
  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => ({ active: registers.filter((r) => r.isActive).length, disabled: registers.filter((r) => !r.isActive).length }), [registers])
  const openForm = (register?: AdminCashRegister) => { setEditing(register || null); setFormOpen(true) }
  const showDetail = async (register: AdminCashRegister) => { try { setDetail(await getAdminCashRegister(register.id)); setDetailOpen(true) } catch (e) { toast.error(errorMessage(e)) } }
  const requestStatus = (register: AdminCashRegister) => {
    if (register.isActive && register.shifts.some((shift) => shift.status === 'OPEN')) { toast.error('No se puede deshabilitar una caja con un turno abierto.'); return }
    setStatusTarget({ register, nextActive: !register.isActive })
  }
  const confirmStatus = async () => {
    if (!statusTarget) return
    setSaving(true)
    try { await updateAdminCashRegisterStatus(statusTarget.register.id, statusTarget.nextActive); toast.success(statusTarget.nextActive ? 'Caja habilitada correctamente.' : 'Caja deshabilitada correctamente.'); setStatusTarget(null); await load() }
    catch (e) { toast.error(errorMessage(e)) } finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Cajas</h1><p className="text-sm text-muted-foreground">Gestiona las cajas disponibles para tu clínica.</p></div><Button onClick={() => openForm()}><Plus className="mr-2 size-4" />Nueva caja</Button></div>
    <div className="grid gap-3 sm:grid-cols-2"><Card size="sm"><CardContent><p className="text-sm text-muted-foreground">Cajas activas</p><div className="mt-1 text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-12" /> : counts.active}</div></CardContent></Card><Card size="sm"><CardContent><p className="text-sm text-muted-foreground">Cajas deshabilitadas</p><div className="mt-1 text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-12" /> : counts.disabled}</div></CardContent></Card></div>
    <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Listado de cajas</CardTitle><div className="flex items-center gap-2"><Select value={status} onValueChange={(v) => setStatus(v as typeof status)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="active">Activas</SelectItem><SelectItem value="disabled">Deshabilitadas</SelectItem></SelectContent></Select><Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Actualizar"><RefreshCw className="size-4" /></Button></div></CardHeader><CardContent className="p-0">
      {error ? <div className="flex flex-col items-center gap-3 p-10 text-center"><p className="text-sm text-muted-foreground">No se pudieron cargar las cajas.</p><Button variant="outline" onClick={() => void load()}>Reintentar</Button></div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow>{['Caja', 'Código', 'Estado', 'Última actividad', 'Usuario / turno actual', 'Acciones'].map((head) => <TableHead key={head}>{head}</TableHead>)}</TableRow></TableHeader><TableBody>{loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>)}</TableRow>) : registers.length === 0 ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No hay cajas para el filtro seleccionado.</TableCell></TableRow> : registers.map((register) => <RegisterRow key={register.id} register={register} onDetail={() => void showDetail(register)} onEdit={() => openForm(register)} onStatus={() => requestStatus(register)} />)}</TableBody></Table></div>}
    </CardContent></Card>
    <RegisterForm open={formOpen} onOpenChange={setFormOpen} register={editing} saving={saving} onSaving={setSaving} onSaved={async () => { setFormOpen(false); await load() }} />
    <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Detalle de caja</DialogTitle><DialogDescription>Información de la caja y su actividad reciente.</DialogDescription></DialogHeader>{detail && <div className="grid gap-4 sm:grid-cols-2"><Detail label="Nombre" value={detail.name} /><Detail label="Código" value={detail.code || '—'} /><Detail label="Estado" value={detail.isActive ? 'Activa' : 'Deshabilitada'} /><Detail label="Última actualización" value={dateTime(detail.updatedAt)} /><div className="sm:col-span-2 rounded-md border p-4"><p className="text-sm font-medium">Turno actual</p>{detail.shifts.find((s) => s.status === 'OPEN') ? <p className="mt-1 text-sm text-muted-foreground">Turno #{detail.shifts.find((s) => s.status === 'OPEN')?.id} abierto por {detail.shifts.find((s) => s.status === 'OPEN')?.user?.username || 'usuario'}.</p> : <p className="mt-1 text-sm text-muted-foreground">No hay un turno abierto.</p>}</div></div>}</DialogContent></Dialog>
    <AlertDialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{statusTarget?.nextActive ? '¿Habilitar caja?' : '¿Deshabilitar caja?'}</AlertDialogTitle><AlertDialogDescription>{statusTarget?.nextActive ? 'La caja volverá a estar disponible para nuevas operaciones.' : 'Estás por deshabilitar esta caja. Dejará de estar disponible para nuevas operaciones. Los registros históricos no serán eliminados.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void confirmStatus() }}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{statusTarget?.nextActive ? 'Habilitar' : 'Deshabilitar'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}

function RegisterRow({ register, onDetail, onEdit, onStatus }: { register: AdminCashRegister; onDetail: () => void; onEdit: () => void; onStatus: () => void }) { const current = register.shifts.find((shift) => shift.status === 'OPEN'); const last = register.shifts[0]?.openedAt || register.updatedAt; return <TableRow><TableCell className="font-medium">{register.name}</TableCell><TableCell>{register.code || '—'}</TableCell><TableCell><Badge variant={register.isActive ? 'success' : 'neutral'}>{register.isActive ? 'Activa' : 'Deshabilitada'}</Badge></TableCell><TableCell>{dateTime(last)}</TableCell><TableCell>{current ? `${current.user?.username || 'Usuario'} · turno #${current.id}` : 'Sin turno abierto'}</TableCell><TableCell><div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={onDetail}><Eye className="mr-1 size-4" />Detalle</Button><Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar"><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={onStatus} aria-label={register.isActive ? 'Deshabilitar' : 'Habilitar'}>{register.isActive ? <ToggleLeft className="size-4" /> : <ToggleRight className="size-4" />}</Button></div></TableCell></TableRow> }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div> }

function RegisterForm({ open, onOpenChange, register, saving, onSaving, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; register: AdminCashRegister | null; saving: boolean; onSaving: (value: boolean) => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(''); const [code, setCode] = useState('')
  useEffect(() => { if (open) { setName(register?.name || ''); setCode(register?.code || '') } }, [open, register])
  const submit = async () => { if (!name.trim()) { toast.error('El nombre de la caja es obligatorio.'); return } onSaving(true); try { if (register) await updateAdminCashRegister(register.id, { name: name.trim(), code: code.trim() || undefined }); else await createAdminCashRegister({ name: name.trim(), code: code.trim() || undefined }); toast.success(register ? 'Caja actualizada correctamente.' : 'Caja creada correctamente.'); await onSaved() } catch (e) { toast.error(errorMessage(e)) } finally { onSaving(false) } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{register ? 'Editar caja' : 'Nueva caja'}</DialogTitle><DialogDescription>La caja se asociará automáticamente a tu clínica.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="register-name">Nombre</Label><Input id="register-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Caja principal" /></div><div className="space-y-1.5"><Label htmlFor="register-code">Código <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="register-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CAJA-01" /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button onClick={() => void submit()} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{register ? 'Guardar cambios' : 'Crear caja'}</Button></DialogFooter></DialogContent></Dialog>
}
