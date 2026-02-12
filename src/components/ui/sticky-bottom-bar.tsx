import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface StickyBottomBarProps extends React.HTMLAttributes<HTMLDivElement> {
    statusText?: string
    primaryAction?: {
        label: string
        onClick: () => void
        disabled?: boolean
        loading?: boolean
    }
    secondaryAction?: {
        label: string
        onClick: () => void
    }
}

const StickyBottomBar = React.forwardRef<HTMLDivElement, StickyBottomBarProps>(
    ({ className, statusText, primaryAction, secondaryAction, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-50",
                    "bg-navy-900/95 md:bg-navy-900/80 backdrop-blur-xl border-t border-white/10",
                    "px-4 py-4 md:py-3",
                    "shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-[0_-4px_20px_rgba(0,0,0,0.08)]",
                    "animate-in slide-in-from-bottom-2 duration-300",
                    className
                )}
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                {...props}
            >
                <div className="max-w-4xl mx-auto">
                    {/* Mobile: Stacked layout with prominent CTA */}
                    <div className="flex md:hidden flex-col gap-3">
                        {/* Primary Action - Full width on mobile */}
                        {primaryAction && (
                            <Button
                                onClick={primaryAction.onClick}
                                disabled={primaryAction.disabled || primaryAction.loading}
                                className="w-full h-12 font-bold text-lg bg-gold-400 hover:bg-gold-300 text-navy-900 shadow-sm hover:shadow-md transition-all active:scale-[0.98] touch-manipulation rounded-3xl"
                            >
                                {primaryAction.loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </div>
                                ) : (
                                    primaryAction.label
                                )}
                            </Button>
                        )}

                        {/* Secondary row: Back button + Status + Extras */}
                        <div className="flex items-center justify-between">
                            {secondaryAction && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={secondaryAction.onClick}
                                    className="text-white/50 h-10 px-3 text-sm touch-manipulation font-medium"
                                >
                                    {secondaryAction.label}
                                </Button>
                            )}

                            <div className="flex items-center gap-2 flex-1 justify-center">
                                {statusText && (
                                    <span className="text-xs text-white/40 font-medium truncate">
                                        {statusText}
                                    </span>
                                )}
                            </div>

                            {children}
                        </div>
                    </div>

                    {/* Desktop: Horizontal layout */}
                    <div className="hidden md:flex items-center justify-between gap-4">
                        {/* Left side - Status */}
                        <div className="flex items-center gap-2 min-w-0">
                            {statusText && (
                                <span className="text-sm text-white/50 font-medium truncate">
                                    {statusText}
                                </span>
                            )}
                            {children}
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                            {secondaryAction && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={secondaryAction.onClick}
                                    className="text-white/50 h-9 px-3 text-sm touch-manipulation"
                                >
                                    {secondaryAction.label}
                                </Button>
                            )}
                            {primaryAction && (
                                <Button
                                    onClick={primaryAction.onClick}
                                    disabled={primaryAction.disabled || primaryAction.loading}
                                    className="min-w-[120px] h-11 px-6 font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.97] touch-manipulation"
                                >
                                    {primaryAction.loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        primaryAction.label
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
)
StickyBottomBar.displayName = "StickyBottomBar"

export { StickyBottomBar }
