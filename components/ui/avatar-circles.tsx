"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface Avatar {
  imageUrl: string
  profileUrl: string
}
interface AvatarCirclesProps {
  className?: string
  numPeople?: number
  avatarUrls: Avatar[]
}

export const AvatarCircles = ({
  numPeople,
  className,
  avatarUrls,
}: AvatarCirclesProps) => {
  return (
    <div className={cn("z-10 flex -space-x-4 rtl:space-x-reverse shrink-0", className)}>
      {avatarUrls.map((url, index) => (
        // <a
        //   key={index}
        //   href={url.profileUrl}
        //   target="_blank"
        //   rel="noopener noreferrer"
        // >
        <Image
          key={index}
          className="select-none h-10 w-10 sm:h-14 sm:w-14 rounded-full border-2 border-white dark:border-gray-800 object-cover"
          src={url.imageUrl}
          width={40}
          height={40}
          alt={`Avatar ${index + 1}`}
          draggable={false}
        />
        // </a> 
      ))}
      {/* {(numPeople ?? 0) > 0 && (
        <a
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-black text-center text-xs font-medium text-white hover:bg-gray-600 dark:border-gray-800 dark:bg-neutral-950 dark:text-neutral-300"
          href=""
        >
          +{numPeople}
        </a>
      )} */}
    </div>
  )
}
