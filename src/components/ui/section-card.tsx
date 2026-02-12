import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Plus } from "lucide-react"

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string
    description?: string
    collapsible?: boolean
    defaultExpanded?: boolean
    icon?: React.ReactNode
}

const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
    ({ className, title, description, icon, collapsible = false, defaultExpanded = true, children, ...props }, ref) => {
        const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-3xl bg-white/5/50 border border-white/10/50 shadow-sm",
                    "p-3 md:p-6 transition-all duration-200",
                    collapsible && !isExpanded && "py-3 md:py-4 hover:bg-white/5/80",
                    className
                )}
                {...props}
            >
                {/* Section Header */}
                {(title || description) && (
                    <div
                        className={cn(
                            "flex items-center gap-3",
                            collapsible && "cursor-pointer select-none active:opacity-70",
                            isExpanded && "mb-4"
                        )}
                        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
                    >
                        {icon && (
                            <div className="text-gold-400">
                                {icon}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            {title && (
                                <h3 className="text-sm md:text-xs font-semibold uppercase tracking-wider text-white/40">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="text-sm text-white/40 mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                        {collapsible && (
                            <div className="flex items-center gap-1">
                                {!isExpanded && (
                                    <span className="text-xs text-white/50 font-medium mr-1 hidden md:inline">
                                        Expand
                                    </span>
                                )}
                                <div
                                    className={cn(
                                        "w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all",
                                        isExpanded
                                            ? "bg-white/15/50 text-white/40"
                                            : "bg-white/10 text-white/50"
                                    )}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="w-5 h-5 md:w-4 md:h-4 rotate-180 transition-transform" />
                                    ) : (
                                        <Plus className="w-5 h-5 md:w-4 md:h-4" />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Section Content */}
                <div className={cn(
                    "transition-all duration-200 overflow-hidden",
                    collapsible && !isExpanded ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
                )}>
                    {children}
                </div>
            </div>
        )
    }
)
SectionCard.displayName = "SectionCard"

export { SectionCard }
