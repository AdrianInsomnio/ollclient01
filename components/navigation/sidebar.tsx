'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { getSidebarForRole, MenuItem } from '@/lib/sidebar-menus'
import { getIcon } from '@/lib/sidebar-menus'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MenuItemProps { item: MenuItem; depth?: number }
function MenuItemComponent({ item, depth = 0 }: MenuItemProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuthStore()
  const Icon = getIcon(item.icon)
  const isActive = item.href ? pathname === item.href : false
  const handleClick = () => { if (item.href === '/logout') { logout(); router.push('/login') } }
  return (
    <Link href={item.href || '#'} onClick={handleClick}
      className={isActive ? 'bg-gray-100' : 'text-gray-700'}
    >
      <Icon className="w-5 h-5" />
      <span>{item.label}</span>
    </Link>
  )
}
export default function Sidebar() {
  const { user } = useAuthStore()
  const [expandedItems, setExpandedItems] = useState(new Set())
  const role = user?.role || 'USER'
  const menuItems = user ? getSidebarForRole(role) : [] 
  const toggleExpand = (label: string) => { setExpandedItems(prev => { const next = new Set(prev); if (next.has(label)) next.delete(label); else next.add(label); return next }) }
  return (
    <aside className="w-64 bg-white border-r h-screen overflow-y-auto">
      <div className="p-4 ">
        <h2 className="text-lg font-semibold">VetApp</h2>
      </div>
      <nav className="p-2 space-y-1">
        {menuItems.map((group) => {
          const GroupIcon = getIcon(group.icon)
          const isExpanded = expandedItems.has(group.label)
          return (
            <div key={group.label}>
              <button onClick={() => toggleExpand(group.label)} className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium">
                <div className="flex items-center gap-3">
                  <GroupIcon className="w-5 h-5" />
                  <span>{group.label}</span>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isExpanded && (
                <div className="mt-1 ml-3 space-y-1">
                  {group.items.map((item) => (
                    <MenuItemComponent key={item.href} item={item} depth={1} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}