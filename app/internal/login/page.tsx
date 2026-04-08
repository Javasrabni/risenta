"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";

export default function InternalLoginPage() {
  const router = useRouter();
  const [risentaID, setRisenttaID] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [errorResp, setErrorResp] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorResp("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risentaID, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorResp(data.message);
        setIsLoading(false);
        return;
      }

      // Check if user is internal admin
      if (!data.isInternalAdmin) {
        setErrorResp("Akses ditolak. Anda bukan admin internal.");
        setIsLoading(false);
        return;
      }

      // Redirect to admin dashboard
      router.push("/adm");
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorResp("Gagal terhubung ke server.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md mx-4">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Internal Admin
          </h1>
          <p className="text-slate-400">
            Risentta Internal Administration
          </p>
        </div>

        {/* Login Card */}
        <div className="relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 overflow-hidden">
          <BorderBeam
            duration={4}
            size={300}
            className="from-transparent via-blue-500/50 to-transparent"
          />

          <form onSubmit={handleLogin} className="relative z-10 space-y-6">
            {/* Risentta ID Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Risentta ID
                </span>
              </label>
              <input
                type="text"
                value={risentaID}
                onChange={(e) => setRisenttaID(e.target.value)}
                placeholder="Masukkan Risentta ID"
                required
                maxLength={20}
                className="w-full bg-slate-800/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Token Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Token
                </span>
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Masukkan Token"
                required
                maxLength={20}
                className="w-full bg-slate-800/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Error Message */}
            {errorResp && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm text-center">{errorResp}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Internal access only. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
