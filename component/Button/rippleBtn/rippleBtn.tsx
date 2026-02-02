"use client";
import { RippleButton } from "@/components/ui/ripple-button"
import { useRouter } from "next/navigation"

export default function RippleBtn({ text, href }: { text: string, href?: string }) {
  const router = useRouter()
  return (
    <div className="inline-block relative">
      <RippleButton
        rippleColor="rgba(173, 216, 230, 0.5)"
        className="px-6 py-2 rounded-md text-[12px] md:text-sm font-medium font-[inter]"
        onClick={() => router.push(href || "/")}
      >
        {text}
      </RippleButton>
    </div>
  )
}
