"use client";

import React, { useState, useRef, useEffect } from "react";

export default function Login() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({ code: "+1", name: "USA" });
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

  const countries = [
    { id: "us", name: "United States", code: "+1" },
    { id: "au", name: "Australia", code: "+61" },
    { id: "uk", name: "United Kingdom", code: "+44" },
    { id: "fr", name: "France", code: "+33" },
    { id: "ca", name: "Canada", code: "+1" },
  ];

  return (
    <form className="min-w-sm max-w-sm w-full mx-auto p-6 bg-white dark:bg-neutral-900 rounded-xl font-[inter]">
      <div className="flex items-center -space-x-px rounded-lg relative" ref={dropdownRef}>
        
        {/* Phone Input */}
        <div className="relative w-full">
          <input
            type="tel"
            id="phone-input"
            className="w-full z-20 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
            placeholder="Risenta Id"
            required
            maxLength={20}
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
          className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          required
          maxLength={20}
        />
      </div>

      {/* Terms & Conditions */}
      {/* <div className="flex items-center mt-4 mb-4">
        <input
          id="terms"
          type="checkbox"
          className="w-4 h-4 border border-slate-300 rounded bg-slate-50 focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
          required
        />
        <label htmlFor="terms" className="ms-2 text-sm text-slate-600 dark:text-slate-400">
          I accept the <a className="font-medium text-blue-600 hover:underline dark:text-blue-500" href="#">Terms and Conditions</a>
        </label>
      </div> */}

      {/* Submit Button */}
      <button
        type="submit"
        className="mt-8 cursor-pointer w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Sign In
      </button>
    </form>
  );
}