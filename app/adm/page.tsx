import connectDB from '@/utils/mongodb'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RisentaAdm from '../models/risentaAdm'
import { AppWindowMac } from 'lucide-react'
import Image from 'next/image'

interface Admin {
    risentaID: string
    adm_usn: string
    photoProfile: string
}

export default async function Page() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value
    if (!token) redirect('/')

    await connectDB()
    const you = await RisentaAdm.findOne({ token }).lean()
    if (!you) redirect('/')

    console.log(you)
    const getAllDataAdmin = await RisentaAdm.find({}, '-token').lean<Admin[]>()

    return (
        <div className={'p-6 w-full h-screen flex flex-col gap-20'}>
            <div className="flex flex-col gap-8">
                {getAllDataAdmin.filter(adm => adm.risentaID !== you.risentaID).map((adm) =>
                    <div key={adm.risentaID}>
                        <div className='flex flex-row gap-4 items-center '>
                            <div className='relative w-12 h-12 rounded-full text-white'>
                                <Image src={adm.photoProfile || `/Assets/team/${adm.adm_usn.replaceAll(' ', '')}.jpeg`} alt={`${adm.adm_usn} Photo`} fill className="object-cover rounded-full" />
                            </div>
                            <p>{adm.adm_usn}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full h-full flex flex-col gap-4">
                <p>You: </p>
                <div className='w-full flex flex-row gap-4 items-center'>
                    <div className='relative w-12 h-12 rounded-full'>
                        <Image src={`${you.photoProfile || `/Assets/tema/${you.adm_usn.replaceAll(' ', '')}.jpeg`}`} alt={`${you.adm_usn} PP`} fill className="object-cover rounded-full" />
                    </div>
                    <p className={''}>{you.adm_usn}</p>
                </div>
            </div>
        </div>
    )
}