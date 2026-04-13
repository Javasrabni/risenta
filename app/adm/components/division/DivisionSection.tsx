"use client"

import React, { forwardRef, useRef, useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { cn } from "@/lib/utils"

interface TeamMember {
  name: string
  imageUrl: string
  role: string
  risentaID?: string
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
  { src: string; alt: string; size?: "sm" | "md" | "lg"; risentaID?: string }
>(({ src, alt, size = "md", risentaID }, ref) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  }
  const avatarContent = (
    <div
      ref={ref}
      className={cn(
        "relative rounded-full overflow-hidden border-2 border-white dark:border-neutral-800 shadow-md",
        "transition-transform duration-300 hover:scale-110 hover:shadow-lg",
        "cursor-pointer",
        sizeClasses[size]
      )}
    >
      <Image src={src} alt={alt} fill className="object-cover" />
    </div>
  )
  
  if (risentaID) {
    return (
      <Link href={`/adm/profile?user=${risentaID}`} className="block">
        {avatarContent}
      </Link>
    )
  }
  return avatarContent
})
MemberAvatar.displayName = "MemberAvatar"

// ---------------------------------------------------------------------------
// AvatarSkeleton — placeholder loading dengan forwardRef
// ---------------------------------------------------------------------------
const AvatarSkeleton = forwardRef<HTMLDivElement, { size?: "sm" | "md" | "lg" }>(
  ({ size = "md" }, ref) => {
    const sizeClasses = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-14 h-14",
    }
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse",
          sizeClasses[size]
        )}
      />
    )
  }
)
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
  const igAvatarRef           = useRef<HTMLDivElement>(null)
  const igCoordinatorRef      = useRef<HTMLDivElement>(null)
  const rasyidAvatarRef       = useRef<HTMLDivElement>(null)
  const bizCoordinatorRef     = useRef<HTMLDivElement>(null)
  const bizAvatarRef          = useRef<HTMLDivElement>(null)

  // State
  const [instagramMembers, setInstagramMembers]       = useState<TeamMember[]>([])
  const [igCoordinator,    setIgCoordinator]          = useState<TeamMember | null>(null)
  const [businessMembers,  setBusinessMembers]        = useState<TeamMember[]>([])
  const [bizCoordinator,   setBizCoordinator]         = useState<TeamMember | null>(null)
  const [rasyidMember,     setRasyidMember]           = useState<TeamMember | null>(null)
  const [loading,          setLoading]               = useState(true)

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const response = await fetch("/api/team")
        if (response.ok) {
          const data = await response.json()
          const team: TeamMember[] = data.team || []
          console.log("[DivisionSection] Team data from API:", team.map(t => ({ name: t.name, risentaID: t.risentaID })))

          const instagram = team.filter(
            (m) =>
              (m.role.toLowerCase().includes("communication") ||
              m.role.toLowerCase().includes("social")) &&
              m.name !== "Daffa Adnan Asyarof"
          )

          const igCoord = team.find((m) => m.name === "Daffa Adnan Asyarof")

          const business = team.filter(
            (m) =>
              (m.role.toLowerCase().includes("accounting") ||
              m.role.toLowerCase().includes("finance") ||
              m.role.toLowerCase().includes("bisnis") ||
              m.role.toLowerCase().includes("business") ||
              m.role.toLowerCase().includes("law")) &&
              m.name !== "Javas Anggaraksa Rabbani"
          )

          const bizCoord = team.find((m) => m.name === "Javas Anggaraksa Rabbani")

          const rasyid = team.find((m) => m.name === "Rasyid Ali Nurhakim")

          // Fetch risentaIDs for coordinators from admin data
          const adminResponse = await fetch("/api/admin/all")
          let adminData: { risentaID: string; adm_usn: string }[] = []
          if (adminResponse.ok) {
            adminData = await adminResponse.json()
          }

          // Add risentaID to team members (preserve existing risentaID from team API, use admin API as fallback)
          const addRisenttaID = (member: TeamMember | null | undefined): TeamMember | null => {
            if (!member) return null
            // If risentaID already exists from team API, use it
            if (member.risentaID) return member
            // Otherwise try to find from admin data
            const admin = adminData.find((a) => 
              a.adm_usn.toLowerCase().replace(/\s+/g, '') === 
              member.name.toLowerCase().replace(/\s+/g, '')
            )
            return { ...member, risentaID: admin?.risentaID }
          }

          const igMembersWithID = instagram.map(addRisenttaID).filter((m): m is TeamMember => m !== null)
          const igCoordWithID = addRisenttaID(igCoord)
          const bizMembersWithID = business.map(addRisenttaID).filter((m): m is TeamMember => m !== null)
          const bizCoordWithID = addRisenttaID(bizCoord)
          const rasyidWithID = addRisenttaID(rasyid)
          
          console.log("[DivisionSection] After processing:", {
            igCoordinator: igCoordWithID,
            bizCoordinator: bizCoordWithID,
            rasyidMember: rasyidWithID,
            instagramMembers: igMembersWithID.map((m) => ({ name: m.name, risentaID: m.risentaID })),
          })
          
          setInstagramMembers(igMembersWithID)
          setIgCoordinator(igCoordWithID ?? null)
          setBusinessMembers(bizMembersWithID)
          setBizCoordinator(bizCoordWithID ?? null)
          setRasyidMember(rasyidWithID ?? null)
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
    <div className="w-full flex flex-col items-center gap-2 py-8 px-6 mb-32">

      {/* Header */}
      <div className="flex flex-col items-center justify-center gap-2 mb-4">
        <h1 className="pointer-events-none font-[inter] bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-3xl lg:text-6xl leading-none font-bold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10 tracking-[-1px] pb-1">
          Divisi Risentta
        </h1>
        <p className="text-sm sm:text-base text-center max-w-md text-slate-500 dark:text-slate-400 font-medium">
          Terhubung. Bergerak. Bersama.
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
        <div className="relative z-10 flex w-full justify-center flex-row items-end px-0 md:px-4 h-30 mt-8 gap-4 md:gap-8">

          {/* Avatar Instagram + Coordinator */}
          <div className="flex flex-col items-center gap-2 md:gap-3 min-w-[80px] md:min-w-[100px] p-2 md:p-3 rounded-xl bg-gradient-to-t from-blue-500/10 to-transparent dark:from-blue-500/20">
            {/* IG Coordinator - Daffa */}
            <div className="relative mb-2">
              {loading ? (
                <AvatarSkeleton ref={igCoordinatorRef} />
              ) : igCoordinator ? (
                <Link href={`/adm/profile?user=${igCoordinator.risentaID || ''}`}>
                  <div
                    ref={igCoordinatorRef}
                    className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-neutral-800 shadow-md cursor-pointer transition-transform duration-300 hover:scale-110"
                  >
                    <Image 
                      src={igCoordinator.imageUrl} 
                      alt={igCoordinator.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                </Link>
              ) : (
                <div ref={igCoordinatorRef} className="w-10 h-10" />
              )}
            </div>
            {/* IG Members */}
            <div className="flex -space-x-3 hover:-space-x-1 transition-all duration-300">
              {loading ? (
                <AvatarSkeleton ref={igAvatarRef} />
              ) : instagramMembers[0] ? (
                <MemberAvatar
                  ref={igAvatarRef}
                  src={instagramMembers[0].imageUrl}
                  alt={instagramMembers[0].name}
                  risentaID={instagramMembers[0].risentaID}
                />
              ) : (
                <div ref={igAvatarRef} className="w-10 h-10" />
              )}
              {!loading &&
                instagramMembers.slice(1).map((member, idx) => (
                  <MemberAvatar 
                    key={member.name} 
                    src={member.imageUrl} 
                    alt={member.name}
                    risentaID={member.risentaID}
                    size={idx === 0 ? "md" : "sm"}
                  />
                ))}
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm font-semibold text-blue-600 dark:text-blue-400">Instagram</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{instagramMembers.length} members</p>
            </div>
          </div>

          {/* Avatar Rasyid — center / titik pusat beam (SPECIAL LARGER) - POSISI LEBIH TINGGI */}
          <div className="flex flex-col items-center gap-2 md:gap-3 min-w-[100px] md:min-w-[120px] p-2 md:p-3 rounded-xl bg-gradient-to-t from-amber-500/10 to-transparent dark:from-amber-500/20 -translate-y-6 md:-translate-y-8">
            <div className="relative">
              {loading ? (
                <AvatarSkeleton ref={rasyidAvatarRef} size="lg" />
              ) : rasyidMember ? (
                <Link href={`/adm/profile?user=${rasyidMember.risentaID || ''}`}>
                  <div
                    ref={rasyidAvatarRef}
                    className="relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-3 border-white dark:border-neutral-800 shadow-xl cursor-pointer transition-transform duration-300 hover:scale-110"
                  >
                    <Image 
                      src={rasyidMember.imageUrl} 
                      alt={rasyidMember.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                </Link>
              ) : (
                <div ref={rasyidAvatarRef} className="w-14 h-14 md:w-16 md:h-16" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Link href={`/adm/profile?user=${rasyidMember?.risentaID || ''}`} className="hover:underline">
                  {rasyidMember?.name || "Coordinator"}
                </Link>
              </p>
              <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400 font-medium">Coordinator</p>
            </div>
          </div>

          {/* Avatar Bisnis + Coordinator */}
          <div className="flex flex-col items-center gap-2 md:gap-3 min-w-[80px] md:min-w-[100px] p-2 md:p-3 rounded-xl bg-gradient-to-t from-blue-500/10 to-transparent dark:from-blue-500/20">
            {/* Biz Coordinator - Javas */}
            <div className="relative mb-2">
              {loading ? (
                <AvatarSkeleton ref={bizCoordinatorRef} />
              ) : bizCoordinator ? (
                <Link href={`/adm/profile?user=${bizCoordinator.risentaID || ''}`}>
                  <div
                    ref={bizCoordinatorRef}
                    className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-neutral-800 shadow-md cursor-pointer transition-transform duration-300 hover:scale-110"
                  >
                    <Image 
                      src={bizCoordinator.imageUrl} 
                      alt={bizCoordinator.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                </Link>
              ) : (
                <div ref={bizCoordinatorRef} className="w-10 h-10" />
              )}
            </div>
            {/* Biz Members */}
            <div className="flex -space-x-3 hover:-space-x-1 transition-all duration-300">
              {loading ? (
                <AvatarSkeleton ref={bizAvatarRef} />
              ) : businessMembers[0] ? (
                <MemberAvatar
                  ref={bizAvatarRef}
                  src={businessMembers[0].imageUrl}
                  alt={businessMembers[0].name}
                  risentaID={businessMembers[0].risentaID}
                />
              ) : (
                <div ref={bizAvatarRef} className="w-10 h-10" />
              )}
              {!loading &&
                businessMembers.slice(1).map((member, idx) => (
                  <MemberAvatar 
                    key={member.name} 
                    src={member.imageUrl} 
                    alt={member.name}
                    risentaID={member.risentaID}
                    size={idx === 0 ? "md" : "sm"}
                  />
                ))}
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm font-semibold text-blue-600 dark:text-blue-400">Bisnis</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{businessMembers.length} members</p>
            </div>
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
          startYOffset={-8}
          endYOffset={0}
          duration={2}
        />

        {/* Instagram → Rasyid (reverse) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rasyidAvatarRef}
          toRef={igAvatarRef}
          curvature={0}
          startYOffset={0}
          endYOffset={-8}
          duration={2}
          reverse
        />

        {/* Rasyid → Bisnis (forward) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rasyidAvatarRef}
          toRef={bizAvatarRef}
          curvature={0}
          startYOffset={-8}
          endYOffset={0}
          duration={2}
        />

        {/* Bisnis → Rasyid (reverse) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rasyidAvatarRef}
          toRef={bizAvatarRef}
          curvature={0}
          startYOffset={0}
          endYOffset={-8}
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