// import { LightRays } from '@/components/ui/light-rays'
import { AdminAvatarCircles } from './components/All-Admin/avatarCircle'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { AdminNote } from './components/notes/AdminNote'
import PatchNote from './components/notes/patchNoteButton'
import connectDB from '@/lib/mongodb'
import RisentaAdm from '@/app/models/risentaAdm'

export default async function Page() {

    // GET NOTES DATA FROM ADMIN COLLECTION
    await connectDB()
    const reviews = await RisentaAdm.find({}).select('risentaID adm_usn photoProfile notes -_id').lean()

    return (
        <div className={'w-full h-full flex flex-col gap-6 font-[inter] relative overflow-hidden'}>

            {/* TEAM  */}
            <div className='w-full h-50 sm:h-70 z-10 relative overflow-hidden p-6'>
                <AdminAvatarCircles />
                <div className='opacity-60'>
                    <AnimatedGridPattern
                        numSquares={20}
                        maxOpacity={0.1}
                        duration={2}
                        repeatDelay={2}
                    />
                </div>
                {/* gradient overlay */}
                <div className="
  pointer-events-none absolute inset-x-0 bottom-0 h-20 sm:h-40
  bg-gradient-to-t
  from-background
  via-background/60
  to-transparent
" />

            </div>

            <PatchNote />

            {/* ADMIN BIO */}
            <div className="flex sm:hidden">
                <AdminNote reviews={reviews} />
            </div>




            {/* <LightRays /> */}
        </div>
    )
}