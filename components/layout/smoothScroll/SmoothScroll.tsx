"use client"

import { ReactLenis } from 'lenis/react'
import { ReactNode } from 'react'

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis 
      root 
      options={{ 
        lerp: 0.1, 
        duration: 1.2,
        // INI KUNCINYA: 
        // smoothWheel untuk PC (Mouse), 
        // tapi kita biarkan Mobile pakai native scroll agar zoom tidak berantakan.
        smoothWheel: true,
        syncTouch: false, // Matikan sinkronisasi touch
        touchMultiplier: 0, // Jangan intervensi gerakan jari
      }}
    >
      {children}
    </ReactLenis>
  )
}