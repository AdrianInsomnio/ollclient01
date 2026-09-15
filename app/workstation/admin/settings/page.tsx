'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Activity, Bell, Boxes, CalendarClock, DoorOpen, History, Package, Pencil, Receipt, Save, Settings2, Users, X } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { getClinicSettings, updateClinicSettings, type ClinicSettings } from '@/lib/api/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ClinicForm = {
  name: string
  rut: string
  website: string
  address: string
  phone: string
  email: string
  timezone: string
}

const EMPTY_FORM: ClinicForm = { name: '', rut: '', website: '', address: '', phone: '', email: '', timezone: 'America/Montevideo' }

const settingsNavigation = [
  { label: 'General', icon: Settings2, href: '/workstation/admin/settings/general', active: true },
  { label: 'Usuarios y permisos', icon: Users, href: '/workstation/admin/settings/users' },
  { label: 'Inventario clínico', icon: Package, href: '/workstation/admin/settings/inventory/categories' },
  { label: 'Ventas / Cajas POS', icon: Boxes, href: '/workstation/admin/settings/pos' },
  { label: 'Boxes / Consultorios', icon: DoorOpen, href: '/workstation/admin/settings/consultorios' },
  { label: 'Agenda y citas', icon: CalendarClock, href: '/workstation/admin/settings/agenda' },
  { label: 'Notificaciones', icon: Bell, disabled: true },
  { label: 'Facturacin electrónica', icon: Receipt, disabled: true },
  { label: 'Sistema y auditoría', icon: History, disabled: true },
]

function toForm(clinic: ClinicSettings): ClinicForm {
  return { name: clinic.name ?? '', rut: clinic.rut ?? '', website: clinic.website ?? '', address: clinic.address ?? '', phone: clinic.phone ?? '', email: clinic.email ?? '', timezone: clinic.timezone ?? 'America/Montevideo' }
}

