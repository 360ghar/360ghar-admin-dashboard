import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, useMotionValue, useTransform, PanInfo } from "motion/react"
import { cn } from "@/lib/utils"
import { Cross2Icon } from "@radix-ui/react-icons"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 border-cohere-card-border bg-popover/90 p-6 shadow-2xl backdrop-blur-xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Enable swipe-to-dismiss gesture. Defaults to true on mobile. */
  swipeToClose?: boolean
  /** Threshold in pixels to trigger close. Default: 100 */
  swipeThreshold?: number
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, swipeToClose = true, swipeThreshold = 100, ...props }, ref) => {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const internalRef = React.useRef<React.ElementRef<typeof SheetPrimitive.Content> | null>(null)

  const mergedRef = React.useCallback(
    (node: React.ElementRef<typeof SheetPrimitive.Content> | null) => {
      internalRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  // Calculate opacity based on drag distance
  const getOpacity = (value: number, threshold: number) => {
    const progress = Math.abs(value) / threshold
    return Math.max(0.3, 1 - progress * 0.7)
  }

  const opacity = useTransform(
    side === 'bottom' ? y : x,
    (value) => getOpacity(value, swipeThreshold)
  )

  // Get the close function from Radix context
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const shouldClose =
      (side === 'left' && info.offset.x < -swipeThreshold) ||
      (side === 'right' && info.offset.x > swipeThreshold) ||
      (side === 'bottom' && info.offset.y > swipeThreshold) ||
      (side === 'top' && info.offset.y < -swipeThreshold)

    if (shouldClose) {
      // Scope query to this sheet's own content to avoid closing the wrong sheet
      // when multiple sheets are open simultaneously (e.g. nested sheets)
      const closeButton = internalRef.current?.querySelector('[data-radix-dialog-close-swipe]')
      if (closeButton instanceof HTMLElement) {
        closeButton.click()
      }
    } else {
      // Reset position
      x.set(0)
      y.set(0)
    }
  }

  // Configure drag constraints based on side
  const getDragDirection = () => {
    if (side === 'left' || side === 'right') return 'x'
    return 'y'
  }

  const getDragConstraints = () => {
    switch (side) {
      case 'left':
        return { right: 0, left: -200 }
      case 'right':
        return { left: 0, right: 200 }
      case 'bottom':
        return { top: 0, bottom: 200 }
      case 'top':
        return { bottom: 0, top: -200 }
      default:
        return {}
    }
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={mergedRef}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {/* Hidden close button for swipe gesture */}
        <SheetPrimitive.Close
          data-radix-dialog-close-swipe
          className="sr-only"
          aria-hidden
        >
          Close
        </SheetPrimitive.Close>

        {swipeToClose ? (
          <motion.div
            className="h-full w-full"
            drag={getDragDirection()}
            dragConstraints={getDragConstraints()}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{
              x: side === 'left' || side === 'right' ? x : 0,
              y: side === 'top' || side === 'bottom' ? y : 0,
              opacity
            }}
          >
            {/* Swipe indicator for bottom sheets */}
            {side === 'bottom' && (
              <div className="flex justify-center pb-2 pt-1">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            {/* Visible close button */}
            <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary z-10">
              <Cross2Icon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>

            {children}
          </motion.div>
        ) : (
          <>
            <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
              <Cross2Icon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
            {children}
          </>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
