'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  PawPrint,
  ListOrdered,
  CalendarDays,
  CreditCard,
  AlertCircle,
  Settings,
  Search,
  UserPlus,
  History,
  PlusCircle,
  Clock,
  Eye,
  Plus,
  Calendar,
  CalendarPlus,
  ShoppingCart,
  Stethoscope,
  Wallet,
  BarChart3,
  Banknote,
  User,
  LogOut,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Users,
  PawPrint,
  ListOrdered,
  CalendarDays,
  CreditCard,
  AlertCircle,
  Settings,
  Search,
  UserPlus,
  History,
  PlusCircle,
  Clock,
  Eye,
  Plus,
  Calendar,
  CalendarPlus,
  ShoppingCart,
  Stethoscope,
  Wallet,
  BarChart3,
  Banknote,
  User,
  LogOut,
  ChevronDown,
  ChevronRight
}

interface MenuItem {
  href?: string
  label: string
  icon: string
  submenu?: MenuItem[]
}

const userMenuItems: MenuItem[] = [
  {
    href: '/workstation/user',
    label: 'Inicio',
    icon: 'Home'
  },
  {
    label: 'Clientes',
    icon: 'Users',
    submenu: [
      { href: '/workstation/user/clientes/buscar', label: 'Buscar cliente', icon: 'Search' },
      { href: '/workstation/user/clientes/nuevo', label: 'Crear cliente', icon: 'UserPlus' },
      { href: '/workstation/user/clientes/recientes', label: 'Clientes recientes', icon: 'History' }
    ]
  },
  {
    label: 'Mascotas',
    icon: 'PawPrint',
    submenu: [
      { href: '/workstation/user/mascotas/buscar', label: 'Buscar mascota', icon: 'Search' },
      { href: '/workstation/user/mascotas/nueva', label: 'Crear mascota', icon: 'PlusCircle' },
      { href: '/workstation/user/mascotas/recientes', label: 'Últimas atendidas', icon: 'Clock' }
    ]
  },
  {
    label: 'Cola de atención',
    icon: 'ListOrdered',
    submenu: [
      { href: '/workstation/user/cola', label: 'Ver cola actual', icon: 'Eye' },
      { href: '/workstation/user/cola/agregar', label: 'Agregar a cola', icon: 'Plus' }
    ]
  },
  {
    label: 'Agenda',
    icon: 'CalendarDays',
    submenu: [
      { href: '/workstation/user/agenda/hoy', label: 'Turnos de hoy', icon: 'Calendar' },
      { href: '/workstation/user/agenda/nuevo', label: 'Crear turno', icon: 'CalendarPlus' }
    ]
  },
  {
    label: 'Ventas y Caja',
    icon: 'CreditCard',
    submenu: [
      { href: '/workstation/user/ventas/nueva', label: 'Nueva venta rápida', icon: 'ShoppingCart' },
      { href: '/workstation/user/ventas/consulta', label: 'Cobrar consulta', icon: 'Stethoscope' },
      { href: '/workstation/user/caja', label: 'Apertura / Cierre de caja', icon: 'Wallet' },
      { href: '/workstation/user/ventas/hoy', label: 'Ventas del día', icon: 'BarChart3' }
    ]
  },
  {
    label: 'Deudas',
    icon: 'AlertCircle',
    submenu: [
      { href: '/workstation/user/deudas', label: 'Clientes con deuda', icon: 'Users' },
      { href: '/workstation/user/deudas/cobrar', label: 'Cobrar deuda', icon: 'Banknote' }
    ]
  },
  {
    label: 'Cuenta',
    icon: 'Settings',
    submenu: [
      { href: '/workstation/user/perfil', label: 'Mi perfil', icon: 'User' },
      { href: '/logout', label: 'Cerrar sesión', icon: 'LogOut' }
    ]
  }
]

function MenuItemComponent({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { logout } = useAuthStore()

  const hasSubmenu = item.submenu && item.submenu.length > 0
  const Icon = iconMap[item.icon] || Home
  const isActive = item.href ? pathname === item.href : false

  const handleClick = () => {
    if (item.href === '/logout') {
      logout()
      router.push('/login')
      return
    }
    if (hasSubmenu) {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div>
      {hasSubmenu ? (
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
          style={{ paddingLeft: `${${depth * 12 + 12}}px` }}
        >
          <div className='flex items-center gap-3'>
            <Icon className='w-5 h-5' />
            <span>{item.label}</span>
          </div>
          {isOpen ? <ChevronDown className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
        </button>
      ) : (
        <Link
          href={item.href || '#'}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
          style={{ paddingLeft: `${${depth * 12 + 12}}px` }}
        >
          <Icon className='w-5 h-5' />
          <span>{item.label}</span>
        </Link>
      )}
      {hasSubmenu && isOpen && (
        <div className='mt-1'>
          {item.submenu!.map((subItem, idx) => (
            <MenuItemComponent key={idx} item={subItem} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  return (
    <aside className='w-64 bg-white border-r h-screen overflow-y-auto hidden md:block'>
      <div className='p-4 border-b'>
        <h2 className='text-lg font-semibold text-gray-900'>Menú</h2>
      </div>
      <nav className='p-2 space-y-1'>
        {userMenuItems.map((item) => {
          const hasSubmenu = item.submenu && item.submenu.length > 0
          const Icon = iconMap[item.icon] || Home
          const isActive = item.href ? pathname === item.href : false
          const isExpanded = expandedItems.has(item.label)

          return hasSubmenu ? (
            <div key={item.label}>
              <button
                onClick={() => toggleExpand(item.label)}
                className='w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <Icon className='w-5 h-5' />
                  <span>{item.label}</span>
                </div>
                {isExpanded ? <ChevronDown className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
              </button>
              {isExpanded && (
                <div className='mt-1 ml-3 space-y-1'>
                  {item.submenu!.map((subItem) => {
                    const SubIcon = iconMap[subItem.icon] || Home
                    const isSubActive = pathname === subItem.href
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href || '#'}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isSubActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <SubIcon className='w-4 h-4' />
                        <span>{subItem.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href || '#'}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Icon className='w-5 h-5' />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
