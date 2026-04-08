import connectDB from '@/lib/mongodb'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RisenttaAdm from '../../models/risentaAdm'

interface Admin {
    _id: string
    risentaID: string
    adm_usn: string
    photoProfile?: string
    cloudinaryPublicId?: string
    position?: string
    division?: string
    skills?: string[]
    createdAt?: Date
    updatedAt?: Date
}

export async function GetAdminData() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value
    if (!token) redirect('/')

    await connectDB()
    const you = await RisenttaAdm.findOne({ token }, { _id: 1, risentaID: 1, adm_usn: 1, photoProfile: 1, cloudinaryPublicId: 1, position: 1, division: 1, skills: 1, createdAt: 1 }).lean<Admin>()
    if (!you) redirect('/')

    return you;
}

export async function GetAllAdminData() {
    await connectDB()
    const getAllDataAdmin = await RisenttaAdm.find({}, '-token').lean<Admin[]>()
    return getAllDataAdmin;
}