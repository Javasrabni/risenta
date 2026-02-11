import { redirect } from 'next/navigation'
import { GetAdminData } from './lib/getAdminData'
import Navbar from './components/navbar/navbar'

export default async function AdmLayout({ children, }: { children: React.ReactNode }) {
    const you = await GetAdminData();
    if (!you) redirect('/');

    return (
        <>
            <Navbar />
            {children}
        </>
    )
}