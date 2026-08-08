import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-cohere-pill bg-primary text-primary-foreground shadow-[0_2px_16px_-4px_hsl(var(--primary)/0.4)] hover:bg-primary/90 hover:shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.55)]",
        destructive:
          "rounded-cohere-pill bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "rounded-cohere-md border border-border/70 bg-card/40 shadow-sm backdrop-blur-sm hover:bg-accent/70 hover:text-accent-foreground",
        secondary:
          "rounded-cohere-md bg-secondary/70 text-secondary-foreground shadow-sm hover:bg-secondary/90",
        ghost: "rounded-cohere-md hover:bg-accent/60 hover:text-accent-foreground",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-cohere-pill px-8",
        icon: "h-9 w-9 rounded-cohere-md",
        // Touch-friendly sizes (44px minimum for mobile)
        touch: "h-11 min-w-[44px] rounded-cohere-pill px-4 py-2",
        "touch-icon": "h-11 w-11 rounded-cohere-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
