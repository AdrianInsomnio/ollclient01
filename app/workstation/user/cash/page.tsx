'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Check, Clock3, Loader2, LockKeyhole, RefreshCw, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { closeCashShift, createCashMovement, getCashRegisters, getCashShiftMovements, getCurrentCashShift, openCashShift, type CashMovement, type CashRegister, type CashShift } from '@/lib/api/cash'

const money = (value: number | string | null | undefined) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 }).format(Number(value || 0))
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'No se pudo completar la operación.'

export default function UserCashPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [registerId, setRegisterId] = useState('')
  const [shift, setShift] = useState<CashShift | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('0')
  const [movementOpen, setMovementOpen] = useState<'CASH_IN' | 'CASH_OUT' | null>(null)
  const [closeOpen, setCloseOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (id = registerId) => {
    if (!id) return
    setRefreshing(true)
    try {
      let current: CashShift | null = null
      try { current = await getCurrentCashShift(Number(id)) } catch (error) { if (!(error instanceof ApiError) || error.status !== 404) throw error }
      setShift(current)
      setMovements(current ? await getCashMovementsForShift(current.id) : [])
    } catch (error) { toast.error(errorMessage(error)) } finally { setLoading(false); setRefreshing(false) }
  }, [registerId])

  useEffect(() => {
    void (async () => {
      try {
        const data = await getCashRegisters()
        setRegisters(data)
        if (data[0]) { setRegisterId(String(data[0].id)); await load(String(data[0].id)) } else setLoading(false)
      } catch (error) { toast.error(errorMessage(error)); setLoading(false) }
    })()
  }, [load])

  const selectedRegister = registers.find((register) => String(register.id) === registerId)
  const totals = useMemo(() => {
    const cashIn = movements.filter((movement) => movement.type === 'CASH_IN').reduce((sum, movement) => sum + Number(movement.amount), 0)
    const cashOut = movements.filter((movement) => movement.type === 'CASH_OUT').reduce((sum, movement) => sum + Number(movement.amount), 0)
    return { cashIn, cashOut }
  }, [movements])
  const expected = Number(shift?.expectedAmount ?? Number(shift?.openingAmount || 0) + totals.cashIn - totals.cashOut)

  const selectRegister = async (value: string) => { setRegisterId(value); setShift(null); await load(value) }
  const startShift = async () => {
    if (!registerId || Number(openingAmount) < 0) return toast.error('Indica un monto de apertura válido.')
    setSaving(true)
    try { const created = await openCashShift(Number(registerId), openingAmount); setShift(created); setMovements([]); toast.success('Turno iniciado correctamente.') } catch (error) { toast.error(errorMessage(error)) } finally { setSaving(false) }
  }
  const saveMovement = async (data: { amount: string; reason: string; notes: string }) => {
    if (!shift || !movementOpen) return
    if (!data.reason.trim() || Number(data.amount) <= 0) { toast.error('Completa un monto y un motivo válido.'); return }
    setSaving(true)
    try { await createCashMovement(shift.id, { type: movementOpen, amount: data.amount, reason: data.reason.trim(), notes: data.notes.trim() || undefined }); setMovementOpen(null); toast.success(movementOpen === 'CASH_IN' ? 'Ingreso registrado.' : 'Retiro registrado.'); await load() } catch (error) { toast.error(errorMessage(error)) } finally { setSaving(false) }
  }
  const saveClose = async (data: { countedAmount: string; closingNotes: string; differenceReason: string }) => {
    if (!shift || Number(data.countedAmount) < 0) { toast.error('Indica el efectivo contado.'); return }
    if (Math.abs(Number(data.countedAmount) - expected) > 0.001 && !data.differenceReason.trim()) { toast.error('Indica el motivo de la diferencia.'); return }
    setSaving(true)
    try { await closeCashShift(shift.id, { countedAmount: data.countedAmount, closingNotes: data.closingNotes.trim() || undefined, differenceReason: data.differenceReason.trim() || undefined }); setCloseOpen(false); setShift(null); setMovements([]); toast.success('Turno cerrado correctamente.') } catch (error) { toast.error(errorMessage(error)) } finally { setSaving(false) }
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operación diaria</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Caja del día</h1><p className="mt-1 max-w-xl text-sm text-muted-foreground">Controla el efectivo, registra movimientos y cierra tu turno con una diferencia clara.</p></div>
      <Button variant="outline" size="icon" onClick={() => void load()} disabled={refreshing} aria-label="Actualizar caja"><RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} /></Button>
    </header>

    {registers.length === 0 ? <EmptyCash /> : <>
      <Card className="border-foreground/10 bg-muted/30"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background"><WalletCards className="size-5" /></div><div><Label htmlFor="cash-register">Caja activa</Label><Select value={registerId} onValueChange={(value) => void selectRegister(value)}><SelectTrigger id="cash-register" className="mt-1 w-56 border-0 bg-transparent p-0 text-base font-semibold shadow-none focus:ring-0"><SelectValue placeholder="Seleccionar caja" /></SelectTrigger><SelectContent>{registers.map((register) => <SelectItem key={register.id} value={String(register.id)}>{register.name}{register.code ? ` · ${register.code}` : ''}</SelectItem>)}</SelectContent></Select></div></div><Badge variant={shift ? 'success' : 'neutral'}>{shift ? 'Turno abierto' : 'Sin turno abierto'}</Badge></CardContent></Card>

      {!shift ? <OpenShift register={selectedRegister} openingAmount={openingAmount} setOpeningAmount={setOpeningAmount} onSubmit={() => void startShift()} saving={saving} /> : <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Saldo inicial" value={money(shift.openingAmount)} icon={<Banknote className="size-4" />} /><Metric label="Ingresos" value={money(totals.cashIn)} icon={<ArrowDownToLine className="size-4" />} tone="positive" /><Metric label="Retiros" value={money(totals.cashOut)} icon={<ArrowUpFromLine className="size-4" />} tone="negative" /><Metric label="Saldo esperado" value={money(expected)} icon={<Check className="size-4" />} emphasis /></section>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><Card><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>Turno #{shift.id}</CardTitle><CardDescription>Abierto {dateTime(shift.openedAt)} · {shift.cashRegister.name}</CardDescription></div><Clock3 className="size-5 text-muted-foreground" /></CardHeader><CardContent><div className="flex flex-wrap gap-3"><Button onClick={() => setMovementOpen('CASH_IN')}><ArrowDownToLine className="mr-2 size-4" />Agregar dinero</Button><Button variant="outline" onClick={() => setMovementOpen('CASH_OUT')}><ArrowUpFromLine className="mr-2 size-4" />Retirar dinero</Button><Button variant="secondary" onClick={() => setCloseOpen(true)}><LockKeyhole className="mr-2 size-4" />Finalizar turno</Button></div><div className="mt-6 border-t pt-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-medium">Movimientos recientes</h2><span className="text-xs text-muted-foreground">{movements.length} registrados</span></div>{movements.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Todavía no hay movimientos. El saldo inicial está listo para operar.</p> : <div className="space-y-2">{movements.slice(0, 8).map((movement) => <MovementRow key={movement.id} movement={movement} />)}</div>}</div></CardContent></Card><Card className="h-fit"><CardHeader><CardTitle>Resumen del turno</CardTitle><CardDescription>Lectura rápida del efectivo físico.</CardDescription></CardHeader><CardContent className="space-y-4"><SummaryRow label="Apertura" value={money(shift.openingAmount)} /><SummaryRow label="Ingresos en efectivo" value={`+ ${money(totals.cashIn)}`} positive /><SummaryRow label="Retiros" value={`− ${money(totals.cashOut)}`} negative /><div className="border-t pt-4"><SummaryRow label="Esperado al cierre" value={money(expected)} strong /></div></CardContent></Card></div>
      </>}
    </>}
    <MovementDialog type={movementOpen} open={!!movementOpen} onOpenChange={(open) => !open && setMovementOpen(null)} onSubmit={saveMovement} saving={saving} />
    <CloseDialog open={closeOpen} onOpenChange={setCloseOpen} expected={expected} onSubmit={saveClose} saving={saving} />
  </div>
}

