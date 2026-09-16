'use client'

import { useEffect, useState } from 'react'
import { Bell, Calendar, Clock, MapPin } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '../ui/sidebar'

interface HeaderProps {
  clinicName: string
  notificationCount?: number
  title?: string
  description?: string
}

type HeaderContent = {
  eyebrow: string
  title: string
  description: string
}

type PosHeaderState = {
  userName: string
  cashRegisterName: string
  cashShiftId: number | null
  completedSales: number
  waitingCount: number
}

const defaultHeaderContent: HeaderContent = {
  eyebrow: 'Espacio de trabajo',
  title: 'Panel de usuario',
  description: 'Gestiona la operación diaria de tu clínica.',
}

const getHeaderContent = (pathname: string): HeaderContent => {
  if (pathname === '/workstation/user') {
    return {
      eyebrow: 'Inicio',
      title: 'Resumen de hoy',
      description: 'Una vista rápida de la actividad de tu clínica.',
    }
  }

  const routeContent: Array<[string, HeaderContent]> = [
    ['/workstation/user/clientes', { eyebrow: 'Clientes', title: 'Gestión de clientes', description: 'Consulta fichas, historial y datos de contacto.' }],
    ['/workstation/user/mascotas', { eyebrow: 'Pacientes', title: 'Gestión de mascotas', description: 'Mantén organizada la información clínica de cada paciente.' }],
    ['/workstation/user/citas', { eyebrow: 'Agenda', title: 'Citas', description: 'Organiza turnos, disponibilidad y próximos encuentros.' }],
    ['/workstation/user/consultas', { eyebrow: 'Atención clínica', title: 'Consultas', description: 'Registra y consulta la evolución médica de tus pacientes.' }],
    ['/workstation/user/cola', { eyebrow: 'Operación', title: 'Cola de atención', description: 'Coordina el flujo de pacientes en tiempo real.' }],
    ['/workstation/user/consultorios', { eyebrow: 'Operación', title: 'Consultorios', description: 'Organiza los espacios disponibles para la atención.' }],
    ['/workstation/user/ventas', { eyebrow: 'Caja', title: 'Ventas', description: 'Revisa operaciones, cobros y movimientos de la clínica.' }],
    ['/workstation/user/sales', { eyebrow: 'Caja', title: 'Ventas', description: 'Revisa operaciones, cobros y movimientos de la clínica.' }],
    ['/workstation/user/cash', { eyebrow: 'Caja', title: 'Caja', description: 'Controla turnos, movimientos y cierres de caja.' }],
    ['/workstation/user/inventario', { eyebrow: 'Catálogo', title: 'Inventario', description: 'Controla productos, servicios y disponibilidad.' }],
    ['/workstation/user/pos', { eyebrow: 'Punto de venta', title: 'Caja y ventas', description: 'Registra operaciones de forma rápida y segura.' }],
    ['/workstation/user/configuracion', { eyebrow: 'Configuración', title: 'Configuración', description: 'Personaliza los datos y preferencias de tu clínica.' }],
    ['/workstation/user/settings', { eyebrow: 'Cuenta', title: 'Configuración de cuenta', description: 'Administra tu contraseña y preferencias personales.' }],
  ]

  return routeContent.find(([prefix]) => pathname.startsWith(prefix))?.[1] || defaultHeaderContent
}

export function Header({ clinicName, notificationCount = 0, title }: HeaderProps) {
  const pathname = usePathname()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [posState, setPosState] = useState<PosHeaderState | null>(null)

  useEffect(() => {
    if (pathname !== '/workstation/user/pos') {
      return
    }
    const onPosHeaderState = (event: Event) => {
      setPosState((event as CustomEvent<PosHeaderState>).detail)
    }
    window.addEventListener('pos-header-state', onPosHeaderState)
    return () => window.removeEventListener('pos-header-state', onPosHeaderState)
  }, [pathname])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Formatear fecha en español: "26 de Mayo, 2024"
  const formattedDate = currentDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Formatear hora en español: "10:42 AM"
  const formattedTime = currentDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  // Preparar el contador de notificaciones para conectar con backend
  // Por ahora usa el prop, pero está listo para recibir de una API
  const getNotificationBadge = () => {
    if (notificationCount <= 0) return null
    if (notificationCount > 99) return '99+'
    return notificationCount.toString()
  }

  const badgeContent = getNotificationBadge()
  const content = getHeaderContent(pathname)

  return (
    <header className='border-b border-slate-200/80 bg-white px-4 py-2 sm:px-6'>
      <div className='flex min-h-10 items-center justify-between gap-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <SidebarTrigger className='shrink-0' />
          <div className='min-w-0'>
            <div className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
              <span>{content.eyebrow}</span>
              <span className='h-1 w-1 rounded-full bg-slate-300' aria-hidden='true' />
              <span className='flex items-center gap-1 truncate normal-case tracking-normal text-slate-500'>
                <MapPin className='size-3.5 shrink-0' aria-hidden='true' />
                {clinicName}
              </span>
            </div>
            <h1 className='truncate text-lg font-semibold leading-tight tracking-tight text-slate-950'>
              {title || content.title}
            </h1>
          </div>
        </div>

        <div className='flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4'>
          {pathname === '/workstation/user/pos' && posState && (
            <div className='hidden min-w-0 items-center gap-2 text-xs text-slate-500 md:flex'>
              <div className='hidden min-w-0 items-center gap-1.5 border-r border-slate-200 pr-3 lg:flex'>
                <span className='min-w-0 truncate'>
                  <strong className='block truncate text-slate-800'>{posState.userName}</strong>
                  {posState.cashRegisterName} · Turno {posState.cashShiftId ? `#${posState.cashShiftId}` : 'sin iniciar'}
                </span>
              </div>
              <div className='hidden border-r border-slate-200 pr-3 lg:block'>
                <strong className='block text-slate-800'>{posState.completedSales}</strong>
                Ventas de esta sesión
              </div>
              <button
                type='button'
                className='inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 font-medium text-amber-800 transition-colors hover:bg-amber-100'
                onClick={() => window.dispatchEvent(new CustomEvent('pos-open-waiting'))}
              >
                <Clock className='size-3.5' aria-hidden='true' />
                <span className='hidden xl:inline'>Cuentas en espera</span>
                {posState.waitingCount > 0 && (
                  <span className='rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold'>
                    {posState.waitingCount}
                  </span>
                )}
              </button>
            </div>
          )}
          <div className='hidden items-center gap-1.5 text-sm text-slate-500 lg:flex'>
            <Calendar className='size-4 shrink-0' aria-hidden='true' />
            <span className='whitespace-nowrap'>{formattedDate}</span>
          </div>

          <div className='hidden items-center gap-1.5 text-sm text-slate-500 md:flex'>
            <Clock className='size-4 shrink-0' aria-hidden='true' />
            <span className='whitespace-nowrap font-mono tabular-nums'>{formattedTime}</span>
          </div>

          <div className='relative'>
            <button
              type='button'
              className='flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'
              aria-label='Notificaciones'
            >
              <Bell className='size-5' aria-hidden='true' />
              {badgeContent && (
                <span className='absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-medium text-white'>
                  {badgeContent}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
