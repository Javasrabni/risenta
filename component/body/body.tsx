
import React from 'react'
import { cn } from '@/lib/utils'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { DotPattern } from '@/components/ui/dot-pattern'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
// import { LightRays } from '@/components/ui/light-rays'

import Navbar from '../navbar/navbar'
import Team from '../team/team'
import { Highlighter } from '@/components/ui/highlighter'
import RippleBtn from '../Button/rippleBtn/rippleBtn'
import NewInfoLanding from '../announcement/newInfo'
import { AuroraText } from '@/components/ui/aurora-text'
// import Login from '../auth/login'

const Body = () => {
  return (
    <div className='flex flex-col items-center justify-center '>

      {/* LANDING PAGE */}
      <div className='relative h-[100vh] flex items-center justify-center'>
        <div className='absolute z-20 top-12 w-full flex items-center justify-center px-6'>
          <NewInfoLanding />
        </div>
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="text-[10px] md:text-xs font-semibold tracking-[0.35em] text-slate-800/60  font-[inter] uppercase dark:text-slate-200/60">
            Independent <AuroraText>Research</AuroraText>
          </span>
          {/* <h1 className="text-foreground font-[inter] text-4xl font-bold md:text-5xl">
            Risenta
          </h1> */}
          <AnimatedShinyText shimmerWidth={150} shimmerDuration={3.5}>
            <span className="pointer-events-none font-[inter] bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-center text-6xl lg:text-8xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10 tracking-[-2px]">
              Risenta
            </span>
          </AnimatedShinyText>
          <p className="max-w-md text-sm text-slate-800/80 md:text-base dark:text-slate-200/80 font-[inter] text-center">
            Mentransformasi riset mandiri menjadi narasi pengetahuan publik sekaligus menghadirkan ruang diskusi bagi{' '}<Highlighter action="underline" color='#1447E6' >intelektual</Highlighter>{" "}pemuda Indonesia.
          </p>

          <div className='pt-4'>
            <RippleBtn href='/publikasi/riset-1' text="✨ Eksplor Publikasi Kami" />
          </div>
        </div>
        {/* <LightRays /> */}
      </div>

      {/* TEAM SECTION */}
      <div className='w-full max-w-[72rem] flex h-fit items-center justify-center pb-12'>
        <Team />
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
