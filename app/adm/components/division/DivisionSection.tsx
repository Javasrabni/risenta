"use client"

import React, { forwardRef, useRef, useState, useEffect } from "react"
import Image from "next/image"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { cn } from "@/lib/utils"

interface TeamMember {
  name: string
  imageUrl: string
  role: string
}

// ---------------------------------------------------------------------------
// Circle
// ---------------------------------------------------------------------------
const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-10 flex size-12 items-center justify-center rounded-full border-2 p-3",
      "shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
      "border-gray-950/[.1] bg-white hover:bg-gray-950/[.05]",
      "dark:border-gray-50/[.1] dark:bg-gray-950 dark:hover:bg-gray-50/[.15]",
      className
    )}
  >
    {children}
  </div>
))
Circle.displayName = "Circle"

// ---------------------------------------------------------------------------
// MemberAvatar — forwardRef agar beam menunjuk tepat ke elemen avatar
// ---------------------------------------------------------------------------
const MemberAvatar = forwardRef<
  HTMLDivElement,
  { src: string; alt: string }
>(({ src, alt }, ref) => (
  <div
    ref={ref}
    className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-950/[.1] dark:border-gray-50/[.1]"
  >
    <Image src={src} alt={alt} fill className="object-cover" />
  </div>
))
MemberAvatar.displayName = "MemberAvatar"

// ---------------------------------------------------------------------------
// AvatarSkeleton — placeholder loading dengan forwardRef
// ---------------------------------------------------------------------------
const AvatarSkeleton = forwardRef<HTMLDivElement>((_, ref) => (
  <div
    ref={ref}
    className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
  />
))
AvatarSkeleton.displayName = "AvatarSkeleton"

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const Icons = {
  instagram: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white/90"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  ),
  business: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white/90"
    >
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  ),
}

