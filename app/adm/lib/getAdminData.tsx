import connectDB from '@/lib/mongodb'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RisentaAdm from '../../models/risentaAdm'

interface Admin {
    _id: string
    risentaID: string
    adm_usn: string
    photoProfile?: string
    cloudinaryPublicId?: string
    position?: string
    createdAt?: Date
    updatedAt?: Date
}

export async function GetAdminData() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value
    if (!token) redirect('/')

    await connectDB()
    const you = await RisentaAdm.findOne({ token }, { _id: 1, risentaID: 1, adm_usn: 1, photoProfile: 1, cloudinaryPublicId: 1, position: 1 }).lean<Admin>()
    if (!you) redirect('/')

    return you;
}

export async function GetAllAdminData() {
    await connectDB()
    const getAllDataAdmin = await RisentaAdm.find({}, '-token').lean<Admin[]>()
    return getAllDataAdmin;
}