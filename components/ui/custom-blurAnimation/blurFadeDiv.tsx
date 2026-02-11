"use client"

import { motion, Variants } from "framer-motion"

interface BlurFadeProps {
  children: React.ReactNode
  delay?: number
  direction?: "up" | "down" | "left" | "right"
  className?: string
  onAnimationComplete?: () => void
}

export default function BlurFadeDiv({
  children,
  delay = 0,
  direction = "up",
  className,
  onAnimationComplete,
}: BlurFadeProps) {
  const variants: Variants = {
    hidden: {
      opacity: 0,
      filter: "blur(10px)",
      x: direction === "left" ? -20 : direction === "right" ? 20 : 0,
      y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      y: 0,
      transition: {
        delay,
        duration: 0.8,
        ease: "easeOut",
      },
    },
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      // once: false memastikan animasi terulang saat scroll balik
      viewport={{ once: false, amount: 0.4 }} 
      variants={variants}
      className={className}
      onAnimationComplete={onAnimationComplete}
    >
      {children}
    </motion.div>
  )
}