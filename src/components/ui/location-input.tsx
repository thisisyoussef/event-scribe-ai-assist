import * as React from "react"
import { Check, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Predefined locations
const predefinedLocations = [
  {
    value: "8200 Outer Dr W, Detroit, MI 48219",
    label: "WCCC",
    description: "Wayne County Community College"
  },
  {
    value: "31333 Southfield Rd, Beverly Hills, MI 48025",
    label: "UMMA Old Building",
    description: "Beverly Hills campus"
  },
  {
    value: "26899 Northwestern Hwy, Southfield, MI 48033",
    label: "UMMA New Building",
    description: "Southfield campus"
  }
]

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Type to search or enter custom location...",
  disabled = false,
  className
}: LocationInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const interactingRef = React.useRef(false)

  // Update input value when prop value changes
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  // Handle predefined location selection
  const handleLocationSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setInputValue(selectedValue)
    setOpen(false)
  }

  // Handle custom input submission
  const handleCustomSubmit = () => {
    if (inputValue.trim()) {
      onChange(inputValue.trim())
      setOpen(false)
    }
  }

  // Handle input change: show popover when typing
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    // Always open when user is typing
    if (!open) {
      setOpen(true)
    }
  }

  // Handle input focus
  const handleInputFocus = () => {
    setOpen(true)
  }

  // Handle click on the container
  const handleContainerClick = () => {
    setOpen(true)
    // Focus the input after a brief delay
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 10)
  }

  // Handle input blur - submit custom location if not selecting predefined
  const handleInputBlur = () => {
    // Delay to allow for clicking on predefined locations
    setTimeout(() => {
      if (interactingRef.current) {
        // If user is interacting with the popover content, don't close yet
        return
      }
      if (inputValue.trim() && !predefinedLocations.some(loc => loc.value === inputValue)) {
        handleCustomSubmit()
      }
      setOpen(false)
    }, 200)
  }

  // Filter predefined locations based on input
  const filteredLocations = predefinedLocations.filter(location => {
    const q = inputValue.trim().toLowerCase()
    if (q.length === 0) return true // show all when empty
    // 1+ characters: filter by includes
    return (
      location.label.toLowerCase().includes(q) ||
      location.value.toLowerCase().includes(q) ||
      location.description.toLowerCase().includes(q)
    )
  })

  // Check if current value is a predefined location
  const isPredefined = predefinedLocations.some(loc => loc.value === value)

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className="relative cursor-text"
            onClick={handleContainerClick}
          >
            <div className="flex items-center space-x-2 min-w-0 w-full border border-white/15 rounded-2xl bg-white/5 px-5 py-3 focus-within:ring-2 focus-within:ring-gold-400/20 focus-within:border-gold-400 transition-all hover:border-white/25 shadow-lg">
              <MapPin className="h-4 w-4 text-white/40 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm font-semibold text-gold-50 placeholder:text-white/30 cursor-text"
              />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          align="start"
          side="bottom"
          sideOffset={4}
          // Prevent auto-focus to avoid conflicts
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          // Track pointer interactions to avoid premature close on blur
          onPointerDown={() => { interactingRef.current = true }}
          onPointerUp={() => { setTimeout(() => { interactingRef.current = false }, 0) }}
        >
          <Command>
            <CommandList>
              {filteredLocations.length > 0 && (
                <CommandGroup heading="Predefined Locations">
                  {filteredLocations.map((location) => (
                    <CommandItem
                      key={location.value}
                      value={location.value}
                      onSelect={() => handleLocationSelect(location.value)}
                      // Prevent input blur before selection registers
                      onMouseDown={(e) => e.preventDefault()}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === location.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{location.label}</span>
                        <span className="text-sm text-white/50">{location.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="text-xs text-white/40 flex items-center space-x-1">
          <MapPin className="h-3 w-3" />
          <span>
            {isPredefined ? "Predefined location" : "Custom location"}
          </span>
        </div>
      )}
    </div>
  )
}