// ---------------------------------------------------------------------------
// DivisionSection
// ---------------------------------------------------------------------------
export function DivisionSection() {
  // Satu container untuk semua AnimatedBeam
  const containerRef = useRef<HTMLDivElement>(null)

  // Refs: icon circles (row atas)
  const igCircleRef  = useRef<HTMLDivElement>(null)
  const bizCircleRef = useRef<HTMLDivElement>(null)

  // Refs: avatar (row bawah)
  const igAvatarRef     = useRef<HTMLDivElement>(null)
  const rasyidAvatarRef = useRef<HTMLDivElement>(null)
  const bizAvatarRef    = useRef<HTMLDivElement>(null)

  // State
  const [instagramMembers, setInstagramMembers] = useState<TeamMember[]>([])
  const [businessMembers,  setBusinessMembers]  = useState<TeamMember[]>([])
  const [rasyidMember,     setRasyidMember]     = useState<TeamMember | null>(null)
  const [loading,          setLoading]          = useState(true)

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const response = await fetch("/api/team")
        if (response.ok) {
          const data = await response.json()
          const team: TeamMember[] = data.team || []

          const instagram = team.filter(
            (m) =>
              m.role.toLowerCase().includes("communication") ||
              m.role.toLowerCase().includes("social") ||
              m.name === "Daffa Adnan Asyarof" ||
              m.name === "Saskia Hanina Sadiyah"
          )

          const business = team.filter(
            (m) =>
              m.role.toLowerCase().includes("accounting") ||
              m.role.toLowerCase().includes("finance") ||
              m.role.toLowerCase().includes("bisnis") ||
              m.role.toLowerCase().includes("business") ||
              m.role.toLowerCase().includes("law") ||
              m.name === "Javas Anggaraksa Rabbani" ||
              m.name === "Fiska Andini Putri"
          )

          const rasyid = team.find((m) => m.name === "Rasyid Ali Nurhakim")

          setInstagramMembers(instagram)
          setBusinessMembers(business)
          setRasyidMember(rasyid ?? null)
        }
      } catch (error) {
        console.error("Failed to fetch team data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [])

  return (
    <div className="w-full flex flex-col items-center gap-2 py-8 px-10 mb-24">

      {/* Header */}
      <div className="flex flex-col items-center justify-center gap-1">
        <h1 className="pointer-events-none font-[inter] bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-2xl lg:text-5xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10 tracking-[-1px] pb-1">
          Divisi Risentta
        </h1>
        <p className="text-xs sm:text-sm text-center mt-0 max-w-sm text-slate-600 dark:text-white">
          "Terhubung. Bergerak. Bersama."
        </p>
      </div>

      {/* Satu container — semua ref ada di dalamnya */}
      <div
        ref={containerRef}
        className="relative flex w-full flex-col items-stretch justify-between gap-4 overflow-hidden px-0 py-4"
      >

        {/* ── Row atas: Icon circles ── */}
        {/* <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex flex-col items-center gap-2">
            <Circle ref={igCircleRef}>
              <Icons.instagram />
            </Circle>
            <span className="text-xs sm:text-sm text-center max-w-sm text-slate-600 dark:text-white font-[inter]">
              Instagram
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Circle ref={bizCircleRef}>
              <Icons.business />
            </Circle>
            <span className="text-xs sm:text-sm text-center max-w-sm text-slate-600 dark:text-white font-[inter]">
              Bisnis
            </span>
          </div>
        </div> */}

        {/* ── Row bawah: Avatar ──
            z-10 memastikan avatar tampil di atas SVG beam (beam di z-0)
        */}
        <div className="relative z-10 flex w-full justify-between flex-row items-center px-0 h-10 mt-4">

          {/* Avatar Instagram */}
          <div className="flex flex-col items-center gap-2">
          <div className="flex -space-x-2 mt-1">
            {loading ? (
              <AvatarSkeleton ref={igAvatarRef} />
            ) : instagramMembers[0] ? (
              <MemberAvatar
                ref={igAvatarRef}
                src={instagramMembers[0].imageUrl}
                alt={instagramMembers[0].name}
              />
            ) : (
              <div ref={igAvatarRef} className="w-8 h-8" />
            )}
            {!loading &&
              instagramMembers.slice(1).map((member) => (
                <MemberAvatar key={member.name} src={member.imageUrl} alt={member.name} />
              ))}
              </div>
              <p className="text-xs text-gray-500">Instagram</p>
          </div>

          {/* Avatar Rasyid — center / titik pusat beam */}
          <div className="flex flex-col items-center gap-2">
          <div className="flex -space-x-2 mt-1">
            {loading ? (
              <AvatarSkeleton ref={rasyidAvatarRef} />
            ) : rasyidMember ? (
              <MemberAvatar
                ref={rasyidAvatarRef}
                src={rasyidMember.imageUrl}
                alt={rasyidMember.name}
              />
            ) : (
              <div ref={rasyidAvatarRef} className="w-8 h-8" />
            )}
          </div>
          <p className="text-xs text-gray-500">Coordinator</p>
          </div>
          {/* Avatar Bisnis */}
          <div className="flex flex-col items-center gap-2">

          <div className="flex -space-x-2 mt-1">
            {loading ? (
              <AvatarSkeleton ref={bizAvatarRef} />
            ) : businessMembers[0] ? (
              <MemberAvatar
              ref={bizAvatarRef}
              src={businessMembers[0].imageUrl}
                alt={businessMembers[0].name}
                />
              ) : (
                <div ref={bizAvatarRef} className="w-8 h-8" />
              )}
            {!loading &&
              businessMembers.slice(1).map((member) => (
                <MemberAvatar key={member.name} src={member.imageUrl} alt={member.name} />
              ))}
          </div>
            <p className="text-xs text-gray-500">Bisnis</p>
              </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            AnimatedBeam — icon circles (row atas)
            ig <──── ────> biz, dua arah berbarengan
        ════════════════════════════════════════════════════════ */}
        {/* <AnimatedBeam
          containerRef={containerRef}
          fromRef={igCircleRef}
          toRef={bizCircleRef}
          startYOffset={10}
          endYOffset={10}
          curvature={-20}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={igCircleRef}
          toRef={bizCircleRef}
          startYOffset={-20}
          endYOffset={-20}
          curvature={50}
          reverse
        /> */}

        {/* ════════════════════════════════════════════════════════
            AnimatedBeam — avatar (row bawah)

            Pola yang diinginkan:
              Fase 1 → rasyid memancar ke kiri (ig) dan ke kanan (biz)
                       secara bersamaan
              Fase 2 → ig dan biz balik menuju rasyid secara bersamaan
                       (dengan prop `reverse`)

            Trik:
            • fromRef=rasyidAvatarRef, toRef=igAvatarRef
              → arah forward  : rasyid → ig
              → arah reverse  : ig    → rasyid
            • fromRef=rasyidAvatarRef, toRef=bizAvatarRef
              → arah forward  : rasyid → biz
              → arah reverse  : biz   → rasyid

            duration & delay sama di keempat beam
            → animasi simetris kiri-kanan, berbarengan.

            startYOffset/endYOffset = 18
            → titik anchor beam sedikit di BAWAH pusat avatar
            → garis beam lewat di bawah lingkaran, tidak menimpa avatar
            (avatar sendiri di z-10 di atas SVG beam)
        ════════════════════════════════════════════════════════ */}

        {/* Rasyid → Instagram (forward) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rasyidAvatarRef}
          toRef={igAvatarRef}
          curvature={0}
          startYOffset={-0}
          endYOffset={0}
          duration={2}
        />

        {/* Instagram → Rasyid (reverse) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rasyidAvatarRef}
          toRef={igAvatarRef}
          curvature={0}
          startYOffset={-0}
          endYOffset={0}
          duration={2}
          reverse
        />

        {/* Rasyid → Bisnis (forward) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rasyidAvatarRef}
          toRef={bizAvatarRef}
          curvature={0}
          startYOffset={-0}
          endYOffset={0}
          duration={2}
        />

        {/* Bisnis → Rasyid (reverse) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rasyidAvatarRef}
          toRef={bizAvatarRef}
          curvature={0}
          startYOffset={-0}
          endYOffset={0}
          duration={2}
          reverse
        />

           {/* <AnimatedBeam
          containerRef={containerRef}
          fromRef={bizAvatarRef}
          toRef={igAvatarRef}
          curvature={-40}
          startYOffset={-0}
          endYOffset={0}
          duration={2}
          reverse
        />
         <AnimatedBeam
          containerRef={containerRef}
          fromRef={igAvatarRef}
          toRef={bizAvatarRef}
         curvature={-40}
          startYOffset={-0}
          endYOffset={0}
          duration={1}
          reverse
        />
 */}

      </div>
    </div>
  )
}