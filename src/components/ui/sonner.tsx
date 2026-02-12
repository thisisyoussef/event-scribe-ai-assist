
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={typeof window !== 'undefined' && window.innerWidth < 768 ? 'bottom-center' : 'top-right'}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-navy-800/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-gold-50 group-[.toaster]:border-gold-400/20 group-[.toaster]:shadow-xl group-[.toaster]:shadow-black/30",
          description: "group-[.toast]:text-white/60",
          actionButton:
            "group-[.toast]:bg-gold-400 group-[.toast]:text-navy-900",
          cancelButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-white/70",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
