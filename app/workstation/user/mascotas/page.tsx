'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getPets, type Pet } from '@/lib/api/pets'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty'
import {
  Plus,
  Search,
  PawPrint,
  Cake,
  Scale,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Stethoscope,
} from 'lucide-react'

const PAGE_SIZE = 8

// =====================================================================
// Helpers de presentación (sin nuevos componentes)
// =====================================================================

function computeAge(birthDate?: string): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '—'
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--
  if (years < 1) {
    const months = Math.max(
      0,
      (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth()) -
        (now.getDate() < birth.getDate() ? 1 : 0),
    )
    return months <= 1 ? '1 mes' : `${months} meses`
  }
  return years === 1 ? '1 año' : `${years} años`
}

function statusFromAge(birthDate?: string): {
  label: string
  variant: 'success' | 'warning' | 'neutral'
} {
  if (!birthDate) return { label: 'Sin registro', variant: 'neutral' }
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return { label: 'Sin registro', variant: 'neutral' }
  const ageDays = Math.floor(
    (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24),
  )
  // Derivado local: cachorro < 1 año, adulto 1-10, senior > 10
  if (ageDays < 365) return { label: 'Cachorro', variant: 'success' }
  if (ageDays < 3650) return { label: 'Adulto', variant: 'neutral' }
  return { label: 'Senior', variant: 'warning' }
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

function filterPets(pets: Pet[], query: string): Pet[] {
  if (!query.trim()) return pets
  const q = query.trim().toLowerCase()
  return pets.filter((p) => {
    const fields = [p.name, p.species, p.breed, p.sex, p.client?.name].filter(Boolean) as string[]
    return fields.some((f) => f.toLowerCase().includes(q))
  })
}

// =====================================================================
// Subcomponentes locales (presentacionales, sin estado)
// =====================================================================

function PetCardSkeleton() {
  return (
    <Card className='h-full'>
      <CardContent className='pt-4'>
        <div className='flex items-start gap-3'>
          <div className='h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted' />
          <div className='flex-1 space-y-2'>
            <div className='h-4 w-2/3 animate-pulse rounded bg-muted' />
            <div className='h-3 w-1/2 animate-pulse rounded bg-muted' />
          </div>
        </div>
        <div className='mt-4 flex gap-2'>
          <div className='h-5 w-16 animate-pulse rounded-full bg-muted' />
          <div className='h-5 w-20 animate-pulse rounded-full bg-muted' />
        </div>
      </CardContent>
    </Card>
  )
}

function PetCard({ pet }: { pet: Pet }) {
  const age = computeAge(pet.birthDate)
  const status = statusFromAge(pet.birthDate)
  const initials = getInitials(pet.name)

  return (
    <Card className='group h-full transition-colors hover:border-primary/40 hover:bg-muted/20'>
      <CardContent className='flex h-full flex-col gap-4 pt-4'>
        <div className='flex items-start gap-3'>
          <Avatar
            size='lg'
            className='h-12 w-12 shrink-0 ring-2 ring-primary/10'
          >
            <AvatarFallback className='bg-primary/10 text-primary text-sm font-semibold'>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1 space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='truncate text-sm font-semibold text-foreground'>
                {pet.name}
              </h3>
              <Badge variant={status.variant} className='text-[10px]'>
                {status.label}
              </Badge>
            </div>
            <p className='truncate text-xs text-muted-foreground'>
              {pet.species}
              {pet.breed ? ` · ${pet.breed}` : ''}
            </p>
          </div>
        </div>

        <div className='flex flex-wrap gap-1.5'>
          <Badge variant='outline' className='gap-1 px-2 py-0.5 text-[11px]'>
            <Cake className='h-3 w-3 text-muted-foreground' />
            <span className='text-muted-foreground font-normal'>Edad</span>
            <span className='font-medium text-foreground'>{age}</span>
          </Badge>
          <Badge variant='outline' className='gap-1 px-2 py-0.5 text-[11px]'>
            <Scale className='h-3 w-3 text-muted-foreground' />
            <span className='text-muted-foreground font-normal'>Peso</span>
            <span className='font-medium text-foreground'>
              {pet.weight ? `${pet.weight} kg` : '—'}
            </span>
          </Badge>
        </div>

        <Separator />

        <div className='flex items-center justify-between'>
          <span className='truncate text-xs text-muted-foreground'>
            {pet.client?.name
              ? `Tutor: ${pet.client.name}`
              : `Cliente #${pet.clientId}`}
          </span>
          <Link
            href={`/workstation/user/mascotas/${pet.id}`}
            className='inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80'
          >
            Ver detalle
            <ArrowRight className='h-3 w-3 transition-transform group-hover:translate-x-0.5' />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================================================
// Página
// =====================================================================

export default function MascotasPage() {
  const { data: pets, isLoading } = useQuery({
    queryKey: ['pets'],
    queryFn: () => getPets(),
  })

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filteredPets = useMemo(
    () => filterPets(pets ?? [], query),
    [pets, query],
  )

  const totalPages = Math.max(1, Math.ceil(filteredPets.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visiblePets = filteredPets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const totalCount = pets?.length ?? 0

  return (
    <div className='space-y-6'>
      {/* ===== Header de página ===== */}
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-semibold tracking-tight text-foreground'>
            Mascotas
          </h1>
          <p className='text-sm text-muted-foreground'>
            {isLoading
              ? 'Cargando mascotas…'
              : totalCount === 0
                ? 'Aún no hay mascotas registradas'
                : `${totalCount} ${totalCount === 1 ? 'mascota registrada' : 'mascotas registradas'}`}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Link href='/workstation/user/mascotas/buscar'>
            <Button variant='outline' size='sm'>
              <Search className='mr-2 h-4 w-4' />
              Búsqueda avanzada
            </Button>
          </Link>
          <Link href='/workstation/user/mascotas/nuevo'>
            <Button size='sm'>
              <Plus className='mr-2 h-4 w-4' />
              Nueva Mascota
            </Button>
          </Link>
        </div>
      </div>

      {/* ===== Barra de búsqueda local ===== */}
      {!isLoading && totalCount > 0 && (
        <div className='relative max-w-md'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Buscar por nombre, especie o raza…'
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            className='pl-9'
          />
        </div>
      )}

      {/* ===== Contenido ===== */}
      {isLoading ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <PetCardSkeleton key={i} />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <Card>
          <CardContent className='pt-6'>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <PawPrint className='h-4 w-4' />
                </EmptyMedia>
                <EmptyTitle>Sin mascotas registradas</EmptyTitle>
                <EmptyDescription>
                  Comienza creando la primera mascota para un cliente.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href='/workstation/user/mascotas/nuevo'>
                  <Button>
                    <Plus className='mr-2 h-4 w-4' />
                    Crear primera mascota
                  </Button>
                </Link>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : visiblePets.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center gap-3 py-10 text-center'>
            <Search className='h-8 w-8 text-muted-foreground/50' />
            <div className='space-y-1'>
              <p className='text-sm font-medium text-foreground'>
                Sin resultados para «{query}»
              </p>
              <p className='text-xs text-muted-foreground'>
                Prueba con otro nombre, especie o raza.
              </p>
            </div>
            <Button variant='outline' size='sm' onClick={() => setQuery('')}>
              Limpiar búsqueda
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {visiblePets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>

          {/* Footer resumen */}
          <div className='flex flex-col items-start justify-between gap-2 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center'>
            <span>
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPets.length)} de {filteredPets.length}{' '}
              {filteredPets.length === 1 ? 'mascota' : 'mascotas'}
              {query ? ` para «${query}»` : ''}
            </span>
            <span className='inline-flex items-center gap-1'>
              <Stethoscope className='h-3 w-3' />
              ¿Necesitas atención? Agenda una cita desde el detalle.
            </span>
          </div>
          {totalPages > 1 && (
            <div className='flex items-center justify-center gap-2 pt-2'>
              <Button variant='outline' size='sm' onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label='Página anterior'>
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span className='min-w-20 text-center text-sm text-muted-foreground'>Página {currentPage} de {totalPages}</span>
              <Button variant='outline' size='sm' onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} aria-label='Página siguiente'>
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
