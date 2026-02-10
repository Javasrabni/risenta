import connectDB from '@/utils/mongodb'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RisentaAdm from '../models/risentaAdm'
import { AppWindowMac } from 'lucide-react'
import Image from 'next/image'

import { GetAdminData, GetAllAdminData } from './lib/getAdminData'
import { AdminAvatarCircles } from './components/card_list_allAdmin/avatarCircle'

export default async function Page() {
    // const allAdminData = await GetAllAdminData();
    // const you = await GetAdminData();

    return (
        <div className={'p-6 w-full h-full flex flex-col gap-12 font-[inter]'}>
            <AdminAvatarCircles />
        </div>
    )
}