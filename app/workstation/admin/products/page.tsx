import { InventoryPanel } from '@/components/inventory/inventory-panel'

// Compatibility route; catalog and product actions remain in the shared inventory panel.
export default function AdminProductsPage() {
  return <InventoryPanel />
}
