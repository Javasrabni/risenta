"use client"

import { forwardRef, useRef } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { AnimatedBeam } from "@/components/ui/animated-beam"

/* ===============================
   Avatar Circle (Reusable)
================================ */

type AvatarCircleProps = {
  src: string
  name: string
  className?: string
}

const AvatarCircle = forwardRef<HTMLDivElement, AvatarCircleProps>(
  ({ src, name, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "z-10 flex items-center justify-center rounded-full border bg-white shadow-md overflow-hidden",
          className
        )}
      >
        <Image
          src={src}
          alt={name}
          width={96}
          height={96}
          className="object-cover"
          priority
        />
      </div>
    )
  }
)

AvatarCircle.displayName = "AvatarCircle"

/* ===============================
   Data (Replace with API later)
================================ */

const TEAM = {
  leader: {
    name: "Project Lead",
    avatar: "/team/leader.jpg",
  },
  members: [
    { name: "Research", avatar: "/team/research.jpg" },
    { name: "Design", avatar: "/team/design.jpg" },
    { name: "Developer", avatar: "/team/dev.jpg" },
    { name: "Content", avatar: "/team/content.jpg" },
    { name: "Community", avatar: "/team/community.jpg" },
    { name: "Operations", avatar: "/team/ops.jpg" },
  ],
}

/* ===============================
   Main Component
================================ */

export default function Team() {
  const containerRef = useRef<HTMLDivElement>(null)

  const leaderRef = useRef<HTMLDivElement>(null)
  const memberRefs = Array.from({ length: 6 }, () =>
    useRef<HTMLDivElement>(null)
  )

  return (
    <div
      ref={containerRef}
      className="relative flex h-[420px] w-full items-center justify-center overflow-hidden"
    >
      {/* ===== Center (Leader) ===== */}
      <AvatarCircle
        ref={leaderRef}
        src={TEAM.leader.avatar}
        name={TEAM.leader.name}
        className="size-24"
      />

      {/* ===== Members ===== */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative size-[320px]">
          {TEAM.members.map((member, i) => {
            const positions = [
              "top-0 left-1/2 -translate-x-1/2",
              "top-1/4 right-0 -translate-y-1/2",
              "bottom-1/4 right-0 translate-y-1/2",
              "bottom-0 left-1/2 -translate-x-1/2",
              "bottom-1/4 left-0 translate-y-1/2",
              "top-1/4 left-0 -translate-y-1/2",
            ]

            return (
              <AvatarCircle
                key={member.name}
                ref={memberRefs[i]}
                src={member.avatar}
                name={member.name}
                className={cn(
                  "absolute size-14",
                  positions[i]
                )}
              />
            )
          })}
        </div>
      </div>

      {/* ===== Animated Beams ===== */}
      {memberRefs.map((ref, i) => (
        <AnimatedBeam
          key={i}
          containerRef={containerRef}
          fromRef={ref}
          toRef={leaderRef}
          curvature={20}
          duration={2.5}
          reverse
        />
      ))}
    </div>
  )
}
