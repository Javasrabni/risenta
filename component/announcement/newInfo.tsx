// import Link from 'next/link';
"use client"
import { useRouter } from "next/navigation"

export default function NewInfoLanding() {
  const router = useRouter()

  return (
    <div className="w-fit cursor-pointer inline-flex items-center justify-center p-1 pr-3 mb-4 text-sm text-blue-800 dark:text-blue-200 rounded-full bg-blue-50 border border-blue-100 dark:border-blue-800 dark:bg-blue-900 font-[inter]" role="alert" onClick={() => router.push('/publikasi/riset-1')}>
      <span className="bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100 py-0.5 px-3 rounded-full text-xs font-bold uppercase tracking-wide">
        New
      </span>
      {/* <p className="ml-2 text-sm shrink-0">
        Kami telah <span className='font-semibold underline decoration-2 underline-offset-2'>mempublikasikan</span> karya ilmiah baru!{' '} 
      </p> */}
      <p className="ml-2 text-xs md:text-sm ">
        Publikasi terbaru Risenta{' '}
      </p>
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 5 7 7-7 7" />
      </svg>
    </div>
  );
}