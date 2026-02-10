"use client"
import { useState } from "react"
import { MessageSquareQuoteIcon, SendHorizonalIcon } from 'lucide-react'
import { useRouter } from "next/navigation"

const PatchNote = () => {
    const router = useRouter()
    const [note, setNote] = useState<string>("")
    async function PATCH_NOTE() {
        try {
            const res = await fetch('/api/admin/notesAdm', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note }),
            })
            const data = await res.json()
            if (!res.ok) {
                alert(data.message)
                return
            }
            setNote("")
            router.refresh()
        } catch (error) {
            console.error(error)
        }
    }
    return (
        <div className='w-full h-fit flex items-center justify-center'>
            <div className='px-4 py-2 border border-neutral-300 dark:border-neutral-900 rounded-md hover:bg-neutral-100/50 dark:hover:bg-neutral-900 transition-colors flex items-center gap-2'>
                <MessageSquareQuoteIcon size={14} className="text-neutral-500 dark:text-neutral-400 mt-[-1px]" />
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} className="bg-transparent outline-none outline-none focus:outline-none text-xs" placeholder="Ubah Notes" />
            </div>

            <button type="button" onClick={PATCH_NOTE} className="ml-2 px-4 py-[10px] bg-neutral-100   dark:bg-neutral-950 rounded-sm text-xs hover:bg-neutral-700 dark:hover:bg-neutral-900 cursor-pointer transition-colors"><SendHorizonalIcon size={14} className="text-blue-500" /></button>
        </div>
    )
}

export default PatchNote
