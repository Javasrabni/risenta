// import { LightRays } from '@/components/ui/light-rays'
import { AdminAvatarCircles } from '../components/All-Admin/avatarCircle'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { AdminNote } from '../components/notes/AdminNote'
import PatchNote from '../components/notes/patchNoteButton'
import { DivisionSection } from '../components/division/DivisionSection'
import connectDB from '@/lib/mongodb'
import RisentaAdm from '@/app/models/risentaAdm'

// Components from root page design
import { cn } from '@/lib/utils'
import { DotPattern } from '@/components/ui/dot-pattern'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import { AuroraText } from '@/components/ui/aurora-text'
import { Highlighter } from '@/components/ui/highlighter'
import Link from 'next/link'
import RippleBtn from '@/components/ui/rippleBtn/rippleBtn'
import NewInfoLanding from '@/components/sections/announcement/newInfo'

export default async function DashboardPage() {

    // GET NOTES DATA FROM ADMIN COLLECTION
    await connectDB()
    const reviews = await RisentaAdm.find({}).select('risentaID adm_usn photoProfile notes -_id').lean()

    return (
        <div className={'w-full min-h-screen flex flex-col font-[inter] relative overflow-hidden'}>
            
            {/* HEADER - Same style as root page landing section */}
            <div className='relative h-[60vh] flex items-center justify-center'>
                <div className='absolute z-20 top-12 w-full flex items-center justify-center px-6'>
                    <NewInfoLanding />
                </div>
                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                    <span className="text-[10px] md:text-xs font-semibold tracking-[0.35em] text-slate-800/60 uppercase dark:text-slate-200/60">
                        Admin <AuroraText>Dashboard</AuroraText>
                    </span>
                    <AnimatedShinyText shimmerWidth={150} shimmerDuration={3.5}>
                        <span className="pointer-events-none bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-center text-5xl lg:text-7xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10 tracking-[-2px]">
                            Risenta
                        </span>
                    </AnimatedShinyText>
                    <p className="max-w-md text-sm text-slate-800/80 md:text-base dark:text-slate-200/80 text-center">
                        Kelola tim, publikasi, dan operasional riset mandiri untuk narasi pengetahuan publik Indonesia.
                    </p>

                    <div className='pt-4 flex flex-col gap-4 items-center justify-center'>
                        <RippleBtn href='/adm/posts' text="Kelola Postingan" />
                        <Link href='/adm/profile'>
                            <p className="text-xs underline text-slate-800/80 dark:text-slate-200/80">✨ Edit Profile Admin</p>
                        </Link>
                    </div>
                </div>
                
                {/* Background Pattern */}
                <div className='opacity-30 absolute inset-0'>
                    <AnimatedGridPattern
                        numSquares={30}
                        maxOpacity={0.1}
                        duration={3}
                        repeatDelay={1}
                    />
                </div>
            </div>

            {/* MAIN CONTENT - Admin Dashboard Sections */}
            <div className="flex flex-col gap-6 relative z-10">
                
                {/* TEAM SECTION */}
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
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 sm:h-40 bg-gradient-to-t from-background via-background/60 to-transparent" />
                </div>

                <PatchNote />

                {/* ADMIN BIO */}
                <div className="flex sm:hidden">
                    <AdminNote reviews={reviews} />
                </div>

                {/* DIVISION SECTION */}
                <DivisionSection />
            </div>

            {/* FOOTER - Same DotPattern as root page */}
            <DotPattern
                width={20}
                height={20}
                cx={1}
                cy={1}
                cr={1}
                className={cn(
                    "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
                )}
            />
        </div>
    )
}
