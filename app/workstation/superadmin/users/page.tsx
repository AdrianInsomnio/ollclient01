'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Pagination,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  Label,
  Input,
  Select,
  Switch,
  Textarea,
  Separator,
} from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import {
  getAdminUsers,
  createUser,
  updateUser,
  deleteUser,
  type UserListItem,
  type UserListResponse,
} from '@/lib/api/admin'

type UserFormData = {
  id?: number
  username: string
  email: string
  role: 'USER' | 'VET' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
}

export default function SuperAdminUsersPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    role: 'USER',
    isActive: true,
  })

  // Role labels and colors (copied from original)
  const ROLE_LABELS: Record<UserListItem['role'], string> = {
    USER: 'Asistente',
    VET: 'Veterinario',
    ADMIN: 'Administrador',
    SUPER_ADMIN: 'Super Administrador',
  }

  const ROLE_COLORS: Record<UserListItem['role'], string> = {
    USER: 'bg-gray-100 text-gray-700',
    VET: 'bg-emerald-100 text-emerald-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('es-UY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return 'Nunca'
    return new Date(iso).toLocaleString('es-UY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Fetch users with pagination
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      // Note: The current API doesn't support pagination yet
      // In a real implementation, we would add page and limit parameters
      const response = await getAdminUsers()
      if (response) {
        setUsers(response.users)
        setTotal(response.users.length) // TODO: Get actual total from API
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle page change
  const handlePageChange = (value: number) => {
    setPage(value)
    // In a real implementation, we would fetch data for the new page
  }

  // Handle limit change
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value))
    setPage(1) // Reset to first page
    // In a real implementation, we would fetch data with new limit
  }

  // Open create user dialog
  const handleCreateUser = () => {
    setEditingUserId(null)
    setFormData({
      username: '',
      email: '',
      role: 'USER',
      isActive: true,
    })
    setDialogOpen(true)
  }

  // Open edit user dialog
  const handleEditUser = (user: UserListItem) => {
    setEditingUserId(user.id)
    setFormData({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })
    setDialogOpen(true)
  }

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingUserId(null)
    setFormData({
      username: '',
      email: '',
      role: 'USER',
      isActive: true,
    })
  }

  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let response
      if (editingUserId) {
        // Update existing user
        await updateUser(editingUserId, {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
        })
        toast.success('Usuario actualizado correctamente')
      } else {
        // Create new user
        await createUser({
          username: formData.username,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
        })
        toast.success('Usuario creado correctamente')
      }
      
      // Refresh data
      await fetchUsers()
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving user:', error)
      toast.error('No se pudo guardar el usuario')
    } finally {
      setLoading(false)
    }
  }

  // Handle delete user
  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('�Est�s seguro de eliminar este usuario?')) return
    
    setLoading(true)
    try {
      await deleteUser(id)
      toast.success('Usuario eliminado correctamente')
      await fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('No se pudo eliminar el usuario')
    } finally {
      setLoading(false)
    }
  }

  // Load initial data
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Recalculate total when users change (in real app, this would come from API)
  useEffect(() => {
    setTotal(users.length)
  }, [users])

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold'>Usuarios Globales</h2>
        <div className='flex items-center space-x-3'>
          <Button 
            variant='outline' 
            size='sm'
            onClick={() => setLimit(l => Math.min(l + 10, 100))}
          >
            {limit} por p�gina
          </Button>
          <Button 
            variant='default' 
            onClick={handleCreateUser}
            className='ml-3'
          >
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {(['SUPER_ADMIN', 'ADMIN', 'VET', 'USER'] as const).map((role) => {
          const count = users.filter(u => u.role === role).length
          return (
            <div key={role} className='bg-white border rounded-lg p-4'>
              <p className='text-xs text-gray-500 uppercase'>{ROLE_LABELS[role]}</p>
              <p className='text-2xl font-bold mt-1'>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Users table */}
      <div className='bg-white rounded-lg shadow-sm border overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center'>
            <div className='flex justify-center items-center space-x-3'>
              <div className='h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500'></div>
              <span>Cargando usuarios...</span>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-lg font-semibold text-gray-800'>A�n no hay usuarios</p>
            <p className='text-sm text-gray-600 mt-1'>
              Los usuarios se crean desde el registro o el panel de administraci�n.
            </p>
          </div>
        ) : (
          <>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Usuario</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Email</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Rol</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Estado</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>�ltimo acceso</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Creado</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Acciones</th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='font-medium text-gray-900'>{user.username}</div>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{user.email}</td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ROLE_COLORS[user.role]}`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {user.isActive ? (
                        <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'>
                          Activo
                        </span>
                      ) : (
                        <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700'>
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{formatDateTime(user.lastLogin)}</td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{formatDate(user.createdAt)}</td>
                    <td className='px-6 py-4 text-sm font-medium space-x-2'>
                      <Button 
                        variant='outline' 
                        size='xs'
                        onClick={() => handleEditUser(user)}
                      >
                        Editar
                      </Button>
                      <Button 
                        variant='destructive' 
                        size='xs'
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination controls */}
            <div className='px-6 py-4 border-t flex justify-between items-center'>
              <div className='text-sm text-gray-500'>
                Mostrando {users.length} de {total} usuarios
              </div>
              <div className='flex items-center space-x-2'>
                <select 
                  value={limit} 
                  onChange={handleLimitChange} 
                  className='border rounded px-2 py-1'
                >
                  {[10, 25, 50, 100].map(size => (
                    <option key={size} value={size}>
                      {size} por p�gina
                    </option>
                  ))}
                </select>
                <Pagination 
                  page={page} 
                  totalPages={Math.max(1, Math.ceil(total / limit))} 
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* User form dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => setDialogOpen(open)}>
        <DialogTrigger asChild>
          <Button variant="outline" onClick={handleCreateUser}>
            {editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-112.5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
              Completa el formulario para crear o editar un usuario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Form>
              <FormField>
                <FormItem>
                  <FormLabel>Nombre de Usuario</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      name="username" 
                      value={formData.username} 
                      onChange={handleFormChange} 
                      required
                      placeholder="Ingrese el nombre de usuario"
                    />
                  </FormControl>
                </FormItem>
              </FormField>
              
              <FormField>
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleFormChange} 
                      required
                      placeholder="usuario@ejemplo.com"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <FormControl>
                    <Select 
                      name="role" 
                      value={formData.role} 
                      onChange={handleFormChange}
                    >
                      <option value="USER">Usuario Est�ndar</option>
                      <option value="VET">Veterinario</option>
                      <option value="ADMIN">Administrador</option>
                      <option value="SUPER_ADMIN">Super Administrador</option>
                    </Select>
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Switch 
                      name="isActive" 
                      checked={formData.isActive} 
                      onChange={handleFormChange}
                    />
                  </FormControl>
                </FormItem>
              </FormField>
            </Form>

            <Separator className="my-4" />

            <DialogFooter>
              <Button 
                variant="secondary" 
                onClick={handleCloseDialog}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-20"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
