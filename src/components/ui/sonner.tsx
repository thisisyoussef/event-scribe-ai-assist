
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
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-umma-800 group-[.toaster]:border-umma-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-umma-600",
          actionButton:
            "group-[.toast]:bg-umma-500 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-umma-100 group-[.toast]:text-umma-700",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
