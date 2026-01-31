"use client"

import React, { MouseEvent, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string
  duration?: string
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      className,
      children,
      rippleColor = "rgba(11, 177, 233, 0.91)",
      duration = "600ms",
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<
      Array<{ x: number; y: number; size: number; key: number }>
    >([])

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      createRipple(event)
      onClick?.(event)
    }

    const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = event.clientX - rect.left - size / 2
      const y = event.clientY - rect.top - size / 2
      const newRipple = { x, y, size, key: Date.now() }
      setRipples((prev) => [...prev, newRipple])
    }

    useEffect(() => {
      if (ripples.length > 0) {
        const lastRipple = ripples[ripples.length - 1]
        const timeout = setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.key !== lastRipple.key))
        }, parseInt(duration))
        return () => clearTimeout(timeout)
      }
    }, [ripples, duration])

    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={cn(
          "relative cursor-pointer bg-neutral-100 dark:bg-neutral-900  flex items-center justify-center overflow-hidden rounded-md border-1 px-6 py-3 ",
          className
        )}
        {...props}
      >
        <div className="relative z-10">{children}</div>

        {/* Ripple */}
        {ripples.map((ripple) => (
          <span
            key={ripple.key}
            className="ripple-effect"
            style={{
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
              top: `${ripple.y}px`,
              left: `${ripple.x}px`,
              backgroundColor: rippleColor,
              animationDuration: duration,
            }}
          />
        ))}
      </button>
    )
  }
)

RippleButton.displayName = "RippleButton"
