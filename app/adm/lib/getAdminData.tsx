import connectDB from '@/utils/mongodb'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RisentaAdm from '../../models/risentaAdm'

interface Admin {
    risentaID: string
    adm_usn: string
    photoProfile: string
}

export async function GetAdminData() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value
    if (!token) redirect('/')

    await connectDB()
    const you = await RisentaAdm.findOne({ token }).lean<Admin>()
    if (!you) redirect('/')

    return you;
}

export async function GetAllAdminData() {
    await connectDB()
    const getAllDataAdmin = await RisentaAdm.find({}, '-token').lean<Admin[]>()
    return getAllDataAdmin;
}