async function getCashMovementsForShift(id: number) { return getCashShiftMovements(id) }
function Metric({ label, value, icon, tone, emphasis }: { label: string; value: string; icon: ReactNode; tone?: 'positive' | 'negative'; emphasis?: boolean }) { return <Card size="sm" className={emphasis ? 'bg-foreground text-background' : ''}><CardContent><div className="flex items-center justify-between"><span className={emphasis ? 'text-background/70 text-xs' : 'text-xs text-muted-foreground'}>{label}</span><span className={tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : emphasis ? 'text-background' : 'text-muted-foreground'}>{icon}</span></div><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></CardContent></Card> }
function SummaryRow({ label, value, positive, negative, strong }: { label: string; value: string; positive?: boolean; negative?: boolean; strong?: boolean }) { return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className={strong ? 'font-semibold' : positive ? 'font-medium text-emerald-700' : negative ? 'font-medium text-rose-700' : 'font-medium'}>{value}</span></div> }
function MovementRow({ movement }: { movement: CashMovement }) { const isIn = movement.type === 'CASH_IN'; return <div className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="flex min-w-0 items-center gap-3"><div className={isIn ? 'flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700' : 'flex size-8 items-center justify-center rounded-full bg-rose-100 text-rose-700'}>{isIn ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{movement.reason || (isIn ? 'Ingreso' : 'Retiro')}</p><p className="text-xs text-muted-foreground">{dateTime(movement.createdAt)}</p></div></div><span className={isIn ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{isIn ? '+' : '−'} {money(movement.amount)}</span></div> }
function OpenShift({ register, openingAmount, setOpeningAmount, onSubmit, saving }: { register?: CashRegister; openingAmount: string; setOpeningAmount: (value: string) => void; onSubmit: () => void; saving: boolean }) { return <Card className="overflow-hidden"><div className="grid gap-0 md:grid-cols-[1fr_0.8fr]"><div className="p-6 md:p-8"><Badge variant="info">Paso 1 de 1</Badge><h2 className="mt-4 text-2xl font-semibold tracking-tight">Comienza tu turno</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Registra el efectivo disponible antes de comenzar. Este monto será la base del arqueo.</p><div className="mt-6 max-w-sm space-y-2"><Label htmlFor="opening-amount">Saldo inicial</Label><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input id="opening-amount" type="number" min="0" step="0.01" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} className="pl-8 text-lg" /></div><p className="text-xs text-muted-foreground">Caja seleccionada: {register?.name || '—'}</p></div><Button className="mt-6" onClick={onSubmit} disabled={saving || !register}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Abrir turno</Button></div><div className="flex items-center justify-center bg-muted/50 p-8"><div className="max-w-xs"><Banknote className="size-8 text-muted-foreground" /><p className="mt-4 text-sm font-medium">El turno concentra tus operaciones</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Solo el efectivo modifica el saldo físico esperado.</p></div></div></div></Card> }
function MovementDialog({ type, open, onOpenChange, onSubmit, saving }: { type: 'CASH_IN' | 'CASH_OUT' | null; open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (data: { amount: string; reason: string; notes: string }) => Promise<void>; saving: boolean }) { const [amount, setAmount] = useState(''); const [reason, setReason] = useState(''); const [notes, setNotes] = useState(''); useEffect(() => { if (!open) { setAmount(''); setReason(''); setNotes('') } }, [open]); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{type === 'CASH_IN' ? 'Agregar dinero' : 'Retirar dinero'}</DialogTitle><DialogDescription>{type === 'CASH_IN' ? 'Registra un ingreso de efectivo con un motivo claro.' : 'Registra un retiro sin superar el efectivo disponible.'}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="movement-amount">Importe</Label><Input id="movement-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="movement-reason">Motivo</Label><Input id="movement-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={type === 'CASH_IN' ? 'Fondo de cambio' : 'Retiro para depósito'} /></div><div className="space-y-2"><Label htmlFor="movement-notes">Notas <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="movement-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button onClick={() => void onSubmit({ amount, reason, notes })} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Registrar</Button></DialogFooter></DialogContent></Dialog> }
function CloseDialog({ open, onOpenChange, expected, onSubmit, saving }: { open: boolean; onOpenChange: (open: boolean) => void; expected: number; onSubmit: (data: { countedAmount: string; closingNotes: string; differenceReason: string }) => Promise<void>; saving: boolean }) { const [countedAmount, setCountedAmount] = useState(''); const [closingNotes, setClosingNotes] = useState(''); const [differenceReason, setDifferenceReason] = useState(''); useEffect(() => { if (!open) { setCountedAmount(''); setClosingNotes(''); setDifferenceReason('') } }, [open]); const difference = Number(countedAmount || 0) - expected; return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Finalizar turno</AlertDialogTitle><AlertDialogDescription>Cuenta el efectivo físico y confirma el arqueo. Esta acción bloquea nuevas operaciones.</AlertDialogDescription></AlertDialogHeader><div className="space-y-4"><div className="rounded-lg bg-muted/60 p-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Saldo esperado</span><strong>{money(expected)}</strong></div>{countedAmount && <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Diferencia</span><strong className={difference === 0 ? 'text-emerald-700' : 'text-rose-700'}>{money(difference)}</strong></div>}</div><div className="space-y-2"><Label htmlFor="counted-amount">Efectivo contado</Label><Input id="counted-amount" type="number" min="0" step="0.01" value={countedAmount} onChange={(event) => setCountedAmount(event.target.value)} /></div>{countedAmount && Math.abs(difference) > 0.001 && <div className="space-y-2"><Label htmlFor="difference-reason">Motivo de la diferencia</Label><Input id="difference-reason" value={differenceReason} onChange={(event) => setDifferenceReason(event.target.value)} placeholder="Explica la diferencia" /></div>}<div className="space-y-2"><Label htmlFor="closing-notes">Notas <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="closing-notes" value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} /></div></div><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void onSubmit({ countedAmount, closingNotes, differenceReason }) }}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Cerrar turno</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> }
function EmptyCash() { return <Card><CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center"><WalletCards className="size-8 text-muted-foreground" /><h2 className="text-lg font-medium">No hay cajas disponibles</h2><p className="max-w-sm text-sm text-muted-foreground">Solicita a un administrador que habilite una caja para tu clínica.</p></CardContent></Card> }
