import { useCallback } from 'react'
import { toast as sonnerToast } from 'sonner'

type ToastVariant = 'default' | 'destructive'

export function useToast() {
  const showToast = useCallback(
    (title: string, description?: string, variant: ToastVariant = 'default') => {
      const message = description ? `${title}: ${description}` : title
      return variant === 'destructive' ? sonnerToast.error(message) : sonnerToast.success(message)
    },
    [],
  )

  return { toast: showToast, dismiss: sonnerToast.dismiss }
}
