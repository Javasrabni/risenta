import connectDB from '@/lib/mongodb'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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
    // Try cookies() first
    let token: string | undefined
    try {
        const cookieStore = await cookies()
        token = cookieStore.get('session_token')?.value
    } catch (e) {
        // cookies() may fail in some contexts, fallback to headers
    }
    
    // Fallback: parse from request headers
    if (!token) {
        try {
            const headersList = await headers()
            const cookieHeader = headersList.get('cookie')
            if (cookieHeader) {
                const match = cookieHeader.match(/session_token=([^;]+)/)
                if (match) {
                    token = match[1]
                }
            }
        } catch (e) {
            // headers() may also fail
        }
    }
    
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