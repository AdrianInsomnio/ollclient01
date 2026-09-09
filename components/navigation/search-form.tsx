'use client'

import { Search, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { SidebarGroup, SidebarGroupContent, SidebarInput } from '@/components/ui/sidebar'
import { useRef, useImperativeHandle, forwardRef } from 'react'

interface SearchFormProps extends Omit<React.ComponentProps<'form'>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onArrowDown?: () => void
}

// Custom ref type for the search form
export interface SearchFormRef {
  focus: () => void
  select: () => void
  clear: () => void
}

export const SearchForm = forwardRef<SearchFormRef, SearchFormProps>(
  ({ value, onChange, onArrowDown, ...props }, ref) => {
    const inputElementRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => inputElementRef.current?.focus(),
      select: () => inputElementRef.current?.select(),
      clear: () => {
        if (inputElementRef.current) {
          inputElementRef.current.value = ''
          onChange?.('')
        }
      },
    }))

    return (
      <form {...props}>
        <SidebarGroup className='py-0'>
          <SidebarGroupContent className='relative'>
            <Label htmlFor='search' className='sr-only'>Search</Label>
            <SidebarInput
              id='search'
              placeholder='Buscar...'
              className='pl-8 pr-8'
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  onArrowDown?.()
                }
              }}
              ref={inputElementRef}
            />
            <Search className='pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none' />
            {value && (
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  onChange?.('')
                  inputElementRef.current?.focus()
                }}
                className='pointer-events-auto absolute top-1/2 right-2 size-4 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity select-none'
                aria-label='Limpiar búsqueda'
              >
                <X className='size-3' />
              </button>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </form>
    )
  }
)

SearchForm.displayName = 'SearchForm'
