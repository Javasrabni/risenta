import { AvatarCircles } from "@/components/ui/avatar-circles"
import { Highlighter } from '@/components/ui/highlighter'
import connectDB from '@/lib/mongodb'
import RisentaAdm from '@/app/models/risentaAdm'

// Fixed team order
const TEAM_ORDER = [
    "Javas Anggaraksa Rabbani",
    "Rasyid Ali Nurhakim",
    "Fiska Andini Putri",
    "Saskia Hanina Sadiyah",
    "Daffa Adnan Asyarof",
    "M. Albar Hakim"
]

export async function AdminAvatarCircles() {
    await connectDB()
    const admins = await RisentaAdm.find({}, 'adm_usn photoProfile photoProfileBuffer photoProfileContentType').lean()
    
    // Create a map of admins by name for quick lookup
    const adminMap = new Map(admins.map(admin => [admin.adm_usn, admin]))
    
    // Build avatars in fixed order
    const avatars = TEAM_ORDER.map(name => {
        const admin = adminMap.get(name)
        let imageUrl = `/Assets/team/${name.replaceAll(' ', '')}.jpeg`
        
        // If admin has binary image data in MongoDB, convert to base64
        if (admin?.photoProfileBuffer) {
            const buffer = Buffer.from(admin.photoProfileBuffer)
            const base64 = buffer.toString('base64')
            const contentType = admin.photoProfileContentType || 'image/jpeg'
            imageUrl = `data:${contentType};base64,${base64}`
        } else if (admin?.photoProfile) {
            // Use URL if available
            imageUrl = admin.photoProfile
        }
        
        return {
            imageUrl,
            profileUrl: "",
        }
    })

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
