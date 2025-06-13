
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border-2 border-umma-200 bg-white px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-umma-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-umma-400 focus-visible:ring-offset-2 focus-visible:border-umma-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 hover:border-umma-300 shadow-sm focus:shadow-md",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
