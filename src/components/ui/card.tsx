import * as React from "react"

import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Apply responsive padding (p-4 on mobile, p-6 on desktop) */
  responsive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, responsive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-cohere-md border border-cohere-card-border bg-card/60 text-card-foreground backdrop-blur-md transition-colors",
        // No `shadow-none` here: cards that opt into elevation via the
        // `.card-glow` component class must not have it overridden by the
        // `shadow-none` utility (utilities layer wins over components).
        responsive && "p-4 md:p-6",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Apply responsive padding */
  responsive?: boolean
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, responsive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5",
        responsive ? "p-4 md:p-6" : "p-6",
        className
      )}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Apply responsive padding */
  responsive?: boolean
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, responsive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        responsive ? "p-4 pt-0 md:p-6 md:pt-0" : "p-6 pt-0",
        className
      )}
      {...props}
    />
  )
)
CardContent.displayName = "CardContent"

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Apply responsive padding */
  responsive?: boolean
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, responsive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        responsive ? "p-4 pt-0 md:p-6 md:pt-0" : "p-6 pt-0",
        className
      )}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
