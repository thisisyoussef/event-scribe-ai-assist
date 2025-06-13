
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-umma-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:shadow-md transform hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-umma-500 text-white hover:bg-umma-600 shadow-lg hover:shadow-xl",
        destructive:
          "bg-gradient-to-r from-red-400 to-red-500 text-white hover:from-red-500 hover:to-red-600",
        outline:
          "border-2 border-umma-200 bg-white text-umma-700 hover:bg-umma-50 hover:border-umma-300 hover:text-umma-800",
        secondary:
          "bg-umma-50 text-umma-800 hover:bg-umma-100 border border-umma-200",
        ghost: "text-umma-700 hover:bg-umma-50 hover:text-umma-800",
        link: "text-umma-600 underline-offset-4 hover:underline hover:text-umma-700",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
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
