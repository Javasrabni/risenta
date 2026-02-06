import { cn } from "@/lib/utils"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import BlurFadeDiv from "../animation/blurFadeComp"
import { AuroraText } from "@/components/ui/aurora-text"
// import { Globe } from "@/components/ui/globe"

export default function WhatWeDo() {
    return (
        <div className="relative flex flex-col md:flex-row h-full w-full items-start gap-8 md:justify-between md:items-center overflow-hidden p-10">
            

            <div className="flex h-full flex-col justify-center gap-4 z-20 text-left shrink-0">
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
                    duration={2}
                    repeatDelay={1}
                    className={cn(
                        "mask-[radial-gradient(500px_circle_at_center,white,transparent)]",
                        "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12", "will-change-transform"
                    )}
                />
            </div>
        </div>
    )
}
