import * as React from "react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Check } from "lucide-react"

interface Step {
    number: number
    title: string
    description?: string
}

interface StepProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
    steps: Step[]
    currentStep: number
    onStepClick?: (step: number) => void
    showProgressBar?: boolean
    showStepLabel?: boolean
}

const StepProgressBar = React.forwardRef<HTMLDivElement, StepProgressBarProps>(
    ({ className, steps, currentStep, onStepClick, showProgressBar = true, showStepLabel = true, ...props }, ref) => {
        const progress = ((currentStep - 1) / (steps.length - 1)) * 100
        const currentStepData = steps.find(s => s.number === currentStep)

        return (
            <div
                ref={ref}
                className={cn("space-y-2 md:space-y-3", className)}
                {...props}
            >
                {/* Progress Bar - Only on desktop */}
                {showProgressBar && (
                    <div className="relative hidden md:block">
                        <Progress value={progress} className="h-1.5 bg-stone-200" />
                    </div>
                )}

                {/* Step Indicators */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-2 flex-1 justify-center md:justify-start">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.number}>
                                <button
                                    type="button"
                                    onClick={() => onStepClick?.(step.number)}
                                    disabled={!onStepClick}
                                    className={cn(
                                        "w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center",
                                        "text-sm md:text-sm font-bold md:font-semibold transition-all duration-200",
                                        "focus:outline-none focus:ring-2 focus:ring-umma-400 focus:ring-offset-2",
                                        "touch-manipulation",
                                        currentStep === step.number
                                            ? "bg-umma-600 text-white shadow-lg ring-4 ring-umma-100"
                                            : currentStep > step.number
                                            ? "bg-umma-500 text-white shadow-md"
                                            : "bg-stone-200 text-stone-500",
                                        onStepClick && "cursor-pointer active:scale-95"
                                    )}
                                    title={step.title}
                                >
                                    {currentStep > step.number ? (
                                        <Check className="w-5 h-5 md:w-4 md:h-4" strokeWidth={3} />
                                    ) : (
                                        step.number
                                    )}
                                </button>
                                {index < steps.length - 1 && (
                                    <div
                                        className={cn(
                                            "flex-1 max-w-[40px] md:max-w-[48px] lg:max-w-[60px] h-1 md:h-0.5 rounded-full transition-colors duration-200",
                                            currentStep > step.number ? "bg-umma-500" : "bg-stone-200"
                                        )}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step Label - Desktop */}
                    {showStepLabel && currentStepData && (
                        <div className="text-right hidden md:block ml-4">
                            <span className="text-sm font-medium text-stone-700">
                                Step {currentStep} of {steps.length}
                            </span>
                            <span className="text-sm text-stone-500 ml-1.5">
                                — {currentStepData.title}
                            </span>
                        </div>
                    )}
                </div>

                {/* Mobile Step Label - Centered below */}
                {showStepLabel && currentStepData && (
                    <div className="md:hidden text-center pt-1">
                        <span className="text-xs font-semibold text-umma-600 uppercase tracking-wide">
                            Step {currentStep}
                        </span>
                        <span className="text-xs text-stone-400 mx-1.5">•</span>
                        <span className="text-xs font-medium text-stone-600">
                            {currentStepData.title}
                        </span>
                    </div>
                )}
            </div>
        )
    }
)
StepProgressBar.displayName = "StepProgressBar"

export { StepProgressBar }
