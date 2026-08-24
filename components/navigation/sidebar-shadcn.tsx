
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { getSidebarForRole, MenuGroup, MenuItem } from '@/lib/sidebar-menus'
import { getIcon } from '@/lib/sidebar-menus'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  useSidebar,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { PanelLeftIcon } from 'lucide-react'
import { NavUser } from '../nav-user'
import { SearchForm } from './search-form'
import { Separator } from 'radix-ui'

interface MenuItemProps {
  item: MenuItem
  depth?: number
}

function MenuItemComponent({ item, depth = 0 }: MenuItemProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuthStore()
  const Icon = getIcon(item.icon)
  const isActive = item.href ? pathname === item.href : false

  const handleClick = () => {
    if (item.href === '/logout') {
      logout()
      router.push('/login')
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        variant='default'
        size='default'
      >
        <Link href={item.href || '#'} onClick={handleClick}>
          <Icon className='w-5 h-5' />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function MenuGroupComponent({ group }: { group: MenuGroup }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  if (isCollapsed) {
    return null
  }

  const GroupIcon = getIcon(group.icon)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='flex w-full items-center justify-between px-2 py-1.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors'
          style={{ marginLeft: '-8px' }}
        >
          <div className='flex items-center gap-2'>
            <GroupIcon className='w-5 h-5 shrink-0' />
            <span>{group.label}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className='w-4 h-4 transition-transform' />
          ) : (
            <ChevronRight className='w-4 h-4 transition-transform' />
          )}
        </button>
      </SidebarGroupLabel>
      {isExpanded && (
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) => (
              <MenuItemComponent key={item.href || item.label} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  )
}

export default function SidebarShadcn() {
  const { user } = useAuthStore()
  const role = user?.role || 'USER'
  //const name = user?.username || 'User'
  const menuGroups = user ? getSidebarForRole(role) : []

  return (
    <Sidebar collapsible='offcanvas' className='w-64'>
      <SidebarHeader>
        <div className='flex h-16 items-center gap-2 px-4'>
          <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
            <PanelLeftIcon className='size-5' />
          </div>
          <span className='text-lg font-semibold'>Vet-app</span>
        </div>
       <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuGroups.map((group) => (
                <MenuGroupComponent key={group.label} group={group} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator/>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

