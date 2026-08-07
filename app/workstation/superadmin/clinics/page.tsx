'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/auth-store'
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
import {
  createClinic,
  getClinicsByOrganization,
  updateClinic,
  deleteClinic,
} from '@/lib/api/admin'

// Types for clinic data
type Clinic = {
  id: number
  name: string
  rut: string | null
  website: string | null
  imageUrl: string | null
  imagePublicId: string | null
  imageVersion: string | null
  address: string | null
  phone: string | null
  email: string | null
  isDefault: boolean
  organizationId: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type PaginatedResponse = {
  clinics: Clinic[]
  total: number
}

// Helper function to format dates
const formatDate = (iso: string | null): string => {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const formatDateTime = (iso: string | null): string => {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SuperAdminClinicsPage() {
  const { user } = useAuthStore()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClinicId, setEditingClinicId] = useState<number | null>(null)
  const [formData, setFormData] = useState<Partial<Clinic>>({})

  // Fetch clinics with pagination
  const fetchClinics = async () => {
    setLoading(true)
    try {
      if (!user?.organizationId) return
      const items = await getClinicsByOrganization(user.organizationId)
      const start = (page - 1) * limit
      setClinics(items.slice(start, start + limit) as Clinic[])
      setTotal(items.length)
      return
      const response = await fetch('/api/clinics?page=' + page + '&limit=' + limit)
      if (!response.ok) throw new Error('Error al obtener cl�nicas')
      const data: PaginatedResponse = await response.json()
      setClinics(data.clinics)
      setTotal(data.total)
    } catch (error) {
      console.error(error)
      toast.error('No se pudieron cargar las cl�nicas')
    } finally {
      setLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (value: number) => {
    setPage(value)
  }

  // Handle limit change
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value))
    setPage(1) // Reset to first page when changing limit
  }

  // Open create clinic dialog
  const handleCreateClinic = () => {
    setEditingClinicId(null)
    setFormData({
      name: '',
      rut: '',
      website: '',
      imageUrl: '',
      imagePublicId: '',
      imageVersion: '',
      address: '',
      phone: '',
      email: '',
      isDefault: false,
      isActive: true,
      organizationId: 1, // Assuming default organization - in real app this would come from auth
    })
    setDialogOpen(true)
  }

  // Open edit clinic dialog
  const handleEditClinic = (clinic: Clinic) => {
    setEditingClinicId(clinic.id)
    setFormData({
      id: clinic.id,
      name: clinic.name,
      rut: clinic.rut ?? '',
      website: clinic.website ?? '',
      imageUrl: clinic.imageUrl ?? '',
      imagePublicId: clinic.imagePublicId ?? '',
      imageVersion: clinic.imageVersion ?? '',
      address: clinic.address ?? '',
      phone: clinic.phone ?? '',
      email: clinic.email ?? '',
      isDefault: clinic.isDefault,
      isActive: clinic.isActive,
      organizationId: clinic.organizationId,
    })
    setDialogOpen(true)
  }

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingClinicId(null)
    setFormData({})
  }

  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (editingClinicId) {
        // Update existing clinic
        await updateClinic(editingClinicId, {
          name: formData.name ?? '',
          rut: formData.rut,
          website: formData.website,
          imageUrl: formData.imageUrl,
          imagePublicId: formData.imagePublicId,
          imageVersion: formData.imageVersion,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          isDefault: formData.isDefault,
          isActive: formData.isActive,
          organizationId: formData.organizationId,
        })
        toast.success('Cl�nica actualizada correctamente')
      } else {
        // Create new clinic
        await createClinic({
          name: formData.name ?? '',
          rut: formData.rut,
          website: formData.website,
          imageUrl: formData.imageUrl,
          imagePublicId: formData.imagePublicId,
          imageVersion: formData.imageVersion,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          isDefault: formData.isDefault,
          isActive: formData.isActive,
          organizationId: Number(formData.organizationId),
        })
        toast.success('Cl�nica creada correctamente')
      }
      
      // Refresh data
      await fetchClinics()
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving clinic:', error)
      // Check if it's a validation error
      if (error instanceof Error && error.message.includes('Validation')) {
        toast.error('Error de validaci�n: ' + error.message)
      } else {
        toast.error('No se pudo guardar la cl�nica')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle clinic deletion
  const handleDeleteClinic = async (id: number) => {
    if (!window.confirm('�Est�s seguro de eliminar esta cl�nica?')) return
    
    setLoading(true)
    try {
      await deleteClinic(id)
      toast.success('Cl�nica eliminada correctamente')
      await fetchClinics()
    } catch (error) {
      console.error('Error deleting clinic:', error)
      // Check if it's a validation error or foreign key constraint
      if (error instanceof Error && 
          (error.message.includes('foreign key') || 
           error.message.includes('referenced') ||
           error.message.includes('restrict'))) {
        toast.error('No se puede eliminar la cl�nica porque tiene registros asociados (citas, pacientes, etc.)')
      } else {
        toast.error('No se pudo eliminar la cl�nica')
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on mount and when pagination changes
  useEffect(() => {
    fetchClinics()
  }, [page, limit, user?.organizationId])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gesti�n de Cl�nicas</h1>
        <Button 
          variant="default" 
          onClick={handleCreateClinic}
          className="ml-4"
        >
          Nueva Cl�nica
        </Button>
      </div>

      {/* Stats */}
      {clinics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-bold mt-1">{clinics.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Activas</p>
            <p className="text-2xl font-bold mt-1">{clinics.filter(c => c.isActive).length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Inactivas</p>
            <p className="text-2xl font-bold mt-1">{clinics.filter(c => !c.isActive).length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Por defecto</p>
            <p className="text-2xl font-bold mt-1">{clinics.filter(c => c.isDefault).length}</p>
          </div>
        </div>
      )}

      {/* Clinics table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="flex justify-center items-center space-x-3">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <span>Cargando cl�nicas...</span>
            </div>
          </div>
        ) : clinics.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-gray-800">A�n no hay cl�nicas</p>
            <p className="text-sm text-gray-600 mt-1">
              Las cl�nicas se crean desde el panel de administraci�n.
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RUT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sitio Web</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direcci�n</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tel�fono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Predeterminada</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creada</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clinics.map((clinic) => (
                  <tr key={clinic.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{clinic.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{clinic.rut || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{clinic.website || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{clinic.address || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{clinic.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{clinic.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {clinic.isDefault ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          S�
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {clinic.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          S�
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(clinic.createdAt)}</td>
                    <td className="px-6 py-4 text-sm font-medium space-x-2">
                      <Button 
                        variant='outline' 
                        size='xs'
                        onClick={() => handleEditClinic(clinic)}
                      >
                        Editar
                      </Button>
                      <Button 
                        variant='destructive' 
                        size='xs'
                        onClick={() => handleDeleteClinic(clinic.id)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination controls */}
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Mostrando {clinics.length} de {total} cl�nicas
              </div>
              <div className="flex items-center space-x-2">
                <select 
                  value={limit} 
                  onChange={handleLimitChange} 
                  className="border rounded px-2 py-1"
                >
                  {[10, 25, 50, 100].map(value => (
                    <option key={value} value={value}>
                      {value} por p�gina
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

      {/* Clinic form dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => setDialogOpen(open)}>
        <DialogTrigger asChild>
          <Button variant="outline" onClick={handleCreateClinic}>
            {editingClinicId ? 'Editar Cl�nica' : 'Nueva Cl�nica'}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-125 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClinicId ? 'Editar Cl�nica' : 'Nueva Cl�nica'}</DialogTitle>
            <DialogDescription>
              Completa el formulario para crear o editar una clinica
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Form>
              <FormField>
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      name="name" 
                      value={formData.name ?? ''} 
                      onChange={handleFormChange} 
                      required
                      placeholder="Nombre de la cl�nica"
                    />
                  </FormControl>
                </FormItem>
              </FormField>
              
              <FormField>
                <FormItem>
                  <FormLabel>RUT</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      name="rut" 
                      value={formData.rut ?? ''} 
                      onChange={handleFormChange}
                      placeholder="Rol �nico Tributario (opcional)"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Sitio Web</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      name="website" 
                      value={formData.website ?? ''} 
                      onChange={handleFormChange}
                      placeholder="https://ejemplo.com"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Direcci�n</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      name="address" 
                      value={formData.address ?? ''} 
                      onChange={handleFormChange}
                      placeholder="Direcci�n completa"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Tel�fono</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      name="phone" 
                      value={formData.phone ?? ''} 
                      onChange={handleFormChange}
                      placeholder="N�mero de tel�fono"
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
                      value={formData.email ?? ''} 
                      onChange={handleFormChange}
                      placeholder="contacto@clinica.com"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Predeterminada</FormLabel>
                  <FormControl>
                    <Switch 
                      name="isDefault" 
                      checked={formData.isDefault} 
                      onChange={handleFormChange}
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Activa</FormLabel>
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
