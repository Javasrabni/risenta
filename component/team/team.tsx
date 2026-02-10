"use client"

import React, { forwardRef, useRef, useState, useEffect } from "react"
import { useInView } from "framer-motion"
import { cn } from "@/utils/utils"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import Image from "next/image"
import { AuroraText } from "@/components/ui/aurora-text"
import BlurFadeDiv from "../animation/blurFadeComp"

const Circle = forwardRef<
    HTMLDivElement,
    { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "z-10 flex size-12 md:size-20 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
                className
            )}
        >
            {children}
        </div>
    )
})
Circle.displayName = "Circle"

export default function Team() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeBeams, setActiveBeams] = useState({
        b1: false, b2: false, b3: false, b5: false, b6: false
    });
    const [isVisible, setIsVisible] = useState(false);

    // Gunakan Native Intersection Observer agar lebih galak deteksinya
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                } else {
                    // FORCE RESET seketika saat keluar layar 1 pixel pun
                    setIsVisible(false);
                    setActiveBeams({ b1: false, b2: false, b3: false, b5: false, b6: false });
                }
            },
            {
                threshold: 0.05, // Sangat sensitif, 5% terlihat langsung nyala, <5% langsung mati
                rootMargin: "0px"
            }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Refs untuk titik target presisi (Anchor)
    const div1Ref = useRef<HTMLDivElement>(null)
    const div2Ref = useRef<HTMLDivElement>(null)
    const div3Ref = useRef<HTMLDivElement>(null)
    const div4Ref = useRef<HTMLDivElement>(null)
    const div5Ref = useRef<HTMLDivElement>(null)
    const div6Ref = useRef<HTMLDivElement>(null)


    return (
        <div
            className="relative flex flex-col md:flex-row h-full w-full items-start gap-8 md:justify-between md:items-center overflow-hidden p-10"
            ref={containerRef}
        >
            {/* BAGIAN TEKS KIRI (UI ASLI DIKEMBALIKAN) */}
            <div className="flex h-full flex-col justify-center gap-4 z-20">
                <BlurFadeDiv delay={0.1}>
                    <span className="text-[10px] md:text-xs font-semibold tracking-[0.35em] text-slate-800/60 font-[inter] uppercase dark:text-slate-200/60">
                        Meet our <AuroraText>Team</AuroraText>
                    </span>
                </BlurFadeDiv>
                <BlurFadeDiv delay={0.3}>
                    <h1 className="pointer-events-none font-[inter] bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-left text-3xl lg:text-5xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10 tracking-[-1px] pb-4">
                        The Minds<br />Behind Risenta
                    </h1>
                </BlurFadeDiv>
                <BlurFadeDiv delay={0.5}>
                    <p className="text-slate-800/80 dark:text-slate-200/80 max-w-md text-sm md:text-base font-[inter]">
                        Representasi dari berbagai disiplin ilmu yang berkomitmen pada keterbukaan informasi dan pengembangan wawasan ilmiah. Membuka ruang diskusi bagi pemuda Indonesia untuk mengeksplorasi ide inovatif.
                    </p>
                </BlurFadeDiv>

                {/* Logo Risenta Bawah Teks */}
                <div className="relative w-40 h-25 md:w-64 md:h-25 translate-x-[-36px] sm:translate-x-[-58px]">
                    <Image src={'/Assets/logo/logo.jpeg'} alt="Risenta Logo" fill className="invert dark:invert-0 object-cover" />
                </div>
            </div>

            {/* BAGIAN GRID FOTO KANAN (UI ASLI DIKEMBALIKAN) */}
            <div className="flex size-full max-h-[600px] h-full max-w-lg flex-col items-stretch justify-between gap-10 md:gap-12 z-20">

                {/* Baris 1 */}
                <div className="flex flex-col gap-2 justify-between w-full">
                    <BlurFadeDiv direction="left" delay={0.7} onAnimationComplete={() => setActiveBeams(p => ({ ...p, b1: true }))}>
                        <div className="flex items-center gap-2">
                            <div className="w-12 h-12 md:w-20 md:h-20 relative rounded-full z-20">
                                <div ref={div1Ref} className="absolute inset-0 m-auto size-1 pointer-events-none" />
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 relative">
                                    <Image src={'/Assets/team/JavasAnggaraksaRabbani.jpeg'} alt="" fill className="object-cover pointer-events-none select-none" draggable='false' />
                                </div>
                            </div>
                            <span className="flex flex-col">
                                <p className="text-slate-800/80 dark:text-slate-200/80 font-[inter] text-xs font-medium md:text-base">Javas Anggaraksa Rabbani</p>
                                <p className="text-slate-800/80 dark:text-slate-200/50 font-[inter] text-xs md:text-sm">Legal/Law</p>
                            </span>
                        </div>
                    </BlurFadeDiv>

                    <BlurFadeDiv direction="right" delay={0.9} onAnimationComplete={() => setActiveBeams(p => ({ ...p, b2: true }))}>
                        <div className="flex flex-row-reverse items-center gap-2">
                            <div className="w-12 h-12 md:w-20 md:h-20 relative rounded-full z-20">
                                <div ref={div2Ref} className="absolute inset-0 m-auto size-1 pointer-events-none" />
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 relative">
                                    <Image src={'/Assets/team/RasyidAliNurhakim.jpeg'} alt="" fill className="object-cover pointer-events-none select-none" draggable='false' />
                                </div>
                            </div>
                            <span className="flex flex-col text-right">
                                <p className="text-slate-800/80 dark:text-slate-200/80 font-[inter] text-xs font-medium md:text-base">Rasyid Ali Nurhakim</p>
                                <p className="text-slate-800/80 dark:text-slate-200/50 font-[inter] text-xs md:text-sm">Public Health</p>
                            </span>
                        </div>
                    </BlurFadeDiv>
                </div>

                {/* Baris 2 */}
                <div className="flex flex-col justify-between gap-2">
                    <BlurFadeDiv direction="left" delay={1.1} onAnimationComplete={() => setActiveBeams(p => ({ ...p, b3: true }))}>
                        <div className="flex self-start flex-row items-center gap-2">
                            <div className="w-12 h-12 md:w-20 md:h-20 relative rounded-full z-20">
                                <div ref={div3Ref} className="absolute inset-0 m-auto size-1 pointer-events-none" />
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 relative">
                                    <Image src={'/Assets/team/SaskiaHaninaSadiyah.jpeg'} alt="" fill className="object-cover scale-140 translate-y-[4px] pointer-events-none select-none" draggable='false' />
                                </div>
                            </div>
                            <span className="flex flex-col">
                                <p className="text-slate-800/80 dark:text-slate-200/80 font-[inter] text-xs font-medium md:text-base">Saskia Hanina Sadiyah</p>
                                <p className="text-slate-800/80 dark:text-slate-200/50 font-[inter] text-xs md:text-sm">Communication Science</p>
                            </span>
                        </div>
                    </BlurFadeDiv>

                    {/* Logo Tengah */}
                    <div className="relative self-center w-14 h-14 z-20">
                        <div ref={div4Ref} className="absolute inset-0 m-auto size-1 pointer-events-none" />
                        <div className="w-full h-full rounded-full overflow-hidden outline-2 outline-blue-50 dark:outline-neutral-800">
                            <Image src={'/Assets/logo/logo.jpeg'} alt="" fill className="rounded-full" />
                        </div>
                    </div>

                    <BlurFadeDiv direction="right" delay={1.3} onAnimationComplete={() => setActiveBeams(p => ({ ...p, b5: true }))}>
                        <div className="flex flex-row-reverse self-end items-center gap-2">
                            <div className="w-12 h-12 md:w-20 md:h-20 relative rounded-full z-20">
                                <div ref={div5Ref} className="absolute inset-0 m-auto size-1 pointer-events-none" />
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 relative">
                                    <Image src={'/Assets/team/DaffaAdnanAsyarof.jpeg'} alt="" fill className="object-cover scale-100 translate-x-[-0px] object-top pointer-events-none select-none" draggable='false' />
                                </div>
                            </div>
                            <span className="flex flex-col text-right">
                                <p className="text-slate-800/80 dark:text-slate-200/80 font-[inter] text-xs font-medium md:text-base">Daffa Adnan Asyarof</p>
                                <p className="text-slate-800/80 dark:text-slate-200/50 font-[inter] text-xs md:text-sm">History</p>
                            </span>
                        </div>
                    </BlurFadeDiv>
                </div>

                {/* Baris 3 */}
                <div className="flex flex-row items-center justify-between">
                    <BlurFadeDiv direction="left" delay={1.5} onAnimationComplete={() => setActiveBeams(p => ({ ...p, b6: true }))}>
                        <div className="flex flex-row items-center gap-2">
                            <div className="w-12 h-12 md:w-20 md:h-20 relative rounded-full z-20">
                                <div ref={div6Ref} className="absolute inset-0 m-auto size-1 pointer-events-none" />
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 relative">
                                    <Image src={'/Assets/team/M.AlbarHakim.jpeg'} alt="" fill className="object-cover object-top pointer-events-none select-none" draggable='false' />
                                </div>
                            </div>
                            <span className="flex flex-col">
                                <p className="text-slate-800/80 dark:text-slate-200/80 font-[inter] text-xs font-medium md:text-base">M. Albar Hakim</p>
                                <p className="text-slate-800/80 dark:text-slate-200/50 font-[inter] text-xs md:text-sm">Industrial Engineering</p>
                            </span>
                        </div>
                    </BlurFadeDiv>
                </div>
            </div>

            <div
                key={`beam-container-${isVisible}`}
                className={cn(
                    "absolute inset-0 pointer-events-none z-0",
                    !isVisible && "hidden" // Sembunyikan total jika tidak di viewport
                )}
            >
                {isVisible && (
                    <>
                        {activeBeams.b1 && <AnimatedBeam containerRef={containerRef} fromRef={div1Ref} toRef={div4Ref} curvature={-75} duration={1.5} />}
                        {activeBeams.b2 && <AnimatedBeam containerRef={containerRef} fromRef={div2Ref} toRef={div4Ref} curvature={-30} duration={1.5} />}
                        {activeBeams.b3 && <AnimatedBeam containerRef={containerRef} fromRef={div3Ref} toRef={div4Ref} curvature={75} duration={1.5} />}
                        {activeBeams.b5 && <AnimatedBeam containerRef={containerRef} fromRef={div5Ref} toRef={div4Ref} curvature={-75} duration={1.5} reverse />}
                        {activeBeams.b6 && <AnimatedBeam containerRef={containerRef} fromRef={div6Ref} toRef={div4Ref} duration={1.5} reverse />}
                    </>
                )}
            </div>
        </div>
    )
}