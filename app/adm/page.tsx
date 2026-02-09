import connectDB from '@/utils/mongodb'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RisentaAdm from '../models/risentaAdm'

export default async function Page() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value
    if (!token) redirect('/')

    await connectDB()
    const admin = await RisentaAdm.findOne({token}).lean()
    if (!admin) redirect('/')

    

    return (
        <div>
            <p>ADMIN {admin.adm_usn}</p>
        </div>
    )
}