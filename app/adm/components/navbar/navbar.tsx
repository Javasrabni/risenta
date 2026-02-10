import { LogOutIcon } from 'lucide-react'
import { GetAdminData } from '../../lib/getAdminData'
import Image from 'next/image'
import { Logout } from '../logout'

export default async function Navbar() {
    const you = await GetAdminData()
    return (
        <div className="w-full fit py-4 flex flex-row items-center justify-between gap-4 border-b border-neutral-300 dark:border-neutral-900 px-6 justify-center font-[inter]">
            <div className='w-full flex flex-row gap-4 items-center'>
                <div className='relative w-8 h-8 rounded-full'>
                    <Image src={`${you.photoProfile || `/Assets/tema/${you.adm_usn.replaceAll(' ', '')}.jpeg`}`} alt={`${you.adm_usn} PP`} fill className="object-cover rounded-full" />
                </div>
                <p className={'text-xs sm:text-sm font-medium'}>{you.adm_usn}</p>
            </div>
            <form action={Logout}>
                <button type="submit">
                    <LogOutIcon size={16} className="cursor-pointer hover:opacity-70 transition-opacity text-red-400" />
                </button>
            </form>
        </div>
    )
}

