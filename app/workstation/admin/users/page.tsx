'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { ApiError } from '@/lib/api-client'
import { getAdminUsers, updateUser, type UserListItem } from '@/lib/api/admin'

type ManageableRole = 'USER' | 'VET' | 'ADMIN'
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'
type UserFormData = { username: string; email: string; role: ManageableRole; isActive: boolean; password: string }

const ROLE_LABELS: Record<ManageableRole, string> = { USER: 'Asistente', VET: 'Veterinario', ADMIN: 'Administrador' }
const ROLE_BADGES: Record<ManageableRole, string> = { USER: 'bg-slate-100 text-slate-700', VET: 'bg-emerald-100 text-emerald-800', ADMIN: 'bg-blue-100 text-blue-800' }
const EMPTY_FORM: UserFormData = { username: '', email: '', role: 'USER', isActive: true, password: '' }
const isManageableRole = (role: UserListItem['role']): role is ManageableRole => role === 'USER' || role === 'VET' || role === 'ADMIN'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null)
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getAdminUsers()
      setUsers(response.users.filter((user) => isManageableRole(user.role)))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchUsers() }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesQuery = !term || user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
      const matchesStatus = status === 'ALL' || (status === 'ACTIVE' && user.isActive) || (status === 'INACTIVE' && !user.isActive)
      return matchesQuery && matchesStatus
    })
  }, [query, status, users])

  const openEditDialog = (user: UserListItem) => {
    if (!isManageableRole(user.role)) return
    setEditingUser(user)
    setFormData({ username: user.username, email: user.email, role: user.role, isActive: user.isActive, password: '' })
  }

  const closeEditDialog = () => {
    setEditingUser(null)
    setFormData(EMPTY_FORM)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUser) return
    setSaving(true)
    try {
      await updateUser(editingUser.id, {
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        isActive: formData.isActive,
        ...(formData.password ? { password: formData.password } : {}),
      })
      toast.success('Usuario actualizado correctamente')
      closeEditDialog()
      await fetchUsers()
    } catch (error) {
      toast.error(error instanceof ApiError ? `${error.code}: ${error.message}` : 'No se pudo actualizar el usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex h-full min-h-0 flex-col gap-5 overflow-hidden'>
      <div className='flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-sm font-medium text-slate-500'>Administración de clínica</p>
          <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>Usuarios</h1>
          <p className='mt-1 text-sm text-slate-600'>Consulta y edita los usuarios de tu clínica.</p>
        </div>
        <Badge variant='outline' className='w-fit'>Sin cuentas SUPER_ADMIN</Badge>
      </div>

      <div className='grid shrink-0 gap-3 sm:grid-cols-3'>
        {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => {
          const count = filter === 'ALL' ? users.length : users.filter((user) => filter === 'ACTIVE' ? user.isActive : !user.isActive).length
          return <Card key={filter} className='shadow-none'><CardContent className='p-4'><p className='text-xs font-medium uppercase tracking-wide text-slate-500'>{filter === 'ALL' ? 'Todos' : filter === 'ACTIVE' ? 'Activos' : 'Inactivos'}</p><p className='mt-1 text-2xl font-semibold text-slate-900'>{count}</p></CardContent></Card>
        })}
      </div>

      <Card className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <CardHeader className='shrink-0 gap-4 border-b sm:flex-row sm:items-end sm:justify-between'>
          <div><CardTitle>Usuarios de la clínica</CardTitle><CardDescription>Asistentes, veterinarios y administradores de tu clínica.</CardDescription></div>
          <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row'>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Buscar usuario o email' className='sm:w-64' />
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}><SelectTrigger className='sm:w-36'><SelectValue /></SelectTrigger><SelectContent><SelectItem value='ALL'>Todos</SelectItem><SelectItem value='ACTIVE'>Activos</SelectItem><SelectItem value='INACTIVE'>Inactivos</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className='min-h-0 flex-1 overflow-y-auto p-0'>
          {loading ? <div className='flex h-full min-h-40 items-center justify-center text-sm text-slate-500'>Cargando usuarios...</div> : filteredUsers.length === 0 ? <div className='flex h-full min-h-40 items-center justify-center p-6 text-center text-sm text-slate-500'>{users.length === 0 ? 'No hay usuarios asociados a esta clínica.' : 'No hay usuarios que coincidan con los filtros.'}</div> : <div className='min-w-170'><Table><TableHeader className='sticky top-0 z-10 bg-white'><TableRow><TableHead>Usuario</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead className='text-right'>Acciones</TableHead></TableRow></TableHeader><TableBody>{filteredUsers.map((user) => <TableRow key={user.id}><TableCell className='font-medium'>{user.username}</TableCell><TableCell className='text-slate-600'>{user.email}</TableCell><TableCell>{isManageableRole(user.role) && <Badge className={ROLE_BADGES[user.role]}>{ROLE_LABELS[user.role]}</Badge>}</TableCell><TableCell><Badge variant={user.isActive ? 'default' : 'secondary'}>{user.isActive ? 'Activo' : 'Inactivo'}</Badge></TableCell><TableCell className='text-right'><Button variant='outline' size='sm' onClick={() => openEditDialog(user)}>Editar</Button></TableCell></TableRow>)}</TableBody></Table></div>}
        </CardContent>
      </Card>

      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent><DialogHeader><DialogTitle>Editar usuario</DialogTitle><DialogDescription>Actualiza los datos del asistente o veterinario de tu clínica.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'><label htmlFor='username' className='text-sm font-medium'>Nombre de usuario</label><Input id='username' value={formData.username} onChange={(event) => setFormData((current) => ({ ...current, username: event.target.value }))} required /></div>
            <div className='space-y-2'><label htmlFor='email' className='text-sm font-medium'>Email</label><Input id='email' type='email' value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} required /></div>
            <div className='space-y-2'><label htmlFor='password' className='text-sm font-medium'>Nueva contraseña (opcional)</label><Input id='password' type='password' value={formData.password} onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} placeholder='Dejar vacío para mantenerla' /></div>
            <div className='space-y-2'><label className='text-sm font-medium'>Rol</label><Select value={formData.role} onValueChange={(value) => setFormData((current) => ({ ...current, role: value as ManageableRole }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='USER'>Asistente</SelectItem><SelectItem value='VET'>Veterinario</SelectItem><SelectItem value='ADMIN'>Administrador</SelectItem></SelectContent></Select></div>
            <label className='flex items-center gap-3 text-sm font-medium'><Switch checked={formData.isActive} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFormData((current) => ({ ...current, isActive: event.target.checked }))} /> Usuario activo</label>
            <DialogFooter><Button type='button' variant='outline' onClick={closeEditDialog} disabled={saving}>Cancelar</Button><Button type='submit' disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
