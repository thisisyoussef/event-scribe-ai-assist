import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NumberStepperProps {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    className?: string
    disabled?: boolean
    width?: string
}

export function NumberStepper({
    value,
    onChange,
    min = 0,
    max,
    step = 1,
    className,
    disabled = false,
    width = "auto"
}: NumberStepperProps) {
    const handleDecrement = () => {
        if (disabled) return
        if (min !== undefined && value <= min) return
        onChange(value - step)
    }

    const handleIncrement = () => {
        if (disabled) return
        if (max !== undefined && value >= max) return
        onChange(value + step)
    }

    return (
        <div className={cn("flex items-center gap-3", className)} style={{ width }}>
            <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 md:h-9 md:w-9 rounded-full shrink-0 border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 touch-manipulation"
                onClick={handleDecrement}
                disabled={disabled || (min !== undefined && value <= min)}
                type="button"
            >
                <Minus className="h-4 w-4" />
                <span className="sr-only">Decrease</span>
            </Button>

            <div className="flex-1 text-center font-semibold text-lg md:text-base min-w-[2ch]">
                {value}
            </div>

            <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 md:h-9 md:w-9 rounded-full shrink-0 border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 touch-manipulation"
                onClick={handleIncrement}
                disabled={disabled || (max !== undefined && value >= max)}
                type="button"
            >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Increase</span>
            </Button>
        </div>
    )
}
