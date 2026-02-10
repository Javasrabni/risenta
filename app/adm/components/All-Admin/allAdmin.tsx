import React from 'react'
import Image from 'next/image'
import { GetAdminData, GetAllAdminData } from '../../lib/getAdminData'

const allAdmin = async () => {
    const allAdminData = await GetAllAdminData();
    const you = await GetAdminData();

    return (
        <div className="flex flex-col gap-8">
            {allAdminData.filter(adm => adm.risentaID !== you.risentaID).map((adm) =>
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
    )
}

export default allAdmin
