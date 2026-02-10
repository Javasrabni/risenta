"use server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function Logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session_token')
    redirect('/')
}