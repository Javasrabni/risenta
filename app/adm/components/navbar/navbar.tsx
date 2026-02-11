import { LogOutIcon } from 'lucide-react'
import { GetAdminData } from '../../lib/getAdminData'
import Image from 'next/image'
import { Logout } from '../logout'
import Link from 'next/link'

export default async function Navbar() {
    const you = await GetAdminData()
    return (
        <div className="w-full h-20 py-4 flex flex-row items-center justify-between gap-4 border-b border-neutral-300 dark:border-neutral-900 px-6 sm:px-12 font-[inter]">
            {/* LOGO */}
            <Link className='relative overflow-hidden w-32 h-8' href={'/'}>
                <Image
                    src={'/Assets/logo/logo.jpeg'}
                    alt="Risenta Logo"
                    fill
                    className="object-cover position-center scale-130 translate-x-[-18px] invert dark:invert-0"
                />
            </Link>

            {/* ADM NAME */}
            <div className='flex flex-row items-center justify-between gap-4'>
                <div className='w-fit flex flex-row-reverse gap-4 items-center'>
                    <div className='relative w-8 h-8 rounded-full'>
                        <Image src={`${you.photoProfile || `/Assets/tema/${you.adm_usn.replaceAll(' ', '')}.jpeg`}`} alt={`${you.adm_usn} PP`} fill className="object-cover  rounded-full" />
                    </div>
                    <p className={'text-xs sm:text-sm'}>{you.adm_usn.split(' ')[0] + '..'}</p>
                </div>

                {/* LOGOUT */}
                <div>
                    <form action={Logout}>
                        <button type="submit">
                            <LogOutIcon size={16} className="cursor-pointer hover:opacity-70 transition-opacity text-red-400 mt-[8px]" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

