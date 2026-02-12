
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:shadow-md active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-gold-400 text-navy-900 hover:bg-gold-300 shadow-lg",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 shadow-lg",
        outline:
          "border-2 border-white/15 bg-white/5 text-foreground hover:bg-white/10 hover:border-white/25",
        secondary:
          "bg-white/10 text-foreground hover:bg-white/15 shadow-sm",
        ghost: "text-white/70 hover:bg-white/10 shadow-none",
        link: "text-gold-400 underline-offset-4 hover:underline hover:text-gold-300 shadow-none",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-12 px-8 py-4 text-base",
        icon: "h-10 w-10",
        cta: "w-full h-12 px-8 py-4 text-base font-bold shadow-lg hover:shadow-xl",
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
