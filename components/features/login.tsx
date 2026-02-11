"use client";

import { BorderBeam } from "@/components/ui/border-beam";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Menutup dropdown saat klik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // SEND DATA
  const [risentaID, setRisentaID] = useState<String>('')
  const [token, setToken] = useState<String>('')
  const [errorResp, setErrorResp] = useState<String>('')


  async function LoginReq(e: React.FormEvent) {
    try {


      e.preventDefault(); // Mencegah refresh halaman 
      setErrorResp(""); // Reset error sebelumnya

      // if (!risentaID || !token) {
      //   setErrorResp("Masukkan ID atau Token terlebih dahulu.")
      //   return
      // }

      const res = await fetch('/api/auth/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risentaID, token })
      })

      const data = await res.json()
      console.log(data)

      if (!res.ok) {
        setErrorResp(data.message)
        console.log(data.message);
        return
      }
      router.push('/adm')
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorResp("Gagal terhubung ke server.");
    }
  }


  return (
    <div className=" max-w-sm min-w-70 mx-auto p-6 mx-8 bg-white dark:bg-neutral-950 outline-1 outline-neutral-800 rounded-xl font-[inter] overflow-hidden relative">
      <div className="flex items-center -space-x-px rounded-lg relative" ref={dropdownRef}>

        {/* Phone Input */}
        <div className="relative w-full">
          <input
            type="text"
            id="phone-input"
            className="w-full z-20 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:outline-none block px-3 py-2.5 dark:bg-neutral-900 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white :outline-none"
            placeholder="Risenta Id"
            required
            maxLength={20}
            onChange={(e) => setRisentaID(e.target.value)}
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="mt-4">
        {/* <label htmlFor="password" className="block mb-2.5 text-sm font-medium text-slate-900 dark:text-white">
          Your password
        </label> */}
        <input
          type="password"
          id="password"
          placeholder="Token"
          className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:outline-none block w-full px-3 py-2.5 dark:bg-neutral-900 dark:border-slate-600 dark:text-white"
          required
          maxLength={20}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      {/* Terms & Conditions */}
      {errorResp != "" && (

        <div className="flex items-center mt-4">
          <label htmlFor="terms" className="ms-2 text-xs sm:text-sm text-red-600 dark:text-red-400">
            {errorResp}
          </label>
        </div>
      )}

      {/* Submit Button */}
      <button
        className="mt-8 cursor-pointer w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        onClick={LoginReq}
      >
        Sign In
      </button>
      <BorderBeam
        duration={4}
        size={200}
        className="from-transparent via-blue-500 to-transparent"
      />
    </div>
  );
}