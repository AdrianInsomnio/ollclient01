import * as React from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex items-center justify-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        // Canónicos (alineados con Button/Card/Empty)
        default:
          "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/90",
        destructive:
          "bg-destructive/10 text-destructive [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-foreground",

        // Semánticos (no requieren variable CSS nueva)
        success:
          "bg-emerald-100 text-emerald-700 [a]:hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:[a]:hover:bg-emerald-900/40",
        warning:
          "bg-amber-100 text-amber-700 [a]:hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:[a]:hover:bg-amber-900/40",
        info:
          "bg-blue-100 text-blue-700 [a]:hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:[a]:hover:bg-blue-900/40",
        neutral:
          "bg-gray-100 text-gray-700 [a]:hover:bg-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:[a]:hover:bg-gray-800/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
