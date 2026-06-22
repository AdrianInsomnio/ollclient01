import {
  LayoutDashboard,
  Shield,
  Settings,
  Users,
  Stethoscope,
  FileText,
  Package,
  Briefcase,
  Wallet,
  Calendar,
  ShoppingCart,
  LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  href?: string;
  label: string;
  icon: string;
  submenu?: MenuItem[];
}

export interface MenuGroup {
  label: string;
  icon: string;
  items: MenuItem[];
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Shield,
  Settings,
  Users,
  Stethoscope,
  FileText,
  Package,
  Briefcase,
  Wallet,
  Calendar,
  ShoppingCart,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || LayoutDashboard;
}

export const superAdminSidebar: MenuGroup[] = [
  {
    label: 'Plataforma',
    icon: 'LayoutDashboard',
    items: [
      {
        href: '/workstation/superadmin/dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
      },
      { href: '/workstation/superadmin/clinics', label: 'Clinicas', icon: 'Briefcase' },
      {
        href: '/workstation/superadmin/subscriptions',
        label: 'Suscripciones',
        icon: 'Wallet',
      },
      { href: '/workstation/superadmin/plans', label: 'Planes', icon: 'Package' },
    ],
  },
  {
    label: 'Sistema',
    icon: 'Shield',
    items: [
      { href: '/workstation/superadmin/users', label: 'Usuarios Globales', icon: 'Users' },
      { href: '/workstation/superadmin/settings', label: 'Configuracion', icon: 'Settings' },
    ],
  },
];

export const adminSidebar: MenuGroup[] = [
  {
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    items: [
      {
        href: '/workstation/admin/dashboard',
        label: 'Resumen General',
        icon: 'LayoutDashboard',
      },
      {
        href: '/workstation/admin/metrics',
        label: 'Metricas',
        icon: 'LayoutDashboard',
      },
    ],
  },
  {
    label: 'Operaciones',
    icon: 'Briefcase',
    items: [
      {
        href: '/workstation/admin/appointments',
        label: 'Agenda General',
        icon: 'Calendar',
      },
      {
        href: '/workstation/admin/consultations',
        label: 'Consultas',
        icon: 'Stethoscope',
      },
      {
        href: '/workstation/admin/sales',
        label: 'Ventas',
        icon: 'ShoppingCart',
      },
    ],
  },
  {
    label: 'Inventario',
    icon: 'Package',
    items: [
      {
        href: '/workstation/admin/products',
        label: 'Productos',
        icon: 'Package',
      },
      {
        href: '/workstation/admin/services',
        label: 'Servicios',
        icon: 'Briefcase',
      },
    ],
  },
  {
    label: 'Finanzas',
    icon: 'Wallet',
    items: [
      { href: '/workstation/admin/cash', label: 'Caja', icon: 'Wallet' },
      { href: '/workstation/admin/payments', label: 'Pagos', icon: 'Wallet' },
    ],
  },
  {
    label: 'Personal',
    icon: 'Users',
    items: [
      {
        href: '/workstation/admin/users',
        label: 'Usuarios',
        icon: 'Users',
      },
      {
        href: '/workstation/admin/roles',
        label: 'Roles y Permisos',
        icon: 'Shield',
      },
    ],
  },
  {
    label: 'Configuracion',
    icon: 'Settings',
    items: [
      {
        href: '/workstation/admin/settings',
        label: 'Ajustes',
        icon: 'Settings',
      },
    ],
  },
];

export const assistantSidebar: MenuGroup[] = [
  {
    label: 'Atencion',
    icon: 'Calendar',
    items: [
      { href: '/workstation/user/cola', label: 'Cola de Atencion', icon: 'Calendar' },
    ],
  },
  {
    label: 'Clientes',
    icon: 'Users',
    items: [
      { href: '/workstation/user/clientes', label: 'Clientes', icon: 'Users' },
      { href: '/workstation/user/mascotas', label: 'Mascotas', icon: 'Users' },
    ],
  },
  {
    label: 'Ventas',
    icon: 'ShoppingCart',
    items: [
      { href: '/workstation/pos', label: 'POS', icon: 'ShoppingCart' },
      { href: '/workstation/sales', label: 'Ventas', icon: 'ShoppingCart' },
    ],
  },
  {
    label: 'Caja',
    icon: 'Wallet',
    items: [
      { href: '/workstation/cash', label: 'Caja del Dia', icon: 'Wallet' },
    ],
  },
];

export const veterinarianSidebar: MenuGroup[] = [
  {
    label: 'Consultorio',
    icon: 'Stethoscope',
    items: [
      { href: '/workstation/vet/cola', label: 'Pacientes en Espera', icon: 'Calendar' },
      { href: '/workstation/vet/consultas', label: 'Consultas', icon: 'Stethoscope' },
    ],
  },
  {
    label: 'Historia Clinica',
    icon: 'FileText',
    items: [
      { href: '/workstation/vet/historial', label: 'Fichas Medicas', icon: 'FileText' },
      { href: '/workstation/vet/recetas', label: 'Recetas', icon: 'FileText' },
      { href: '/workstation/vet/estudios', label: 'Estudios', icon: 'FileText' },
      { href: '/workstation/vet/vacunas', label: 'Vacunas', icon: 'FileText' },
    ],
  },
];

export function getSidebarForRole(role: string): MenuGroup[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return superAdminSidebar;
    case 'ADMIN':
      return adminSidebar;
    case 'USER':
      return assistantSidebar;
    case 'VET':
      return veterinarianSidebar;
    default:
      return assistantSidebar;
  }
}

export const usersidebarByRole = {
  SUPER_ADMIN: superAdminSidebar,
  ASSISTANT: assistantSidebar,
  VETERINARIAN: veterinarianSidebar,
  ADMIN: adminSidebar,
};
