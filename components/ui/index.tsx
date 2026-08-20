export { Button } from './button'
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from './card'
export { Input } from './input'
export { Label } from './label'
export { Separator } from './separator'
export { Textarea } from './textarea'
export { Badge, badgeVariants } from './badge'
import { Pagination as PaginationPrimitive } from './pagination'
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
export { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from './table'

export const Form = (props: any) => <div {...props} />
export const FormField = (props: any) => <div {...props} />
export const FormItem = (props: any) => <div className="space-y-2" {...props} />
export const FormControl = (props: any) => <div {...props} />
export const FormLabel = (props: any) => <label className="text-sm font-medium" {...props} />
export const Select = (props: any) => <select {...props} />
export const Switch = ({ checked = false, ...props }: any) => (
  <input type="checkbox" checked={Boolean(checked)} {...props} />
)
export const Pagination = ({ page, totalPages, onPageChange, ...props }: any) => (
  <PaginationPrimitive {...props}>
    <div className="flex items-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
      <span>{page} / {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
    </div>
  </PaginationPrimitive>
)
