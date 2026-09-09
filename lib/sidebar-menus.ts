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
} from "lucide-react";

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

export interface FlattenedMenuItem {
  label: string;
  href?: string;
  icon: string;
  groupLabel: string;
  groupIcon: string;
  parentLabel?: string;
  depth: number;
  submenu?: MenuItem[];
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
    label: "Plataforma",
    icon: "Shield",
    items: [
      {
        href: "/workstation/superadmin/dashboard",
        label: "Dashboard",
        icon: "LayoutDashboard",
      },
      {
        href: "/workstation/superadmin/clinics",
        label: "Clínicas",
        icon: "Briefcase",
      },
      {
        href: "/workstation/superadmin/subscriptions",
        label: "Suscripciones",
        icon: "Wallet",
      },
      {
        href: "/workstation/superadmin/plans",
        label: "Planes",
        icon: "Package",
      },
      {
        label: "Configuración",
        href: "/workstation/superadmin/settings",
        icon: "Settings",
      },
    ],
  },
  {
    label: "Sistema",
    icon: "Shield",
    items: [
      {
        href: "/workstation/superadmin/users",
        label: "Usuarios Globales",
        icon: "Users",
      },
      {
        href: "/workstation/superadmin/settings",
        label: "Configuración",
        icon: "Settings",
      },
    ],
  },
];

export const adminSidebar: MenuGroup[] = [
  {
    label: "Dashboard",
    icon: "LayoutDashboard",
    items: [
      {
        href: "/workstation/admin/dashboard",
        label: "Resumen General",
        icon: "LayoutDashboard",
      },
      {
        href: "/workstation/admin/metrics",
        label: "Métricas",
        icon: "LayoutDashboard",
      },
    ],
  },
  {
    label: "Operaciones",
    icon: "Briefcase",
    items: [
      {
        href: "/workstation/admin/appointments",
        label: "Agenda General",
        icon: "Calendar",
      },
      {
        href: "/workstation/admin/consultations",
        label: "Consultas",
        icon: "Stethoscope",
      },
      {
        href: "/workstation/admin/sales",
        label: "Ventas",
        icon: "ShoppingCart",
      },
    ],
  },
  {
    label: "Inventario",
    icon: "Package",
    items: [
      {
        href: "/workstation/admin/inventory",
        label: "Productos",
        icon: "Package",
      },
      {
        href: "/workstation/admin/services",
        label: "Servicios",
        icon: "Briefcase",
      },
    ],
  },
  {
    label: "Finanzas",
    icon: "Wallet",
    items: [
      {
        href: "/workstation/admin/cash/shifts",
        label: "Gestion Turnos",
        icon: "Wallet",
      },
      {
        href: "/workstation/admin/cash/registers",
        label: "Gestion Cajas",
        icon: "Wallet",
      },
      {
        href: "/workstation/admin/cash/payments",
        label: "Pagos",
        icon: "Wallet",
      },
    ],
  },
  {
    label: "Personal",
    icon: "Users",
    items: [
      {
        href: "/workstation/admin/users",
        label: "Usuarios",
        icon: "Users",
      },
      {
        href: "/workstation/admin/roles",
        label: "Roles y Permisos",
        icon: "Shield",
      },
    ],
  },
  {
    label: "Configuración",
    icon: "Settings",
    items: [
      {
        href: "/workstation/admin/settings",
        label: "Ajustes",
        icon: "Settings",
      },
    ],
  },
];

export const assistantSidebar: MenuGroup[] = [
  {
    label: "Atención",
    icon: "Calendar",
    items: [
      {
        href: "/workstation/user/cola",
        label: "Cola de Atención",
        icon: "Calendar",
      },
            {
        href: "/workstation/user/consultorios",
        label: "Consultorios",
        icon: "building",
      },
    ],
  },
  {
    label: "Clientes",
    icon: "Users",
    items: [
      { href: "/workstation/user/clientes", label: "Clientes", icon: "Users" },
      { href: "/workstation/user/mascotas", label: "Mascotas", icon: "Users" },
      { href: "/workstation/user/citas", label: "Agendas", icon: "Users" },
      {
        href: "/workstation/user/inventario",
        label: "Inventario",
        icon: "Users",
      },
    ],
  },
  {
    label: "Ventas",
    icon: "ShoppingCart",
    items: [
      { href: "/workstation/user/pos", label: "POS", icon: "ShoppingCart" },
      {
        href: "/workstation/user/sales",
        label: "Ventas",
        icon: "ShoppingCart",
      },
    ],
  },
  {
    label: "Caja",
    icon: "Wallet",
    items: [
      { href: "/workstation/user/cash", label: "Caja del Día", icon: "Wallet" },
    ],
  },
];

