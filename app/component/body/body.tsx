"use client"
import React from 'react'
import { cn } from '@/lib/utils'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { DotPattern } from '@/components/ui/dot-pattern'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import Navbar from '../navbar/navbar'
const Body = () => {
  return (
    <div className='flex flex-col items-center justify-center '>
      <div className='h-[90vh] flex items-center justify-center'>
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="text-[8px] md:text-xs font-semibold tracking-[0.35em] text-slate-800/60  font-[inter] uppercase dark:text-slate-200/60">
            Independent Research
          </span>
          {/* <h1 className="text-foreground font-[inter] text-4xl font-bold md:text-5xl">
            Risenta
          </h1> */}
          <AnimatedShinyText shimmerWidth={150} shimmerDuration={3.5}>
            <span className="pointer-events-none font-[inter] bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-center text-5xl md:text-6xl lg:text-8xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10">
              Risenta
            </span>
          </AnimatedShinyText>
          <p className="max-w-md text-xs md:text-sm text-slate-800/80 md:text-base dark:text-slate-200/80 font-[inter]">
            Drop this component into any container and it will fill the space with
            softly animated light rays shining from above.
          </p>
        </div>
      </div>

      <div className='fixed bottom-8 z-100 left-0 right-0 flex items-center justify-center'>
        <Navbar />
      </div>
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className={cn(
          "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
        )}
      />
    </div >
  )
}

export default Body
