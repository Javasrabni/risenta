import { cn } from "@/utils/utils"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import BlurFadeDiv from "../animation/blurFadeComp"
import { AuroraText } from "@/components/ui/aurora-text"
import OrbitingCircle from "./orbitingCircle"

export default function WhatWeDo() {
    return (
        <div className="relative flex flex-col md:flex-row min-h-screen md:h-full w-full items-center md:items-center justify-between md:justify-between overflow-hidden p-10 sm:gap-16">
            
            {/* Container Orbit: Di mobile dibuat absolute agar teks bisa overlap di atasnya */}
            <div className="absolute md:relative w-full h-[550px] md:h-full z-0 md:z-10 opacity-70 md:opacity-100 top-0 md:top-auto">
                <OrbitingCircle />
            </div>

            <div className="flex h-full flex-col justify-center gap-4 z-20 text-center md:text-left shrink-0 mt-[320px] md:mt-0">
                <BlurFadeDiv delay={0.1}>
                    <span className="text-[10px] md:text-xs font-semibold tracking-[0.35em] text-slate-800/60 font-[inter] uppercase dark:text-slate-200/60">
                        Risenta's <AuroraText>Mission</AuroraText>
                    </span>
                </BlurFadeDiv>
                <BlurFadeDiv delay={0.3}>
                    <h1 className="pointer-events-none font-[inter] bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-3xl lg:text-5xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10 tracking-[-1px] pb-4">
                        Defining Our<br />Impact
                    </h1>
                </BlurFadeDiv>
                <BlurFadeDiv delay={0.5}>
                    <p className="text-slate-800/80 dark:text-slate-200/80 max-w-md text-sm md:text-base font-[inter]">
                        Membangun ekosistem diseminasi ilmu pengetahuan berbasis integritas data dan kreativitas digital. Kami berkomitmen mengakselerasi dampak intelektual pemuda yang dapat dipertanggungjawabkan.
                    </p>
                </BlurFadeDiv>
            </div>

            <div className="bg-background absolute top-0 left-0 flex h-full w-full items-center justify-center overflow-hidden rounded-lg p-20 pointer-events-none -z-10">
                <AnimatedGridPattern
                    numSquares={80}
                    maxOpacity={0.1}
                    duration={1}
                    repeatDelay={1}
                    className={cn(
                        "mask-[radial-gradient(400px_circle_at_left,white,transparent)] sm:mask-[radial-gradient(400px_circle_at_62%_center,white,transparent)]",
                        "inset-x-0 inset-y-[-25%] sm:inset-x-0 inset-y-[-50%] h-[200%] skew-y-12", "will-change-transform"
                    )}
                />
            </div>
        </div>
    )
}