'use client'

import { useEffect, useState } from 'react'
import { Bell, Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SidebarTrigger } from '../ui/sidebar'

interface HeaderProps {
  clinicName: string
  notificationCount?: number
}

export function Header({ clinicName, notificationCount = 0 }: HeaderProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

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

  return (
    <header className='border-b border-gray-100 bg-white px-6 py-3'>
      <div className='flex items-center justify-between gap-4'>
        {/* Lado izquierdo - Nombre de la clínica */}
        <SidebarTrigger />      
        <div className='flex-1 min-w-0'>
          <h1 className='text-lg font-semibold text-gray-900 truncate'>
            {clinicName}
          </h1>
        </div>

        {/* Lado derecho - Fecha, Hora, Notificaciones */}
        <div className='flex items-center gap-4 shrink-0'>
          {/* Fecha */}
          <div className='hidden sm:flex items-center gap-1.5 text-sm text-gray-600'>
            <Calendar className='w-4 h-4 shrink-0' aria-hidden='true' />
            <span className='whitespace-nowrap'>{formattedDate}</span>
          </div>

          {/* Hora */}
          <div className='hidden md:flex items-center gap-1.5 text-sm text-gray-600'>
            <Clock className='w-4 h-4 shrink-0' aria-hidden='true' />
            <span className='whitespace-nowrap font-mono tabular-nums'>{formattedTime}</span>
          </div>

          {/* Notificaciones */}
          <div className='relative'>
            <button
              type='button'
              className='flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors'
              aria-label='Notificaciones'
            >
              <Bell className='w-5 h-5' />
              {badgeContent && (
                <span className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1'>
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
