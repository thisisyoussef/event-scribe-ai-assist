
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-2xl border border-umma-200 bg-white px-4 py-3 text-base ring-offset-background placeholder:text-umma-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-umma-400 focus-visible:ring-offset-2 focus-visible:border-umma-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 hover:border-umma-500 shadow-sm focus:shadow-md",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