export default function AdminSettingsPage() {
  const [clinic, setClinic] = useState<ClinicSettings | null>(null)
  const [form, setForm] = useState<ClinicForm>(EMPTY_FORM)
  const [original, setOriginal] = useState<ClinicForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setPageError(null)
    try {
      const data = await getClinicSettings()
      const nextForm = toForm(data)
      setClinic(data)
      setForm(nextForm)
      setOriginal(nextForm)
      setEditOpen(false)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo cargar la configuración de la clínica'
      setPageError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadSettings() }, [loadSettings])

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original])
  const updateField = <K extends keyof ClinicForm>(field: K, value: ClinicForm[K]) => setForm((current) => ({ ...current, [field]: value }))

  const handleSave = async () => {
    if (!hasChanges || saving) return
    if (!form.name.trim()) {
      toast.error('El nombre comercial es obligatorio')
      return
    }
    setSaving(true)
    try {
      const updated = await updateClinicSettings({ ...form, name: form.name.trim() })
      const nextForm = toForm(updated)
      setClinic(updated)
      setEditOpen(false)
      setForm(nextForm)
      setOriginal(nextForm)
      toast.success('Configuración guardada correctamente')
    } catch (error) {
      toast.error(error instanceof ApiError ? `${error.code}: ${error.message}` : 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const discardChanges = () => {
    setForm(original)
    setDiscardOpen(false)
  }

  const handleDiscard = () => {
    if (hasChanges) setDiscardOpen(true)
    else setForm(original)
  }

  const openEditDialog = () => {
    setForm(original)
    setEditOpen(true)
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <div className='flex shrink-0 flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <div className='mb-2 flex items-center gap-1.5 text-xs text-muted-foreground'><span>Configuración</span><span>/</span><span>Administración de Clínica</span><span>/</span><span className='text-foreground'>General</span></div>
          <div className='flex flex-wrap items-center gap-3'><h1 className='text-2xl font-semibold tracking-tight'>Parámetros del Centro Veterinario</h1><Badge variant='outline'>Edición en caliente</Badge></div>
          <p className='mt-1 text-sm text-muted-foreground'>Administra la identidad y los parmetros regionales de tu clínica.</p>
        </div>
        <div className='flex flex-wrap gap-2'><Button variant='outline' onClick={openEditDialog} disabled={loading || saving}><Pencil /> Editar datos</Button><Button variant='outline' onClick={handleDiscard} disabled={saving}><X /> Descartar</Button><Button onClick={() => void handleSave()} disabled={!hasChanges || saving}><Save /> {saving ? 'Guardando...' : 'Guardar cambios'}</Button></div>
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!open && !saving) setEditOpen(false) }}><DialogContent className='max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle>Editar datos de la clínica</DialogTitle><DialogDescription>Corrige los datos que se muestran en documentos y comunicaciones.</DialogDescription></DialogHeader><div className='grid gap-4 sm:grid-cols-2'><div className='space-y-2'><Label htmlFor='modal-clinic-name'>Nombre comercial</Label><Input id='modal-clinic-name' value={form.name} onChange={(event) => updateField('name', event.target.value)} disabled={saving} /></div><div className='space-y-2'><Label htmlFor='modal-clinic-phone'>Teléfono principal</Label><Input id='modal-clinic-phone' value={form.phone} onChange={(event) => updateField('phone', event.target.value)} disabled={saving} /></div><div className='space-y-2'><Label htmlFor='modal-clinic-email'>Correo electrónico</Label><Input id='modal-clinic-email' type='email' value={form.email} onChange={(event) => updateField('email', event.target.value)} disabled={saving} /></div><div className='space-y-2'><Label htmlFor='modal-clinic-website'>Sitio web</Label><Input id='modal-clinic-website' type='url' value={form.website} onChange={(event) => updateField('website', event.target.value)} disabled={saving} /></div><div className='space-y-2 sm:col-span-2'><Label htmlFor='modal-clinic-address'>Dirección física</Label><Textarea id='modal-clinic-address' value={form.address} onChange={(event) => updateField('address', event.target.value)} disabled={saving} rows={3} /></div><div className='space-y-2'><Label htmlFor='modal-clinic-rut'>Identificación fiscal / RUT</Label><Input id='modal-clinic-rut' value={form.rut} onChange={(event) => updateField('rut', event.target.value)} disabled={saving} /></div><div className='space-y-2'><Label>Zona horaria</Label><Select value={form.timezone} onValueChange={(value) => updateField('timezone', value)} disabled={saving}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='America/Montevideo'>America/Montevideo</SelectItem><SelectItem value='UTC'>UTC</SelectItem><SelectItem value='America/Argentina/Buenos_Aires'>America/Argentina/Buenos_Aires</SelectItem><SelectItem value='America/Sao_Paulo'>America/Sao_Paulo</SelectItem></SelectContent></Select></div></div><DialogFooter><Button type='button' variant='outline' onClick={() => setEditOpen(false)} disabled={saving}>Cancelar</Button><Button type='button' onClick={() => void handleSave()} disabled={!hasChanges || saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button></DialogFooter></DialogContent></Dialog>
      <div className='min-h-0 flex-1 overflow-y-auto py-5'>
        {pageError && <div className='mb-5 flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'><span>{pageError}</span><Button variant='outline' size='sm' onClick={() => void loadSettings()}>Reintentar</Button></div>}
        <div className='mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4'><Activity className='mt-0.5 size-5 shrink-0 text-primary' /><div><p className='font-medium'>Aislamiento activo: {clinic?.name || 'Cargando clínica...'}</p><p className='mt-1 text-sm text-muted-foreground'>La configuración pertenece exclusivamente a esta clínica. Los cambios no afectan a otras clínicas u organizaciones.{clinic?.id ? ` Clínica #${clinic.id}.` : ''}</p></div></div>

        <div className='grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]'>
          <nav aria-label='Configuración interna' className='h-fit rounded-xl border bg-card p-2 lg:sticky lg:top-0'>
            {settingsNavigation.map((item) => { const Icon = item.icon; return item.disabled ? <div key={item.label} className='flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground/50'><Icon className='size-4' /><span className='flex-1'>{item.label}</span><span className='text-[10px] uppercase'>Prximamente</span></div> : <Link key={item.label} href={item.href!} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${item.active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className='size-4' /><span>{item.label}</span></Link> })}
          </nav>

          <div className='space-y-5'>
            <Card><CardHeader><CardTitle>Identidad de la Clínica</CardTitle><CardDescription>Información pública utilizada en documentos, recetas, presupuestos y comunicaciones.</CardDescription></CardHeader><CardContent className='grid gap-5 sm:grid-cols-2'>
              <div className='space-y-2'><Label htmlFor='clinic-name'>Nombre comercial</Label><Input id='clinic-name' value={form.name} onChange={(event) => updateField('name', event.target.value)} disabled={loading || saving} placeholder='Nombre de la clínica' /></div>
              <div className='space-y-2'><Label htmlFor='clinic-phone'>Teléfono principal</Label><Input id='clinic-phone' value={form.phone} onChange={(event) => updateField('phone', event.target.value)} disabled={loading || saving} placeholder='+598...' /></div>
              <div className='space-y-2'><Label htmlFor='clinic-email'>Correo electrnico de contacto</Label><Input id='clinic-email' type='email' value={form.email} onChange={(event) => updateField('email', event.target.value)} disabled={loading || saving} placeholder='contacto@clinica.com' /></div>
              <div className='space-y-2'><Label htmlFor='clinic-website'>Sitio web</Label><Input id='clinic-website' type='url' value={form.website} onChange={(event) => updateField('website', event.target.value)} disabled={loading || saving} placeholder='https://...' /></div>
              <div className='space-y-2 sm:col-span-2'><Label htmlFor='clinic-address'>Dirección física</Label><Textarea id='clinic-address' value={form.address} onChange={(event) => updateField('address', event.target.value)} disabled={loading || saving} placeholder='Dirección de la clínica' rows={3} /></div>
              <div className='space-y-2'><Label htmlFor='clinic-rut'>Identificación fiscal / RUT</Label><Input id='clinic-rut' value={form.rut} onChange={(event) => updateField('rut', event.target.value)} disabled={loading || saving} placeholder='RUT (opcional)' /></div>
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Logo de la clínica</CardTitle><CardDescription>Se muestra en documentos y comunicaciones cuando existe un logo almacenado.</CardDescription></CardHeader><CardContent><div className='flex min-h-28 items-center gap-4 rounded-lg border border-dashed p-4'>{clinic?.imageUrl ? <img src={clinic.imageUrl} alt={`Logo de ${clinic.name}`} className='max-h-20 max-w-48 object-contain' /> : <div className='flex items-center gap-3 text-sm text-muted-foreground'><div className='flex size-12 items-center justify-center rounded-lg bg-muted'><Boxes className='size-5' /></div><span>No hay un logo configurado.</span></div>}<p className='text-xs text-muted-foreground'>La carga y eliminación de logos requiere el endpoint de almacenamiento existente; no se habilitan acciones falsas.</p></div></CardContent></Card>

            <Card><CardHeader><CardTitle>Parámetros operativos y regionales</CardTitle><CardDescription>Valores utilizados para fechas y operaciones de la clínica.</CardDescription></CardHeader><CardContent className='grid gap-5 sm:grid-cols-2'><div className='space-y-2'><Label>Zona horaria</Label><Select value={form.timezone} onValueChange={(value) => updateField('timezone', value)} disabled={loading || saving}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='America/Montevideo'>America/Montevideo</SelectItem><SelectItem value='UTC'>UTC</SelectItem><SelectItem value='America/Argentina/Buenos_Aires'>America/Argentina/Buenos_Aires</SelectItem><SelectItem value='America/Sao_Paulo'>America/Sao_Paulo</SelectItem></SelectContent></Select></div><div className='space-y-2'><Label>Moneda</Label><Input value='UYU - Peso uruguayo' disabled aria-describedby='currency-note' /><p id='currency-note' className='text-xs text-muted-foreground'>No existe persistencia de moneda en el modelo actual; no se simula un guardado.</p></div></CardContent></Card>

            <Card><CardHeader><CardTitle>Datos fiscales y facturacin</CardTitle><CardDescription>La informacin fiscal adicional y la facturacin electrónica DGI se integrarn cuando exista persistencia y servicio backend.</CardDescription></CardHeader><CardContent><p className='text-sm text-muted-foreground'>Actualmente se puede editar la identificacin fiscal/RUT desde la tarjeta de identidad. No se muestran certificados ni series ficticias.</p></CardContent></Card>
          </div>
        </div>
      </div>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle><AlertDialogDescription>Si descartas los cambios, se restaurarán los valores originales obtenidos de la clínica.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={discardChanges}>Descartar cambios</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}
