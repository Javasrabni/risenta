import { GetAdminData } from '../lib/getAdminData'
import { redirect } from 'next/navigation'
import ProfilePageClient from './ProfileClient'

interface PlainAdmin {
    risentaID: string
    adm_usn: string
    photoProfile?: string
    position?: string
    _id?: string
    createdAt?: string
    updatedAt?: string
}

export default async function ProfilePage() {
    const admin = await GetAdminData() as PlainAdmin & { createdAt?: Date; updatedAt?: Date }
    
    if (!admin) {
        redirect('/')
    }

    // Convert MongoDB ObjectId to string for client component
    const plainAdmin: PlainAdmin = {
        ...admin,
        _id: admin._id?.toString(),
        createdAt: admin.createdAt?.toISOString(),
        updatedAt: admin.updatedAt?.toISOString(),
        position: admin.position || "",
    }

    return <ProfilePageClient admin={plainAdmin} />
}
