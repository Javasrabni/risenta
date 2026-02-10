import { AvatarCircles } from "@/components/ui/avatar-circles"
import { Highlighter } from '@/components/ui/highlighter'

const avatars = [
    {
        imageUrl: "/Assets/team/JavasAnggaraksaRabbani.jpeg",
        profileUrl: "",
    },
    {
        imageUrl: "/Assets/team/RasyidAliNurhakim.jpeg",
        profileUrl: "",
    },
    {
        imageUrl: "/Assets/team/SaskiaHaninaSadiyah.jpeg",
        profileUrl: "",
    },
    {
        imageUrl: "/Assets/team/DaffaAdnanAsyarof.jpeg",
        profileUrl: "",
    },
    {
        imageUrl: "/Assets/team/M.AlbarHakim.jpeg",
        profileUrl: "",
    },
]

export function AdminAvatarCircles() {
    return (
        <div className='w-full h-fit py-8 flex flex-col items-center justify-center'>
            <AvatarCircles numPeople={5} avatarUrls={avatars}  />
            <p className='text-xs sm:text-sm text-center mt-4 max-w-sm text-slate-600 dark:text-white'>
                Kita semua{" "}
                <Highlighter action="underline" color="#1447E6">
                    bergerak dan bekerja bersama
                </Highlighter>{" "}
                demi mencapai tujuan besar kita, Risenta.
            </p>
        </div>
    )
}
