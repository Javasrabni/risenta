"use client";
import { BorderBeam } from "@/components/ui/border-beam";
import { RippleButton } from "@/components/ui/ripple-button";
import { useRouter } from "next/navigation";

export default function RippleBtn({ text, href }: { text: string; href?: string }) {
  const router = useRouter();

  return (
    // Wrapper utama harus relative agar BorderBeam menempel di sini
    <div className="relative inline-block rounded-md overflow-hidden p-[1px]">
      <RippleButton
        rippleColor="rgba(173, 216, 230, 0.5)"
        // Hapus border beam dari dalam, biarkan RippleButton fokus ke teks & ripple
        className="px-6 py-2 rounded-md text-[12px] md:text-sm font-medium font-[inter] bg-background"
        onClick={() => router.push(href || "/")}
      >
        {text}
      </RippleButton>

      {/* BorderBeam diletakkan sejajar dengan Button, bukan di dalamnya */}
     <BorderBeam
        duration={4}
        size={60}
        className="from-transparent via-blue-500 to-transparent"
      />
    </div>
  );
}