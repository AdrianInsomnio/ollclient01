'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { getSidebarForRole, MenuGroup, MenuItem, flattenMenuItems, searchMenuItems, FlattenedMenuItem, getIcon } from '@/lib/sidebar-menus'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
import { SearchForm, SearchFormRef } from './search-form'

interface MenuItemProps {
  item: FlattenedMenuItem
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

  const indentStyle = depth > 0 ? { paddingLeft: '1.5rem' } : {}

  return (
    <SidebarMenuItem style={indentStyle}>
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
          className='flex w-full items-center justify-between px-2 py-1.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors'
          style={{ marginLeft: '-8px' }}
        >
          <div className='flex items-center gap-2'>
            <GroupIcon className='w-5 h-5 shrink-0' />
            <span>{group.label}</span>
          </div>
        </button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => (
            <MenuItemComponent key={item.href || item.label} item={{
              label: item.label,
              href: item.href,
              icon: item.icon,
              groupLabel: group.label,
              groupIcon: group.icon,
              depth: 0,
              submenu: item.submenu,
            }} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default function SidebarShadcn() {
  const { user } = useAuthStore()
  const role = user?.role || 'USER'
  const menuGroups = user ? getSidebarForRole(role) : []
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const searchInputRef = useRef<SearchFormRef>(null)

  // Flatten menu items for searching
  const flattenedItems = useMemo(() => flattenMenuItems(menuGroups), [menuGroups])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 200) // 200ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search results
  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.trim() === '') {
      return null // null means show full menu
    }
    return searchMenuItems(flattenedItems, debouncedSearchQuery)
  }, [flattenedItems, debouncedSearchQuery])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K (Windows/Linux) or Cmd+K (Mac) to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }

      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('')
        searchInputRef.current?.clear?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  // Transform user for NavUser component
  const navUser = user ? {
    username: user.username,
    email: user.email,
    avatar: '', // User type doesn't have avatar, use empty string for fallback
  } : {
    username: '',
    email: '',
    avatar: '',
  }

  return (
    <Sidebar collapsible='offcanvas' className='w-64'>
      <SidebarHeader>
        <div className='flex h-16 items-center gap-2 px-4'>
          <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
            <PanelLeftIcon className='size-5' />
          </div>
          <span className='text-lg font-semibold'>Vet-app</span>
        </div>
        <SearchForm
          ref={searchInputRef}
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {searchResults !== null ? (
                // Search results: render flat list without group labels
                searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <MenuItemComponent key={item.href || item.label} item={item} depth={item.depth} />
                  ))
                ) : (
                  <div className='px-3 py-4 text-center text-sm text-muted-foreground'>
                    No se encontraron resultados para &quot;{debouncedSearchQuery}&quot;
                  </div>
                )
              ) : (
                // Normal view: render groups (without labels visually)
                menuGroups.map((group) => (
                  <MenuGroupComponent key={group.label} group={group} />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
