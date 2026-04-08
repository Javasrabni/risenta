import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { GetAdminData, GetAllAdminData } from '../../lib/getAdminData'

const allAdmin = async () => {
    const allAdminData = await GetAllAdminData();
    const you = await GetAdminData();

    return (
        <div className="flex flex-col gap-8">
            {allAdminData.filter(adm => adm.risenttaID !== you.risenttaID).map((adm) =>
                <div key={adm.risenttaID}>
                    <div className='flex flex-row gap-4 items-center '>
                        <div className='relative w-12 h-12 rounded-full text-white'>
                            <Image src={adm.photoProfile || `/Assets/team/${adm.adm_usn.replaceAll(' ', '')}.jpeg`} alt={`${adm.adm_usn} Photo`} fill className="object-cover rounded-full" />
                        </div>
                        <Link href={`/adm/profile?user=${adm.risenttaID}`} className="hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <p>{adm.adm_usn}</p>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

export default allAdmin
