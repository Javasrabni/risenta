import { ComponentPropsWithoutRef, CSSProperties, FC } from "react"
import { cn } from "@/utils/utils"

export interface AnimatedShinyTextProps
  extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number
  shimmerDuration?: number
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  shimmerDuration = 2,
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
          animationDuration: `${shimmerDuration}s`,
        } as CSSProperties
      }
      className={cn(
        "animate-shiny-text bg-clip-text text-transparent bg-no-repeat",
        "[background-size:var(--shiny-width)_100%]",
        "bg-gradient-to-r from-transparent via-black/80 via-50% to-transparent dark:via-white/80",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
