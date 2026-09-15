'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Boxes, CalendarClock, DoorOpen, History, Package, Receipt, Settings2, Users } from 'lucide-react'

const items = [
  { label: 'General', icon: Settings2, href: '/workstation/admin/settings/general' },
  { label: 'Usuarios y permisos', icon: Users, href: '/workstation/admin/settings/users' },
  { label: 'Inventario clínico', icon: Package, href: '/workstation/admin/settings/inventory/categories' },
  { label: 'Ventas / Cajas POS', icon: Boxes, href: '/workstation/admin/settings/pos' },
  { label: 'Boxes / Consultorios', icon: DoorOpen, href: '/workstation/admin/settings/consultorios' },
  { label: 'Agenda y citas', icon: CalendarClock, href: '/workstation/admin/settings/agenda' },
  { label: 'Notificaciones', icon: Bell, disabled: true },
  { label: 'Facturación electrónica', icon: Receipt, disabled: true },
  { label: 'Sistema y auditoría', icon: History, disabled: true },
]

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isRootGeneral = pathname === '/workstation/admin/settings' || pathname === '/workstation/admin/settings/general'

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      {!isRootGeneral && (
        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden'>
          <div className='shrink-0 border-b pb-4'>
            <div className='text-xs text-muted-foreground'>Configuración / Administración de Clínica</div>
            <h1 className='mt-1 text-xl font-semibold'>Configuración de clínica</h1>
          </div>
          <div className='grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)]'>
            <nav aria-label='Configuración interna' className='h-fit rounded-xl border bg-card p-2 lg:sticky lg:top-0'>
              {items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || (item.href && pathname.startsWith(`${item.href}/`))
                if (item.disabled) return <div key={item.label} className='flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground/50'><Icon className='size-4' /><span className='flex-1'>{item.label}</span><span className='text-[10px] uppercase'>Próximamente</span></div>
                return <Link key={item.label} href={item.href!} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className='size-4' /><span>{item.label}</span></Link>
              })}
            </nav>
            <main className='min-h-0 overflow-y-auto'>{children}</main>
          </div>
        </div>
      )}
      {isRootGeneral && children}
    </div>
  )
}
