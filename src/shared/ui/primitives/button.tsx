import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/ui/utils"

/** Buttons: `default` = primary action, `outline` = secondary, `ghost` = tertiary. Targets grow on touch devices. */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-standard outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive pointer-coarse:min-h-10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border-border bg-surface text-foreground hover:bg-accent aria-expanded:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent aria-expanded:bg-accent aria-pressed:bg-accent",
        destructive: "bg-danger text-background hover:bg-danger/90",
        "destructive-outline": "border-danger/60 bg-transparent text-danger hover:bg-danger-soft",
        success: "bg-success text-background hover:bg-success/90",
        link: "text-info underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-base",
        icon: "size-9 pointer-coarse:size-10",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 pointer-coarse:size-10",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