export const veterinarianSidebar: MenuGroup[] = [
  {
    label: "Consultorio",
    icon: "Stethoscope",
    items: [
      {
        href: "/workstation/vet/cola",
        label: "Pacientes en Espera",
        icon: "Calendar",
      },
      {
        href: "/workstation/vet/consultas",
        label: "Consultas",
        icon: "Stethoscope",
      },
    ],
  },
  {
    label: "Historia Clínica",
    icon: "FileText",
    items: [
      {
        href: "/workstation/vet/historial",
        label: "Fichas Médicas",
        icon: "FileText",
      },
      { href: "/workstation/vet/recetas", label: "Recetas", icon: "FileText" },
      {
        href: "/workstation/vet/estudios",
        label: "Estudios",
        icon: "FileText",
      },
      { href: "/workstation/vet/vacunas", label: "Vacunas", icon: "FileText" },
    ],
  },
];

/**
 * Returns the sidebar menu groups for a given role.
 * Official roles: SUPER_ADMIN, ADMIN, ASSISTANT, VETERINARIAN
 */
export function getSidebarForRole(role: string): MenuGroup[] {
  switch (role) {
    case "SUPER_ADMIN":
      return superAdminSidebar;
    case "ADMIN":
      return adminSidebar;
    case "ASSISTANT":
      return assistantSidebar;
    case "VETERINARIAN":
      return veterinarianSidebar;
    default:
      // Default to ASSISTANT for backward compatibility with 'USER'
      if (role === "USER") {
        return assistantSidebar;
      }
      if (role === "VET") {
        return veterinarianSidebar;
      }
      return assistantSidebar;
  }
}

export const usersidebarByRole = {
  SUPER_ADMIN: superAdminSidebar,
  ADMIN: adminSidebar,
  ASSISTANT: assistantSidebar,
  VETERINARIAN: veterinarianSidebar,
};

/**
 * Flattens MenuGroup[] into a searchable array of FlattenedMenuItem[]
 * Preserves hierarchy information for context-aware search
 */
export function flattenMenuItems(groups: MenuGroup[]): FlattenedMenuItem[] {
  const flattened: FlattenedMenuItem[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      flattened.push({
        label: item.label,
        href: item.href,
        icon: item.icon,
        groupLabel: group.label,
        groupIcon: group.icon,
        depth: 0,
        submenu: item.submenu,
      });

      // Handle submenu items
      if (item.submenu && item.submenu.length > 0) {
        for (const subItem of item.submenu) {
          flattened.push({
            label: subItem.label,
            href: subItem.href,
            icon: subItem.icon,
            groupLabel: group.label,
            groupIcon: group.icon,
            parentLabel: item.label,
            depth: 1,
            submenu: subItem.submenu,
          });
        }
      }
    }
  }

  return flattened;
}

/**
 * Normalizes a string for search comparison:
 * - Lowercase
 * - Remove accents/diacritics
 * - Trim whitespace
 */
function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .trim();
}

/**
 * Searches menu items based on query string
 * Searches in: item label, parent label (submenu parent), group label
 * Case insensitive, partial match, accent tolerant
 */
export function searchMenuItems(
  items: FlattenedMenuItem[],
  query: string,
): FlattenedMenuItem[] {
  if (!query || query.trim() === "") {
    return items;
  }

  const normalizedQuery = normalizeForSearch(query);

  return items.filter((item) => {
    // Search in item label
    const itemLabelNormalized = normalizeForSearch(item.label);
    if (itemLabelNormalized.includes(normalizedQuery)) {
      return true;
    }

    // Search in parent label (for submenu items)
    if (item.parentLabel) {
      const parentLabelNormalized = normalizeForSearch(item.parentLabel);
      if (parentLabelNormalized.includes(normalizedQuery)) {
        return true;
      }
    }

    // Search in group label (for context)
    const groupLabelNormalized = normalizeForSearch(item.groupLabel);
    if (groupLabelNormalized.includes(normalizedQuery)) {
      return true;
    }

    return false;
  });
}
